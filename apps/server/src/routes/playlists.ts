import type { Application, Response } from 'express';
import { Prisma } from '@aniquizz/database';
import { listPublishedPlaylists, parsePlaylistRecipe } from '../modules/game/playlistRecipeService';
import type { AuthedRequest } from '../core/httpAuth';
import { clientIp, enforceHttpRateLimit, HTTP_RATE_LIMITS } from '../core/httpRateLimit';
import { logger } from '../utils/logger';
import { playlistChipsFromRecipe, type ThematicPlaylistSummary } from '@aniquizz/shared';

/** Browser / CDN cache: list is staff-published and changes rarely. */
export const PUBLISHED_PLAYLISTS_CACHE_CONTROL =
  'public, max-age=60, stale-while-revalidate=300';

const toSummary = (row: {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  recipe: Prisma.JsonValue;
  snapshotCount: number;
  snapshotAt: Date | null;
  sortOrder: number;
}): ThematicPlaylistSummary => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
  category: row.category as ThematicPlaylistSummary['category'],
  snapshotCount: row.snapshotCount,
  snapshotAt: row.snapshotAt?.toISOString() ?? null,
  sortOrder: row.sortOrder,
  chips: playlistChipsFromRecipe(parsePlaylistRecipe(row.recipe)),
});

export function registerPlaylistRoutes(app: Application): void {
  app.get('/playlists', async (req: AuthedRequest, res: Response) => {
    try {
      const allowed = await enforceHttpRateLimit(req, res, {
        scope: 'playlists:read',
        identity: clientIp(req),
        ...HTTP_RATE_LIMITS.publicRead,
      });
      if (!allowed) return;

      const rows = await listPublishedPlaylists();
      res.setHeader('Cache-Control', PUBLISHED_PLAYLISTS_CACHE_CONTROL);
      res.json({ playlists: rows.map(toSummary) });
    } catch (error) {
      logger.error('Failed to list published playlists', 'Playlist', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Impossible de charger les playlists.' });
      }
    }
  });
}
