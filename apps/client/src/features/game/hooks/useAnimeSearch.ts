import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  GAME_CONFIG,
  getFuzzySuggestions,
  normalizePrecision,
  type AnimeSuggestion,
  type FuzzyAnimeCandidate,
  type Precision,
} from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import {
  buildCataloguePrefixIndex,
  getCatalogueFranchiseCounts,
  narrowCatalogueByPrefix,
  resetCataloguePrefixIndexCache,
} from '@/features/game/hooks/animeSearchIndex';

const RETRY_INTERVAL_MS = 2_500;
const DEBOUNCE_TYPING_MS = 35;
const DEBOUNCE_DELETING_MS = 200;
const SEARCH_TIMEOUT_MS = 4_000;
const LOCAL_CONFIDENT_SCORE = 85;

interface UseAnimeSearchArgs {
  query: string;
  precision?: Precision;
  enabled?: boolean;
}

interface UseAnimeSearchResult {
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

export function resetAnimeSearchCache(): void {
  cachedCatalogue = null;
  inflightCatalogue = null;
  resetCataloguePrefixIndexCache();
}

if (!isUsableCatalogue(cachedCatalogue)) cachedCatalogue = null;

function loadCatalogue(): Promise<FuzzyAnimeCandidate[]> {
  if (isUsableCatalogue(cachedCatalogue)) return Promise.resolve(cachedCatalogue);
  if (inflightCatalogue) return inflightCatalogue;

  inflightCatalogue = new Promise((resolve) => {
    let settled = false;
    const retry = setInterval(() => {
      if (socket.connected) socket.emit('anime:get_all');
    }, RETRY_INTERVAL_MS);

    const onAll = (payload: { animes: FuzzyAnimeCandidate[] }) => {
      const list = payload?.animes ?? [];
      if (!list.length) return;
      if (settled) return;
      settled = true;
      clearInterval(retry);
      socket.off('anime:all_names', onAll);
      cachedCatalogue = list;
      inflightCatalogue = null;
      resolve(list);
    };

    socket.on('anime:all_names', onAll);
    if (socket.connected) socket.emit('anime:get_all');
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

function runLocalSearch(
  catalogue: FuzzyAnimeCandidate[],
  query: string,
  precision: Precision,
): AnimeSuggestion[] {
  const prefixIndex = buildCataloguePrefixIndex(catalogue);
  const franchiseCounts =
    precision === 'franchise' ? getCatalogueFranchiseCounts(catalogue) : undefined;
  const scoped = narrowCatalogueByPrefix(catalogue, prefixIndex, query);
  let next = getFuzzySuggestions(scoped, query, precision, franchiseCounts);
  const bestScopedScore = next[0]?.score ?? 0;
  if (
    (next.length === 0 || bestScopedScore < LOCAL_CONFIDENT_SCORE) &&
    scoped.length < catalogue.length
  ) {
    next = getFuzzySuggestions(catalogue, query, precision, franchiseCounts);
  }
  return next;
}

/**
 * Hybrid autocomplete: instant local fuzzy when the catalogue is cached, with a
 * server `anime:search` fallback until warm-up completes or local results are empty.
 */
export function useAnimeSearch({
  query,
  precision = 'franchise',
  enabled = true,
}: UseAnimeSearchArgs): UseAnimeSearchResult {
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
  const minLen = GAME_CONFIG.FUZZY.SUGGESTION_MIN_QUERY_LENGTH;
  const debouncedTrimmed = useAdaptiveDebouncedValue(trimmed);
  const normalizedPrecision = normalizePrecision(precision);
  const queryReady = debouncedTrimmed.length >= minLen;

  queryRef.current = query;

  const clearPendingTimeout = () => {
    if (pendingTimeoutRef.current != null) {
      window.clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (isUsableCatalogue(catalogue)) return;
    let active = true;
    loadCatalogue().then((list) => {
      if (active && isUsableCatalogue(list)) setCatalogue(list);
    });
    return () => {
      active = false;
    };
  }, [catalogue]);

  useEffect(() => {
    const warm = () => {
      if (isUsableCatalogue(cachedCatalogue)) {
        setCatalogue(cachedCatalogue);
        return;
      }
      loadCatalogue().then((list) => {
        if (isUsableCatalogue(list)) setCatalogue(list);
      });
    };
    socket.on('connect', warm);
    if (socket.connected) warm();
    return () => {
      socket.off('connect', warm);
    };
  }, []);

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
    socket.on('anime:search_results', onResults);
    return () => {
      socket.off('anime:search_results', onResults);
    };
  }, []);

  useEffect(() => {
    if (trimmed.length < minLen) setSuggestions([]);
  }, [trimmed, minLen]);

  useEffect(() => {
    clearPendingTimeout();

    if (!enabled || !queryReady) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const frame = window.requestAnimationFrame(() => {
      if (isUsableCatalogue(catalogue)) {
        const local = runLocalSearch(catalogue, debouncedTrimmed, normalizedPrecision);
        const bestLocalScore = local[0]?.score ?? 0;
        if (local.length > 0) {
          startTransition(() => {
            setSuggestions(local);
            if (bestLocalScore >= LOCAL_CONFIDENT_SCORE) setIsSearching(false);
          });
          if (bestLocalScore >= LOCAL_CONFIDENT_SCORE) return;
        }
      }

      if (!socket.connected) {
        setIsSearching(false);
        return;
      }

      const requestId = (requestIdRef.current += 1);
      sentQueryByRequestIdRef.current.set(requestId, debouncedTrimmed);
      socket.emit('anime:search', {
        requestId,
        query: debouncedTrimmed,
        precision: normalizedPrecision,
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
  }, [enabled, queryReady, catalogue, debouncedTrimmed, normalizedPrecision]);

  const isDebouncing = enabled && trimmed.length >= minLen && debouncedTrimmed !== trimmed;

  return {
    suggestions,
    isSearching: enabled && trimmed.length >= minLen && (isSearching || isDebouncing),
  };
}
