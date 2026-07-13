import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  GAME_CONFIG,
  buildFranchiseCountsMap,
  getFuzzySuggestions,
  normalizePrecision,
  type AnimeSuggestion,
  type FuzzyAnimeCandidate,
  type Precision,
} from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { buildCataloguePrefixIndex, narrowCatalogueByPrefix } from '@/features/game/hooks/animeSearchIndex';

/** Re-emit the bulk request until the list arrives (covers reconnects / dropped emits). */
const RETRY_INTERVAL_MS = 2_500;
const DEBOUNCE_TYPING_MS = 80;
const DEBOUNCE_DELETING_MS = 200;

interface UseAnimeSearchArgs {
  query: string;
  precision?: Precision;
  enabled?: boolean;
}

interface UseAnimeSearchResult {
  suggestions: AnimeSuggestion[];
  /** True while catalogue loads or debounced query is catching up. */
  isSearching: boolean;
}

let cachedCatalogue: FuzzyAnimeCandidate[] | null = null;
let inflight: Promise<FuzzyAnimeCandidate[]> | null = null;

function loadCatalogue(): Promise<FuzzyAnimeCandidate[]> {
  if (cachedCatalogue) return Promise.resolve(cachedCatalogue);
  if (inflight) return inflight;

  inflight = new Promise((resolve) => {
    let settled = false;
    const retry = setInterval(() => socket.emit('anime:get_all'), RETRY_INTERVAL_MS);

    const onAll = (payload: { animes: FuzzyAnimeCandidate[] }) => {
      if (settled) return;
      settled = true;
      clearInterval(retry);
      socket.off('anime:all_names', onAll);
      cachedCatalogue = payload?.animes ?? [];
      inflight = null;
      resolve(cachedCatalogue);
    };

    socket.on('anime:all_names', onAll);
    socket.emit('anime:get_all');
  });

  return inflight;
}

/** Longer debounce while backspacing — avoids re-scanning on every delete tick. */
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

export function useAnimeSearch({
  query,
  precision = 'franchise',
  enabled = true,
}: UseAnimeSearchArgs): UseAnimeSearchResult {
  const [catalogue, setCatalogue] = useState<FuzzyAnimeCandidate[] | null>(cachedCatalogue);
  const [suggestions, setSuggestions] = useState<AnimeSuggestion[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (catalogue) return;
    let active = true;
    loadCatalogue().then((list) => {
      if (active) setCatalogue(list);
    });
    return () => {
      active = false;
    };
  }, [catalogue]);

  const trimmed = query.trim();
  const minLen = GAME_CONFIG.FUZZY.SUGGESTION_MIN_QUERY_LENGTH;
  const debouncedTrimmed = useAdaptiveDebouncedValue(trimmed);
  const normalizedPrecision = normalizePrecision(precision);
  const queryReady = debouncedTrimmed.length >= minLen;

  const prefixIndex = useMemo(
    () => (catalogue ? buildCataloguePrefixIndex(catalogue) : null),
    [catalogue],
  );

  const franchiseCounts = useMemo(() => {
    if (!catalogue || normalizedPrecision !== 'franchise') return undefined;
    return buildFranchiseCountsMap(catalogue);
  }, [catalogue, normalizedPrecision]);

  // Drop suggestions immediately when the live query is too short (backspace path).
  useEffect(() => {
    if (trimmed.length < minLen) setSuggestions([]);
  }, [trimmed, minLen]);

  useEffect(() => {
    if (!enabled || !queryReady || !catalogue || !prefixIndex) return;

    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      const scoped = narrowCatalogueByPrefix(catalogue, prefixIndex, debouncedTrimmed);
      let next = getFuzzySuggestions(
        scoped,
        debouncedTrimmed,
        normalizedPrecision,
        franchiseCounts,
      );
      // Prefix bucket can miss mid-title / alternate-word matches — fall back to full scan.
      if (next.length === 0 && scoped.length < catalogue.length) {
        next = getFuzzySuggestions(
          catalogue,
          debouncedTrimmed,
          normalizedPrecision,
          franchiseCounts,
        );
      }
      if (cancelled) return;
      startTransition(() => setSuggestions(next));
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [enabled, queryReady, catalogue, prefixIndex, debouncedTrimmed, normalizedPrecision, franchiseCounts]);

  const isSearching =
    enabled &&
    trimmed.length >= minLen &&
    (!catalogue || debouncedTrimmed !== trimmed);

  return { suggestions, isSearching };
}
