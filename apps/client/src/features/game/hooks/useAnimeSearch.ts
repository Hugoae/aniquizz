import { useEffect, useMemo, useState } from 'react';
import {
  GAME_CONFIG,
  getFuzzySuggestions,
  normalizePrecision,
  type AnimeSuggestion,
  type FuzzyAnimeCandidate,
  type Precision,
} from '@aniquizz/shared';
import { socket } from '@/lib/socket';

/** Re-emit the bulk request until the list arrives (covers reconnects / dropped emits). */
const RETRY_INTERVAL_MS = 2_500;

interface UseAnimeSearchArgs {
  query: string;
  precision?: Precision;
  enabled?: boolean;
}

interface UseAnimeSearchResult {
  suggestions: AnimeSuggestion[];
  /** True only while the one-time catalogue fetch is still loading. */
  isSearching: boolean;
}

/**
 * In-game typing autocomplete.
 *
 * The full catalogue name list is fetched ONCE per session (`anime:get_all`)
 * and cached module-side, then the fuzzy match runs entirely on the client for
 * every keystroke — instant, no per-keystroke network round-trip. Falls back to
 * an empty result set until the (small, cached) list has loaded.
 */

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

export function useAnimeSearch({
  query,
  precision = 'franchise',
  enabled = true,
}: UseAnimeSearchArgs): UseAnimeSearchResult {
  const [catalogue, setCatalogue] = useState<FuzzyAnimeCandidate[] | null>(cachedCatalogue);

  // Warm the list on mount so it is ready before the first guessing phase.
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
  const queryReady = trimmed.length >= GAME_CONFIG.FUZZY.SUGGESTION_MIN_QUERY_LENGTH;

  const suggestions = useMemo(() => {
    if (!enabled || !queryReady || !catalogue) return [];
    return getFuzzySuggestions(catalogue, trimmed, normalizePrecision(precision));
  }, [enabled, queryReady, catalogue, trimmed, precision]);

  const isSearching = enabled && queryReady && !catalogue;

  return { suggestions, isSearching };
}
