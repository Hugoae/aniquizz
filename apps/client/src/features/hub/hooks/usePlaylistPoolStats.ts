import { useEffect, useRef, useState } from 'react';
import type { PlaylistPoolStats } from '@aniquizz/shared';
import { hasPlaylistSource } from '@aniquizz/shared';
import { socket } from '@/lib/socket';

export const PLAYLIST_POOL_STATS_DEBOUNCE_MS = 250;

export interface PlaylistPoolStatsRequest {
  playlistId?: string | null;
  decadePlaylistId?: string | null;
  roomId?: string;
  soundCount?: number;
  difficulty?: string[];
  types?: string[];
  playlistWatched?: boolean;
  watchedMode?: 'union' | 'intersection';
  precision?: string;
  allowFallback?: boolean;
  enabled?: boolean;
  refreshKey?: string | number;
}

export function usePlaylistPoolStats(request: PlaylistPoolStatsRequest) {
  const [stats, setStats] = useState<PlaylistPoolStats | null>(null);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);
  const soundCountRef = useRef(request.soundCount);
  soundCountRef.current = request.soundCount;

  const {
    playlistId,
    decadePlaylistId,
    roomId,
    difficulty,
    types,
    playlistWatched,
    watchedMode,
    precision,
    allowFallback,
    enabled = true,
    refreshKey,
  } = request;

  const difficultyKey = difficulty?.join(',') ?? null;
  const typesKey = types?.join(',') ?? null;

  useEffect(() => {
    if (!enabled || !hasPlaylistSource({ playlistId, decadePlaylistId })) {
      setStats(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestSeq.current;
    const onStats = (payload: PlaylistPoolStats) => {
      if (payload.requestId != null && payload.requestId !== requestId) return;
      const samePrimary = payload.playlistId === (playlistId ?? decadePlaylistId);
      const sameDecade = (payload.decadePlaylistId ?? '') === (decadePlaylistId ?? '');
      if (!samePrimary || !sameDecade) return;
      setStats(payload);
      setLoading(false);
    };
    socket.on('playlist:pool_stats', onStats);
    const timeout = window.setTimeout(() => {
      setLoading(true);
      socket.emit('playlist:get_pool_stats', {
        requestId,
        playlistId: playlistId ?? null,
        decadePlaylistId: decadePlaylistId ?? null,
        roomId,
        soundCount: soundCountRef.current,
        difficulty:
          difficultyKey === null ? undefined : difficultyKey ? difficultyKey.split(',') : [],
        types: typesKey === null ? undefined : typesKey ? typesKey.split(',') : [],
        playlistWatched,
        watchedMode,
        precision,
        allowFallback,
      });
    }, PLAYLIST_POOL_STATS_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeout);
      socket.off('playlist:pool_stats', onStats);
    };
  }, [
    playlistId,
    decadePlaylistId,
    roomId,
    enabled,
    difficultyKey,
    typesKey,
    playlistWatched,
    watchedMode,
    precision,
    allowFallback,
    refreshKey,
  ]);

  return { stats, loading };
}
