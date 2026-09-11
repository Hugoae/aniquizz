import { useCallback, useEffect, useState } from 'react';
import type { ThematicPlaylistSummary } from '@aniquizz/shared';
import { PlaylistApiError, playlistApi } from '@/lib/playlistApi';

export function usePublishedPlaylists(enabled = true) {
  const [playlists, setPlaylists] = useState<ThematicPlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<'load' | 'offline' | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    void playlistApi
      .listPublished({ force: retryToken > 0 })
      .then((rows) => {
        if (!cancelled) {
          setPlaylists(rows);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const offline = err instanceof PlaylistApiError && err.status === 0;
        setError(offline ? 'offline' : 'load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, retryToken]);

  return { playlists, loading, error, retry };
}
