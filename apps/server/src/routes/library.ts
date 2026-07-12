import type { Application, Request, Response } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../core/httpAuth';
import { optionalAuth } from '../core/httpAuth';
import { logger } from '../utils/logger';
import { browseLibrarySongs, browseLibraryTree, getLibraryMeta, getLibrarySongById } from '../modules/catalogue/libraryService';

const SONG_TYPES = ['OP', 'ED', 'INSERT'] as const;
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
const SORTS = ['franchise', 'franchise_desc', 'popularity', 'anime', 'title'] as const;
const DISCOVERED = ['heard', 'unheard'] as const;

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
  franchiseId: z.coerce.number().int().positive().optional(),
  animeId: z.coerce.number().int().positive().optional(),
  sort: z.enum(SORTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(48).optional(),
});

/** Simple in-memory rate limiter for public catalogue reads. */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_MAX = 90;
const RATE_WINDOW_MS = 60_000;

const rateLimitPublic = (req: Request, res: Response): boolean => {
  const ip =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
      : null) ?? req.socket.remoteAddress ?? 'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_MAX) {
    res.status(429).json({ error: 'Trop de requêtes. Réessayez dans un instant.' });
    return false;
  }
  bucket.count += 1;
  return true;
};

const wrap =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: AuthedRequest, res: Response): void => {
    fn(req, res).catch((e) => {
      logger.error('Library route failed', 'Library', e);
      if (!res.headersSent) res.status(500).json({ error: 'Impossible de charger la librairie.' });
    });
  };

export function registerLibraryRoutes(app: Application): void {
  app.get(
    '/library/meta',
    wrap(async (_req, res) => {
      if (!rateLimitPublic(_req, res)) return;
      res.json(await getLibraryMeta());
    }),
  );

  app.get(
    '/library/song/:id',
    optionalAuth,
    wrap(async (req, res) => {
      if (!rateLimitPublic(req, res)) return;

      const songId = Number(req.params.id);
      if (!Number.isInteger(songId) || songId <= 0) {
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
    '/library/songs',
    optionalAuth,
    wrap(async (req, res) => {
      if (!rateLimitPublic(req, res)) return;

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
    '/library/tree',
    optionalAuth,
    wrap(async (req, res) => {
      if (!rateLimitPublic(req, res)) return;

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
