import type { Application, Response } from 'express';
import { optionalAuth, requireUser, type AuthedRequest } from '../core/httpAuth';
import { clientIp, enforceHttpRateLimit, HTTP_RATE_LIMITS } from '../core/httpRateLimit';
import { logger } from '../utils/logger';
import { DailyHttpError } from '../modules/daily/dailyErrors';
import { getSongOfTheDay, markSongOfTheDayHeard } from '../modules/daily/songOfTheDay';

const wrap =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: AuthedRequest, res: Response): void => {
    fn(req, res).catch((error) => {
      if (error instanceof DailyHttpError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      logger.error('[Discover] Route failed', 'Discover', error);
      if (!res.headersSent)
        res.status(500).json({ error: 'Impossible de charger le son du jour.' });
    });
  };

export function registerDiscoverRoutes(app: Application): void {
  app.get(
    '/discover/today',
    optionalAuth,
    wrap(async (req, res) => {
      const allowed = await enforceHttpRateLimit(req, res, {
        scope: 'discover:today',
        identity: req.actor?.userId ?? clientIp(req),
        ...HTTP_RATE_LIMITS.publicRead,
      });
      if (!allowed) return;
      const payload = await getSongOfTheDay(req.actor?.userId ?? null);
      if (!payload) {
        res.status(404).json({ error: 'Pas de son du jour pour le moment.' });
        return;
      }
      res.setHeader('Cache-Control', req.actor ? 'private, no-store' : 'public, max-age=60');
      res.json(payload);
    }),
  );

  app.post(
    '/discover/today/heard',
    requireUser,
    wrap(async (req, res) => {
      const userId = req.actor?.userId;
      if (!userId) {
        res.status(401).json({ error: "Jeton d'authentification manquant." });
        return;
      }
      const allowed = await enforceHttpRateLimit(req, res, {
        scope: 'discover:heard',
        identity: userId,
        ...HTTP_RATE_LIMITS.userMutation,
      });
      if (!allowed) return;
      res.setHeader('Cache-Control', 'private, no-store');
      res.json(await markSongOfTheDayHeard(userId));
    }),
  );

  logger.info('Discover routes registered at /discover', 'Discover');
}
