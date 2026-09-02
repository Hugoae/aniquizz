import { useCallback, useEffect, useRef, useState } from 'react';
import type { SuggestionSongOption, SuggestionSongOptionsResponse } from '@aniquizz/shared';
import { SUGGESTION_SONG_OPTIONS_PAGE_SIZE } from '@aniquizz/shared';
import { suggestionsApi, SuggestionsApiError } from '@/lib/suggestionsApi';
import { isAbortError } from '@/lib/abortError';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

interface UseSuggestionSongSearchResult {
  query: string;
  setQuery: (value: string) => void;
  songs: SuggestionSongOption[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  reset: () => void;
}

export function useSuggestionSongSearch(enabled: boolean): UseSuggestionSongSearchResult {
  const [query, setQuery] = useState('');
  const [committedQuery, setCommittedQuery] = useState('');
  const [songs, setSongs] = useState<SuggestionSongOption[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setCommittedQuery(query.trim());
      setPage(1);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!enabled || committedQuery.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      setSongs([]);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    const append = page > 1;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    void suggestionsApi
      .songOptions(
        { q: committedQuery, page, pageSize: SUGGESTION_SONG_OPTIONS_PAGE_SIZE },
        { signal: controller.signal },
      )
      .then((result: SuggestionSongOptionsResponse) => {
        if (requestId !== requestIdRef.current) return;
        setSongs((current) => (append ? [...current, ...result.songs] : result.songs));
        setHasMore(result.pagination.page < result.pagination.totalPages);
      })
      .catch((caught) => {
        if (isAbortError(caught) || requestId !== requestIdRef.current) return;
        if (!append) setSongs([]);
        setHasMore(false);
        setError(caught instanceof SuggestionsApiError ? caught.message : 'search-failed');
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
        setLoadingMore(false);
      });

    return () => controller.abort();
  }, [committedQuery, enabled, page]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    setPage((current) => current + 1);
  }, [hasMore, loading, loadingMore]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    requestIdRef.current += 1;
    setQuery('');
    setCommittedQuery('');
    setSongs([]);
    setPage(1);
    setHasMore(false);
    setLoading(false);
    setLoadingMore(false);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    songs,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    reset,
  };
}
