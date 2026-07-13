import { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG, normalizePrecision, type AnimeSuggestion, type Precision } from '@aniquizz/shared';
import { socket } from '@/lib/socket';

const DEBOUNCE_MS = 80;
/** Clear loading if the server never answers (rate limit drop, network blip). */
const SEARCH_TIMEOUT_MS = 4_000;

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
  const pendingTimeoutRef = useRef<number | null>(null);
  /** Query string sent with each requestId — drops stale socket replies after submit/clear. */
  const sentQueryByRequestIdRef = useRef<Map<number, string>>(new Map());

  const clearPendingTimeout = () => {
    if (pendingTimeoutRef.current != null) {
      window.clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
  };

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
      clearPendingTimeout();
      setSuggestions(payload.results);
      setIsSearching(false);
    };
    socket.on('anime:search_results', onResults);
    return () => {
      socket.off('anime:search_results', onResults);
    };
  }, []);

  useEffect(() => {
    clearPendingTimeout();

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

    // Show the dropdown immediately; one debounced emit per query revision.
    setIsSearching(true);

    const handle = window.setTimeout(() => {
      const requestId = (requestIdRef.current += 1);
      sentQueryByRequestIdRef.current.set(requestId, trimmed);
      socket.emit('anime:search', { requestId, query: trimmed, precision: normalizePrecision(precision) });

      pendingTimeoutRef.current = window.setTimeout(() => {
        if (queryRef.current.trim() !== trimmed) return;
        setIsSearching(false);
      }, SEARCH_TIMEOUT_MS);
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
    };
  }, [query, precision, enabled]);

  useEffect(() => clearPendingTimeout, []);

  return { suggestions, isSearching };
}
