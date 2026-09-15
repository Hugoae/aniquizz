import type { Response, Router } from 'express';
import { z } from 'zod';
import { type AuthedRequest } from '../../core/httpAuth';
import { logger } from '../../utils/logger';
import { handlePrismaError } from './prismaHttpError';
import { ADMIN_ERRORS, staff } from './adminHttp';
import { DailyHttpError } from '../daily/dailyErrors';
import {
  listDailyAdmin,
  regenerateDailyChallenge,
  regenerateDailyRound,
  reorderDailyRounds,
  replaceDailyRound,
  restoreDailyRound,
  reshuffleDailyRoundClip,
  searchDailyPlayableSongs,
  setDailyChallengeStatus,
  voidDailyRound,
} from '../daily/dailyAdmin';

const wrap =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: AuthedRequest, res: Response): void => {
    fn(req, res).catch((error) => {
      if (error instanceof DailyHttpError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      if (handlePrismaError(error, res)) return;
      logger.error('Daily admin route failed', 'Admin', error);
      if (!res.headersSent) res.status(500).json({ error: ADMIN_ERRORS.internal });
    });
  };

const statusSchema = z.object({ status: z.enum(['ready', 'draft']) });
const replaceSchema = z.object({ songId: z.number().int().positive() });
const reorderSchema = z.object({ orderedIds: z.array(z.string().min(1)).min(1).max(5) });
const dateSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export function registerAdminDailyRoutes(router: Router): void {
  router.get(
    '/daily',
    ...staff('ADMIN'),
    wrap(async (_req, res) => {
      res.json(await listDailyAdmin());
    }),
  );

  router.get(
    '/daily/songs',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const query = typeof req.query.query === 'string' ? req.query.query : '';
      const excludeRaw = typeof req.query.exclude === 'string' ? req.query.exclude : '';
      const exclude = excludeRaw
        .split(',')
        .map((value) => Number(value))
        .filter((id) => Number.isInteger(id) && id > 0);
      res.json({ songs: await searchDailyPlayableSongs(query, exclude) });
    }),
  );

  router.post(
    '/daily/regenerate',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const parsed = dateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Date invalide.' });
        return;
      }
      res.json(await regenerateDailyChallenge(parsed.data.date));
    }),
  );

  router.post(
    '/daily/:id/status',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Statut invalide.' });
        return;
      }
      res.json(
        await setDailyChallengeStatus(String(req.params.id), parsed.data.status, req.actor!.userId),
      );
    }),
  );

  router.post(
    '/daily/:id/reorder',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const parsed = reorderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Ordre invalide.' });
        return;
      }
      res.json(await reorderDailyRounds(String(req.params.id), parsed.data.orderedIds));
    }),
  );

  router.post(
    '/daily/:id/rounds/:roundId/replace',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const parsed = replaceSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'songId invalide.' });
        return;
      }
      res.json(
        await replaceDailyRound(
          String(req.params.id),
          String(req.params.roundId),
          parsed.data.songId,
        ),
      );
    }),
  );

  router.post(
    '/daily/:id/rounds/:roundId/regenerate',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      res.json(await regenerateDailyRound(String(req.params.id), String(req.params.roundId)));
    }),
  );

  router.post(
    '/daily/:id/rounds/:roundId/clip',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      res.json(await reshuffleDailyRoundClip(String(req.params.id), String(req.params.roundId)));
    }),
  );

  router.post(
    '/daily/:id/rounds/:roundId/void',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      res.json(await voidDailyRound(String(req.params.id), String(req.params.roundId)));
    }),
  );

  router.post(
    '/daily/:id/rounds/:roundId/restore',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      res.json(await restoreDailyRound(String(req.params.id), String(req.params.roundId)));
    }),
  );
}
