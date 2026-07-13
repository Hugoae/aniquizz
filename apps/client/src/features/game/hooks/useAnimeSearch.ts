import { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG, normalizePrecision, type AnimeSuggestion, type Precision } from '@aniquizz/shared';
import { socket } from '@/lib/socket';

/** Trailing debounce for rapid keystrokes after the leading-edge emit. */
const DEBOUNCE_MS = 50;

interface UseAnimeSearchArgs {
  query: string;
  precision?: Precision;
  enabled?: boolean;
}

interface UseAnimeSearchResult {
  suggestions: AnimeSuggestion[];
  /** True while a search request is in flight for the current query. */
  isSearching: boolean;
}

/**
 * Server-side anime autocomplete for the in-game typing bar.
 *
 * Replaces shipping the whole catalogue to the client: the server runs the
 * fuzzy match over its cached name list and returns only the ranked matches.
 * A monotonic `requestId` drops out-of-order / stale responses so the dropdown
 * always reflects the latest keystroke.
 */
export function useAnimeSearch({
  query,
  precision = 'franchise',
  enabled = true,
}: UseAnimeSearchArgs): UseAnimeSearchResult {
  const [suggestions, setSuggestions] = useState<AnimeSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const requestIdRef = useRef(0);
  const appliedRequestIdRef = useRef(0);
  const queryRef = useRef(query);
  /** Query string sent with each requestId — drops stale socket replies after submit/clear. */
  const sentQueryByRequestIdRef = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    const onResults = (payload: { requestId: number; results: AnimeSuggestion[] }) => {
      if (payload.requestId < appliedRequestIdRef.current) return;

      const sentQuery = sentQueryByRequestIdRef.current.get(payload.requestId);
      const currentQuery = queryRef.current.trim();
      // Ignore replies that no longer match the input (e.g. answer submitted, field cleared).
      if (sentQuery === undefined || sentQuery !== currentQuery) return;

      appliedRequestIdRef.current = payload.requestId;
      setSuggestions(payload.results);
      setIsSearching(false);
    };
    socket.on('anime:search_results', onResults);
    return () => {
      socket.off('anime:search_results', onResults);
    };
  }, []);

  // Warm the server-side name cache as soon as typing is allowed (no UI impact).
  useEffect(() => {
    if (!enabled) return;
    const requestId = (requestIdRef.current += 1);
    sentQueryByRequestIdRef.current.set(requestId, '__warm__');
    socket.emit('anime:search', {
      requestId,
      query: 'aa',
      precision: normalizePrecision(precision),
    });
  }, [enabled, precision]);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < GAME_CONFIG.FUZZY.SUGGESTION_MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const emitSearch = () => {
      const requestId = (requestIdRef.current += 1);
      sentQueryByRequestIdRef.current.set(requestId, trimmed);
      setIsSearching(true);
      socket.emit('anime:search', { requestId, query: trimmed, precision: normalizePrecision(precision) });
    };

    // Leading edge: first results without waiting for debounce.
    emitSearch();

    const handle = window.setTimeout(emitSearch, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [query, precision, enabled]);

  return { suggestions, isSearching };
}
