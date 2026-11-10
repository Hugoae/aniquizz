import type { Application, Response } from 'express';
import { optionalAuth, type AuthedRequest } from '../core/httpAuth';
import { clientIp, enforceHttpRateLimit, HTTP_RATE_LIMITS } from '../core/httpRateLimit';
import { logger } from '../utils/logger';
import { DailyHttpError } from '../modules/daily/dailyErrors';
import { getDailyLeaderboard, getDailyToday } from '../modules/daily/dailyService';

const wrap =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: AuthedRequest, res: Response): void => {
    fn(req, res).catch((error) => {
      if (error instanceof DailyHttpError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      logger.error('[Daily] Route failed', 'Daily', error);
      if (!res.headersSent)
        res.status(500).json({ error: 'Impossible de charger le quiz du jour.' });
    });
  };

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
