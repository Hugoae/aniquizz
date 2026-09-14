import type { Application, Response } from 'express';
import { z } from 'zod';
import { optionalAuth, requireUser, type AuthedRequest } from '../core/httpAuth';
import { clientIp, enforceHttpRateLimit, HTTP_RATE_LIMITS } from '../core/httpRateLimit';
import { logger } from '../utils/logger';
import { DailyHttpError } from '../modules/daily/dailyErrors';
import {
  answerDailyAttempt,
  forfeitDailyAttempt,
  getDailyLeaderboard,
  getDailyToday,
  nextDailyRound,
  startDailyAttempt,
} from '../modules/daily/dailyService';

const wrap =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: AuthedRequest, res: Response): void => {
    fn(req, res).catch((error) => {
      if (error instanceof DailyHttpError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      logger.error('[Daily] Route failed', 'Daily', error);
      if (!res.headersSent) res.status(500).json({ error: 'Impossible de charger le quiz du jour.' });
    });
  };

const idParam = (req: AuthedRequest): string => String(req.params.id);

export function registerDailyRoutes(app: Application): void {
  app.get(
    '/daily/today',
    optionalAuth,
    wrap(async (req, res) => {
      const allowed = await enforceHttpRateLimit(req, res, {
        scope: 'daily:today',
        identity: req.actor?.userId ?? clientIp(req),
        ...HTTP_RATE_LIMITS.publicRead,
      });
      if (!allowed) return;
      const payload = await getDailyToday(req.actor?.userId ?? null);
      if (!req.actor) {
        res.setHeader('Cache-Control', 'public, max-age=30');
      } else {
        res.setHeader('Cache-Control', 'private, no-store');
      }
      res.json(payload);
    }),
  );

  app.post(
    '/daily/attempt',
    requireUser,
    wrap(async (req, res) => {
      const allowed = await enforceHttpRateLimit(req, res, {
        scope: 'daily:attempt',
        identity: req.actor!.userId,
        ...HTTP_RATE_LIMITS.userMutation,
      });
      if (!allowed) return;
      res.setHeader('Cache-Control', 'private, no-store');
      res.json(await startDailyAttempt(req.actor!.userId));
    }),
  );

  app.post(
    '/daily/attempt/:id/answer',
    requireUser,
    wrap(async (req, res) => {
      const allowed = await enforceHttpRateLimit(req, res, {
        scope: 'daily:answer',
        identity: req.actor!.userId,
        ...HTTP_RATE_LIMITS.dailyPlay,
      });
      if (!allowed) return;
      const parsed = z.object({ selected: z.string().min(1).max(120).nullable().optional() }).safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Réponse invalide.' });
        return;
      }
      res.setHeader('Cache-Control', 'private, no-store');
      res.json(await answerDailyAttempt(req.actor!.userId, idParam(req), parsed.data.selected ?? null));
    }),
  );

  app.post(
    '/daily/attempt/:id/next',
    requireUser,
    wrap(async (req, res) => {
      const allowed = await enforceHttpRateLimit(req, res, {
        scope: 'daily:next',
        identity: req.actor!.userId,
        ...HTTP_RATE_LIMITS.dailyPlay,
      });
      if (!allowed) return;
      res.setHeader('Cache-Control', 'private, no-store');
      res.json(await nextDailyRound(req.actor!.userId, idParam(req)));
    }),
  );

  app.post(
    '/daily/attempt/:id/forfeit',
    requireUser,
    wrap(async (req, res) => {
      const allowed = await enforceHttpRateLimit(req, res, {
        scope: 'daily:forfeit',
        identity: req.actor!.userId,
        ...HTTP_RATE_LIMITS.userMutation,
      });
      if (!allowed) return;
      res.setHeader('Cache-Control', 'private, no-store');
      res.json(await forfeitDailyAttempt(req.actor!.userId, idParam(req)));
    }),
  );

  app.get(
    '/daily/leaderboard',
    optionalAuth,
    wrap(async (req, res) => {
      const allowed = await enforceHttpRateLimit(req, res, {
        scope: 'daily:leaderboard',
        identity: req.actor?.userId ?? clientIp(req),
        ...HTTP_RATE_LIMITS.publicRead,
      });
      if (!allowed) return;
      if (!req.actor) {
        res.setHeader('Cache-Control', 'public, max-age=15');
      } else {
        res.setHeader('Cache-Control', 'private, no-store');
      }
      res.json(await getDailyLeaderboard(req.actor?.userId ?? null));
    }),
  );

  logger.info('Daily routes registered at /daily', 'Daily');
}
