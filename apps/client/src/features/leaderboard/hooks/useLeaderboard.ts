import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LEADERBOARD_DEFAULT_PAGE_SIZE } from '@aniquizz/shared';
import type { LeaderboardMetric, LeaderboardResponse } from '@aniquizz/shared';
import { isAbortError } from '@/lib/abortError';
import { leaderboardApi, LeaderboardApiError } from '@/lib/leaderboardApi';
import { LEADERBOARD_COPY } from '@/features/leaderboard/copy/leaderboardCopy';
import {
  leaderboardSearchString,
  parseLeaderboardMetric,
} from '@/features/leaderboard/utils/leaderboardUrl';

export function useLeaderboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const metric = parseLeaderboardMetric(searchParams.get('metric'));
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const dataRef = useRef(data);
  dataRef.current = data;

  const replaceMetric = useCallback(
    (nextMetric: LeaderboardMetric) => {
      setSearchParams(new URLSearchParams(leaderboardSearchString(nextMetric)), { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setData((prev) => (prev?.metric === metric ? prev : null));
    if (dataRef.current?.metric === metric) {
      setRefreshing(true);
      setLoading(false);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    void leaderboardApi
      .browse({ metric, page: 1, pageSize: LEADERBOARD_DEFAULT_PAGE_SIZE }, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.metric !== metric) return;
        setData(result);
      })
      .catch((caught) => {
        if (isAbortError(caught) || controller.signal.aborted) return;
        setError(
          caught instanceof LeaderboardApiError ? caught.message : LEADERBOARD_COPY.loadError,
        );
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => controller.abort();
  }, [metric, retryCount]);

  const dataForMetric = data?.metric === metric ? data : null;
  const waiting = loading || refreshing;
  const switching = data != null && data.metric !== metric;

  return {
    metric,
    data: dataForMetric,
    loading: (!dataForMetric && waiting) || switching,
    refreshing: waiting && !!dataForMetric,
    error,
    setMetric: (next: LeaderboardMetric) => {
      if (next !== metric) replaceMetric(next);
    },
    retry: () => setRetryCount((count) => count + 1),
  };
}
