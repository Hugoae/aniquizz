import type { Application, Response } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../core/httpAuth';
import { optionalAuth, requireRole } from '../core/httpAuth';
import {
  clientIp,
  enforceHttpRateLimit,
  HTTP_RATE_LIMITS,
} from '../core/httpRateLimit';
import { logger } from '../utils/logger';
import { browseLibraryAnimes, browseLibrarySongs, getLibrarySongById } from '../modules/catalogue/libraryBrowse';
import { browseLibraryTree } from '../modules/catalogue/libraryTree';
import { getLibraryMeta } from '../modules/catalogue/libraryMeta';
import {
  browseUserFavoriteSongs,
  UserFavoritesError,
} from '../modules/catalogue/libraryFavorites';
import {
  SongLikeError,
  getLikedSongIds,
  getPinnedSongIds,
  likeSong,
  setPinnedSongs,
  unlikeSong,
} from '../modules/catalogue/songLikeService';

const SONG_TYPES = ['OP', 'ED', 'INSERT'] as const;
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
const SORTS = [
  'franchise',
  'franchise_desc',
  'popularity',
  'anime',
  'title',
  'likes',
  'liked_recent',
] as const;
const DISCOVERED = ['heard', 'unheard'] as const;
const LIKED = ['liked', 'unliked'] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const favoritesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(24).optional(),
});

const pinnedSongsBodySchema = z.object({
  songIds: z.array(z.number().int().positive()).max(5),
});

const browseQuerySchema = z.object({
  q: z.string().max(120).optional(),
  songType: z
    .string()
    .optional()
    .transform((raw) => {
      if (!raw?.trim()) return undefined;
      const parts = raw.split(',').map((s) => s.trim().toUpperCase());
      const valid = parts.filter((p): p is (typeof SONG_TYPES)[number] =>
        (SONG_TYPES as readonly string[]).includes(p),
      );
      return valid.length ? valid : undefined;
    }),
  difficulty: z
    .string()
    .optional()
    .transform((raw) => {
      if (!raw?.trim()) return undefined;
      const parts = raw.split(',').map((s) => s.trim().toUpperCase());
      const valid = parts.filter((p): p is (typeof DIFFICULTIES)[number] =>
        (DIFFICULTIES as readonly string[]).includes(p),
      );
      return valid.length ? valid : undefined;
    }),
  discovered: z.enum(DISCOVERED).optional(),
  liked: z.enum(LIKED).optional(),
  franchiseId: z.coerce.number().int().positive().optional(),
  animeId: z.coerce.number().int().positive().optional(),
  sort: z.enum(SORTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(48).optional(),
});

const rateLimitPublic = (req: AuthedRequest, res: Response): Promise<boolean> =>
  enforceHttpRateLimit(req, res, {
    scope: 'library:read',
    identity: clientIp(req),
    ...HTTP_RATE_LIMITS.publicRead,
  });

const rateLimitLikeMutation = (
  req: AuthedRequest,
  res: Response,
  userId: string,
): Promise<boolean> =>
  enforceHttpRateLimit(req, res, {
    scope: 'library:like',
    identity: userId,
    ...HTTP_RATE_LIMITS.userMutation,
  });

const wrap =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: AuthedRequest, res: Response): void => {
    fn(req, res).catch((e) => {
      logger.error('Library route failed', 'Library', e);
      if (!res.headersSent) res.status(500).json({ error: 'Impossible de charger la librairie.' });
    });
  };

const parseSongIdParam = (raw: string | string[]): number | null => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const songId = Number(value);
  if (!Number.isInteger(songId) || songId <= 0) return null;
  return songId;
};

const handleSongLikeError = (res: Response, e: unknown): boolean => {
  if (!(e instanceof SongLikeError)) return false;
  const status =
    e.code === 'INVALID_SONG' || e.code === 'NOT_FOUND' ? 404 : e.code === 'BOT' ? 403 : 400;
  res.status(status).json({ error: e.message });
  return true;
};

const parseProfileIdParam = (raw: string | string[]): string | null => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value?.trim() || !UUID_RE.test(value.trim())) return null;
  return value.trim();
};

const handleUserFavoritesError = (res: Response, e: unknown): boolean => {
  if (!(e instanceof UserFavoritesError)) return false;
  const status = e.code === 'NOT_FOUND' ? 404 : 400;
  res.status(status).json({ error: e.message });
  return true;
};

export function registerLibraryRoutes(app: Application): void {
  app.get(
    '/library/meta',
    optionalAuth,
    wrap(async (req, res) => {
      if (!(await rateLimitPublic(req, res))) return;
      res.json(await getLibraryMeta(req.actor?.userId ?? null));
    }),
  );

  app.get(
    '/library/likes/ids',
    requireRole('USER'),
    wrap(async (req, res) => {
      if (!req.actor) {
        res.status(401).json({ error: 'Missing bearer token.' });
        return;
      }
      res.json(await getLikedSongIds(req.actor.userId));
    }),
  );

  app.get(
    '/library/likes/pinned',
    requireRole('USER'),
    wrap(async (req, res) => {
      if (!req.actor) {
        res.status(401).json({ error: 'Missing bearer token.' });
        return;
      }
      res.json(await getPinnedSongIds(req.actor.userId));
    }),
  );

  app.put(
    '/library/likes/pinned',
    requireRole('USER'),
    wrap(async (req, res) => {
      if (!req.actor) {
        res.status(401).json({ error: 'Missing bearer token.' });
        return;
      }
      if (!(await rateLimitLikeMutation(req, res, req.actor.userId))) return;

      const parsed = pinnedSongsBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Liste de favoris invalide (5 maximum).' });
        return;
      }

      try {
        res.json(await setPinnedSongs(req.actor.userId, parsed.data.songIds));
      } catch (e) {
        if (handleSongLikeError(res, e)) return;
        throw e;
      }
    }),
  );

  app.put(
    '/library/songs/:id/like',
    requireRole('USER'),
    wrap(async (req, res) => {
      if (!req.actor) {
        res.status(401).json({ error: 'Missing bearer token.' });
        return;
      }
      if (!(await rateLimitLikeMutation(req, res, req.actor.userId))) return;

      const songId = parseSongIdParam(req.params.id);
      if (!songId) {
        res.status(400).json({ error: 'Identifiant de son invalide.' });
        return;
      }

      try {
        res.json(await likeSong(req.actor.userId, songId));
      } catch (e) {
        if (handleSongLikeError(res, e)) return;
        throw e;
      }
    }),
  );

  app.delete(
    '/library/songs/:id/like',
    requireRole('USER'),
    wrap(async (req, res) => {
      if (!req.actor) {
        res.status(401).json({ error: 'Missing bearer token.' });
        return;
      }
      if (!(await rateLimitLikeMutation(req, res, req.actor.userId))) return;

      const songId = parseSongIdParam(req.params.id);
      if (!songId) {
        res.status(400).json({ error: 'Identifiant de son invalide.' });
        return;
      }

      try {
        res.json(await unlikeSong(req.actor.userId, songId));
      } catch (e) {
        if (handleSongLikeError(res, e)) return;
        throw e;
      }
    }),
  );

  app.get(
    '/library/song/:id',
    optionalAuth,
    wrap(async (req, res) => {
      if (!(await rateLimitPublic(req, res))) return;

      const songId = parseSongIdParam(req.params.id);
      if (!songId) {
        res.status(400).json({ error: 'Identifiant de son invalide.' });
        return;
      }

      const song = await getLibrarySongById(songId, req.actor?.userId ?? null);
      if (!song) {
        res.status(404).json({ error: 'Son introuvable.' });
        return;
      }
      res.json(song);
    }),
  );

  app.get(
    '/library/users/:userId/favorites',
    optionalAuth,
    wrap(async (req, res) => {
      if (!(await rateLimitPublic(req, res))) return;

      const profileId = parseProfileIdParam(req.params.userId);
      if (!profileId) {
        res.status(400).json({ error: 'Identifiant utilisateur invalide.' });
        return;
      }

      const parsed = favoritesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Paramètres de pagination invalides.' });
        return;
      }

      try {
        const payload = await browseUserFavoriteSongs(
          profileId,
          parsed.data,
          req.actor?.userId ?? null,
        );
        res.json(payload);
      } catch (e) {
        if (handleUserFavoritesError(res, e)) return;
        throw e;
      }
    }),
  );

  app.get(
    '/library/songs',
    optionalAuth,
    wrap(async (req, res) => {
      if (!(await rateLimitPublic(req, res))) return;

      const parsed = browseQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Paramètres de recherche invalides.' });
        return;
      }

      const payload = await browseLibrarySongs(parsed.data, req.actor?.userId ?? null);
      res.json(payload);
    }),
  );

  app.get(
    '/library/animes',
    optionalAuth,
    wrap(async (req, res) => {
      if (!(await rateLimitPublic(req, res))) return;

      const parsed = browseQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Paramètres de recherche invalides.' });
        return;
      }

      const payload = await browseLibraryAnimes(parsed.data, req.actor?.userId ?? null);
      res.json(payload);
    }),
  );

  app.get(
    '/library/tree',
    optionalAuth,
    wrap(async (req, res) => {
      if (!(await rateLimitPublic(req, res))) return;

      const parsed = browseQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Paramètres de recherche invalides.' });
        return;
      }

      const payload = await browseLibraryTree(parsed.data, req.actor?.userId ?? null);
      res.json(payload);
    }),
  );
}
