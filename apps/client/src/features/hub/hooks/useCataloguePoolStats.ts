import { useEffect, useRef, useState } from 'react';
import type { CataloguePoolStats } from '@aniquizz/shared';
import { socket } from '@/lib/socket';

export interface CataloguePoolStatsRequest {
  soundCount?: number;
  difficulty?: string[];
  types?: string[];
  enabled?: boolean;
}

/** Fetches random-source catalogue counts (OP/ED + difficulty cascade). */
export function useCataloguePoolStats(request: CataloguePoolStatsRequest) {
  const [stats, setStats] = useState<CataloguePoolStats | null>(null);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);

  const { soundCount, difficulty, types, enabled = true } = request;

  useEffect(() => {
    if (!enabled) {
      setStats(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestSeq.current;
    setLoading(true);
    const onStats = (payload: CataloguePoolStats) => {
      if (payload.requestId != null && payload.requestId !== requestId) return;
      setStats(payload);
      setLoading(false);
    };
    socket.on('catalogue:pool_stats', onStats);
    socket.emit('catalogue:get_pool_stats', {
      soundCount,
      difficulty,
      types,
      requestId,
    });
    return () => {
      socket.off('catalogue:pool_stats', onStats);
    };
  }, [enabled, soundCount, difficulty?.join(','), types?.join(',')]);

  return { stats, loading };
}
