import type { ThematicPlaylistSummary } from '@aniquizz/shared';
import { serverApiBase } from './env';

const API_BASE = serverApiBase();
const PUBLISHED_TTL_MS = 60_000;

let publishedCache: { at: number; playlists: ThematicPlaylistSummary[] } | null = null;

export const resetPublishedPlaylistsCache = (): void => {
  publishedCache = null;
};

export class PlaylistApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const playlistApi = {
  listPublished: async (opts?: { force?: boolean }): Promise<ThematicPlaylistSummary[]> => {
    const now = Date.now();
    if (!opts?.force && publishedCache && now - publishedCache.at < PUBLISHED_TTL_MS) {
      return publishedCache.playlists;
    }
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/playlists`, { cache: 'no-store' });
    } catch {
      throw new PlaylistApiError(0, 'offline');
    }
    if (!res.ok) {
      throw new PlaylistApiError(res.status, 'Impossible de charger les playlists.');
    }
    const body = (await res.json()) as { playlists: ThematicPlaylistSummary[] };
    const playlists = body.playlists ?? [];
    publishedCache = { at: now, playlists };
    return playlists;
  },
};
