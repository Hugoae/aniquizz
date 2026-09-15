import { useEffect, useState } from 'react';
import type { WatchedPoolStats } from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { subscribeWhenSocketReady } from '@/lib/socketReady';

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
  const difficultyKey = difficulty?.join(',') ?? null;
  const typesKey = types?.join(',') ?? null;

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
        difficulty:
          difficultyKey === null ? undefined : difficultyKey ? difficultyKey.split(',') : [],
        types: typesKey === null ? undefined : typesKey ? typesKey.split(',') : [],
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

    const onListChanged = () => {
      setLoading(true);
      if (socket.connected) emit();
    };

    socket.on('watched:pool_stats', onStats);
    socket.on('watched:list_changed', onListChanged);
    socket.on('connect_error', markOffline);

    const stopReady = subscribeWhenSocketReady(socket, () => {
      setOffline(false);
      emit();
    });

    if (!socket.connected && !socket.active) {
      markOffline();
    }

    const timeout = window.setTimeout(() => {
      if (!socket.connected && !socket.active) markOffline();
    }, OFFLINE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeout);
      stopReady();
      socket.off('watched:pool_stats', onStats);
      socket.off('watched:list_changed', onListChanged);
      socket.off('connect_error', markOffline);
    };
  }, [roomId, soundCount, enabled, difficultyKey, typesKey, watchedMode, precision, refreshKey]);

  return { stats, loading, offline };
}
