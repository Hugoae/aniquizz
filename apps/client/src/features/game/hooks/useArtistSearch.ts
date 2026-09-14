import { useEffect, useRef, useState, useTransition } from 'react';
import {
  getFuzzySuggestions,
  prepareFuzzyCatalogue,
  suggestionQueryReady,
  type AnimeSuggestion,
  type FuzzyAnimeCandidate,
} from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import {
  buildCataloguePrefixIndex,
  narrowCatalogueByPrefix,
} from '@/features/game/hooks/animeSearchIndex';

const RETRY_INTERVAL_MS = 2_500;
const DEBOUNCE_TYPING_MS = 35;
const DEBOUNCE_DELETING_MS = 200;
const SEARCH_TIMEOUT_MS = 4_000;

interface UseArtistSearchArgs {
  query: string;
  enabled?: boolean;
}

interface UseArtistSearchResult {
  suggestions: AnimeSuggestion[];
  isSearching: boolean;
}

let cachedCatalogue: FuzzyAnimeCandidate[] | null = null;
let inflightCatalogue: Promise<FuzzyAnimeCandidate[]> | null = null;

function isUsableCatalogue(
  list: FuzzyAnimeCandidate[] | null | undefined,
): list is FuzzyAnimeCandidate[] {
  return !!list && list.length > 0;
}

export function resetArtistSearchCache(): void {
  cachedCatalogue = null;
  inflightCatalogue = null;
}

function loadArtistCatalogue(): Promise<FuzzyAnimeCandidate[]> {
  if (isUsableCatalogue(cachedCatalogue)) return Promise.resolve(cachedCatalogue);
  if (inflightCatalogue) return inflightCatalogue;

  inflightCatalogue = new Promise((resolve) => {
    let settled = false;
    const retry = setInterval(() => {
      if (socket.connected) socket.emit('artist:get_all');
    }, RETRY_INTERVAL_MS);

    const onAll = (payload: { artists: FuzzyAnimeCandidate[] }) => {
      const list = payload?.artists ?? [];
      if (!list.length) return;
      if (settled) return;
      settled = true;
      clearInterval(retry);
      socket.off('artist:all_names', onAll);
      const prepared = prepareFuzzyCatalogue(list);
      cachedCatalogue = prepared;
      inflightCatalogue = null;
      resolve(prepared);
    };

    socket.on('artist:all_names', onAll);
    if (socket.connected) socket.emit('artist:get_all');
  });

  return inflightCatalogue;
}

function useAdaptiveDebouncedValue(value: string): string {
  const [debounced, setDebounced] = useState(value);
  const previousRef = useRef(value);

  useEffect(() => {
    const shrinking = value.length < previousRef.current.length;
    previousRef.current = value;
    const delay = shrinking ? DEBOUNCE_DELETING_MS : DEBOUNCE_TYPING_MS;
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value]);

  return debounced;
}

function runLocalSearch(catalogue: FuzzyAnimeCandidate[], query: string): AnimeSuggestion[] {
  const prefixIndex = buildCataloguePrefixIndex(catalogue);
  const scoped = narrowCatalogueByPrefix(catalogue, prefixIndex, query);
  let next = getFuzzySuggestions(scoped, query, 'artist');
  if (next.length === 0 && scoped.length < catalogue.length) {
    next = getFuzzySuggestions(catalogue, query, 'artist');
  }
  return next;
}

/**
 * Artist-precision autocomplete. Same debounce/cache pattern as `useAnimeSearch`,
 * against a separate catalogue of billed artist/group units.
 */
export function useArtistSearch({
  query,
  enabled = true,
}: UseArtistSearchArgs): UseArtistSearchResult {
  const [catalogue, setCatalogue] = useState<FuzzyAnimeCandidate[] | null>(
    isUsableCatalogue(cachedCatalogue) ? cachedCatalogue : null,
  );
  const [suggestions, setSuggestions] = useState<AnimeSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [, startTransition] = useTransition();

  const requestIdRef = useRef(0);
  const appliedRequestIdRef = useRef(0);
  const queryRef = useRef(query);
  const pendingTimeoutRef = useRef<number | null>(null);
  const sentQueryByRequestIdRef = useRef<Map<number, string>>(new Map());

  const trimmed = query.trim();
  const queryReady = suggestionQueryReady(trimmed, 'artist');
  const debouncedTrimmed = useAdaptiveDebouncedValue(trimmed);

  queryRef.current = query;

  const clearPendingTimeout = () => {
    if (pendingTimeoutRef.current != null) {
      window.clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!enabled || isUsableCatalogue(catalogue)) return;
    let active = true;
    loadArtistCatalogue().then((list) => {
      if (active && isUsableCatalogue(list)) setCatalogue(list);
    });
    return () => {
      active = false;
    };
  }, [catalogue, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const warm = () => {
      if (isUsableCatalogue(cachedCatalogue)) {
        setCatalogue(cachedCatalogue);
        return;
      }
      loadArtistCatalogue().then((list) => {
        if (isUsableCatalogue(list)) setCatalogue(list);
      });
    };
    socket.on('connect', warm);
    if (socket.connected) warm();
    return () => {
      socket.off('connect', warm);
    };
  }, [enabled]);

  useEffect(() => {
    const onResults = (payload: { requestId: number; results: AnimeSuggestion[] }) => {
      if (payload.requestId < appliedRequestIdRef.current) return;
      const sentQuery = sentQueryByRequestIdRef.current.get(payload.requestId);
      const currentQuery = queryRef.current.trim();
      if (sentQuery === undefined || sentQuery !== currentQuery) return;

      appliedRequestIdRef.current = payload.requestId;
      clearPendingTimeout();
      startTransition(() => {
        setSuggestions(payload.results);
        setIsSearching(false);
      });
    };
    socket.on('artist:search_results', onResults);
    return () => {
      socket.off('artist:search_results', onResults);
    };
  }, []);

  useEffect(() => {
    if (!queryReady) setSuggestions([]);
  }, [queryReady]);

  useEffect(() => {
    clearPendingTimeout();

    if (!enabled || !suggestionQueryReady(debouncedTrimmed, 'artist')) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const frame = window.requestAnimationFrame(() => {
      if (isUsableCatalogue(catalogue)) {
        const local = runLocalSearch(catalogue, debouncedTrimmed);
        startTransition(() => {
          setSuggestions(local);
          setIsSearching(false);
        });
        return;
      }

      if (!socket.connected) {
        setIsSearching(false);
        return;
      }

      const requestId = (requestIdRef.current += 1);
      sentQueryByRequestIdRef.current.set(requestId, debouncedTrimmed);
      socket.emit('artist:search', {
        requestId,
        query: debouncedTrimmed,
      });

      pendingTimeoutRef.current = window.setTimeout(() => {
        if (queryRef.current.trim() !== debouncedTrimmed) return;
        setIsSearching(false);
      }, SEARCH_TIMEOUT_MS);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      clearPendingTimeout();
    };
  }, [enabled, catalogue, debouncedTrimmed]);

  const isDebouncing =
    enabled && queryReady && suggestionQueryReady(debouncedTrimmed, 'artist') && debouncedTrimmed !== trimmed;

  return {
    suggestions,
    isSearching: enabled && queryReady && (isSearching || isDebouncing),
  };
}
