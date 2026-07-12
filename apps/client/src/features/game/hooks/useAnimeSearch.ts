import { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG, normalizePrecision, type AnimeSuggestion, type Precision } from '@aniquizz/shared';
import { socket } from '@/lib/socket';

const DEBOUNCE_MS = 120;

interface UseAnimeSearchArgs {
  query: string;
  precision?: Precision;
  enabled?: boolean;
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
}: UseAnimeSearchArgs): AnimeSuggestion[] {
  const [suggestions, setSuggestions] = useState<AnimeSuggestion[]>([]);
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
    };
    socket.on('anime:search_results', onResults);
    return () => {
      socket.off('anime:search_results', onResults);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < GAME_CONFIG.FUZZY.SUGGESTION_MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }

    const handle = window.setTimeout(() => {
      const requestId = (requestIdRef.current += 1);
      sentQueryByRequestIdRef.current.set(requestId, trimmed);
      socket.emit('anime:search', { requestId, query: trimmed, precision: normalizePrecision(precision) });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [query, precision, enabled]);

  return suggestions;
}
