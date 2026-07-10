import { useEffect, useState } from 'react';
import type { WatchedPoolStats } from '@aniquizz/shared';
import { socket } from '@/lib/socket';

export interface WatchedPoolStatsRequest {
  roomId?: string;
  soundCount?: number;
  difficulty?: string[];
  types?: string[];
  watchedMode?: 'union' | 'intersection';
  enabled?: boolean;
  /** Bump when lobby roster changes (join/leave/kick) to refetch pool stats. */
  refreshKey?: string | number;
}

/** Fetches resolved Watched pool stats from the server (solo list or lobby). */
export function useWatchedPoolStats(request: WatchedPoolStatsRequest) {
  const [stats, setStats] = useState<WatchedPoolStats | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    roomId,
    soundCount,
    difficulty,
    types,
    watchedMode,
    enabled = true,
    refreshKey,
  } = request;

  useEffect(() => {
    if (!enabled) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const onStats = (payload: WatchedPoolStats) => {
      setStats(payload);
      setLoading(false);
    };
    socket.on('watched:pool_stats', onStats);
    socket.emit('watched:get_pool_stats', {
      roomId,
      soundCount,
      difficulty,
      types,
      watchedMode,
    });
    return () => {
      socket.off('watched:pool_stats', onStats);
    };
  }, [roomId, soundCount, enabled, difficulty?.join(','), types?.join(','), watchedMode, refreshKey]);

  return { stats, loading };
}
