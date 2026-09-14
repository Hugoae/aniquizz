import { useEffect, useRef, useState } from 'react';
import type { CataloguePoolStats } from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { subscribeWhenSocketReady } from '@/lib/socketReady';

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
  const difficultyKey = difficulty?.join(',') ?? null;
  const typesKey = types?.join(',') ?? null;

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
    const stopReady = subscribeWhenSocketReady(socket, () => {
      socket.emit('catalogue:get_pool_stats', {
        soundCount,
        difficulty:
          difficultyKey === null ? undefined : difficultyKey ? difficultyKey.split(',') : [],
        types: typesKey === null ? undefined : typesKey ? typesKey.split(',') : [],
        requestId,
      });
    });
    return () => {
      stopReady();
      socket.off('catalogue:pool_stats', onStats);
    };
  }, [enabled, soundCount, difficultyKey, typesKey]);

  return { stats, loading };
}
