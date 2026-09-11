import { useEffect, useState } from 'react';
import type { WatchedPoolStats } from '@aniquizz/shared';
import { socket } from '@/lib/socket';

export interface WatchedPoolStatsRequest {
  roomId?: string;
  soundCount?: number;
  difficulty?: string[];
  types?: string[];
  watchedMode?: 'union' | 'intersection';
  precision?: string;
  enabled?: boolean;
  /** Bump when lobby roster changes (join/leave/kick) to refetch pool stats. */
  refreshKey?: string | number;
}

const OFFLINE_TIMEOUT_MS = 6_000;

/** Fetches resolved Watched pool stats from the server (solo list or lobby). */
export function useWatchedPoolStats(request: WatchedPoolStatsRequest) {
  const [stats, setStats] = useState<WatchedPoolStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);

  const {
    roomId,
    soundCount,
    difficulty,
    types,
    watchedMode,
    precision,
    enabled = true,
    refreshKey,
  } = request;

  useEffect(() => {
    if (!enabled) {
      setStats(null);
      setLoading(false);
      setOffline(false);
      return;
    }

    setLoading(true);
    setOffline(false);

    const emit = () => {
      socket.emit('watched:get_pool_stats', {
        roomId,
        soundCount,
        difficulty,
        types,
        watchedMode,
        precision,
      });
    };

    const onStats = (payload: WatchedPoolStats) => {
      setStats(payload);
      setLoading(false);
      setOffline(false);
    };

    const markOffline = () => {
      setLoading(false);
      setOffline(true);
    };

    const onConnect = () => {
      setOffline(false);
      setLoading(true);
      emit();
    };

    socket.on('watched:pool_stats', onStats);
    socket.on('connect', onConnect);
    socket.on('connect_error', markOffline);

    if (socket.connected) {
      emit();
    } else if (!socket.active) {
      markOffline();
    }

    const timeout = window.setTimeout(() => {
      if (!socket.connected) markOffline();
    }, OFFLINE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeout);
      socket.off('watched:pool_stats', onStats);
      socket.off('connect', onConnect);
      socket.off('connect_error', markOffline);
    };
  }, [roomId, soundCount, enabled, difficulty?.join(','), types?.join(','), watchedMode, precision, refreshKey]);

  return { stats, loading, offline };
}
