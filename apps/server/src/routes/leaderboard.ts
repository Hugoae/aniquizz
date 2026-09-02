import type { Application, Response } from 'express';
import { z } from 'zod';
import { LEADERBOARD_METRICS, LEADERBOARD_MAX_PAGE_SIZE } from '@aniquizz/shared';
import { optionalAuth, type AuthedRequest } from '../core/httpAuth';
import { clientIp, enforceHttpRateLimit, HTTP_RATE_LIMITS } from '../core/httpRateLimit';
import { browseLeaderboard } from '../modules/profile/leaderboardService';
import { logger } from '../utils/logger';

const querySchema = z.object({
  metric: z.enum(LEADERBOARD_METRICS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(LEADERBOARD_MAX_PAGE_SIZE).optional(),
});

const wrap =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: AuthedRequest, res: Response): void => {
    fn(req, res).catch((error) => {
      logger.error('[Leaderboard] Failed to load leaderboard', 'Profile', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Impossible de charger le classement.' });
      }
    });
  };

export function registerLeaderboardRoute(app: Application): void {
  app.get(
    '/leaderboard',
    optionalAuth,
    wrap(async (req, res) => {
      const allowed = await enforceHttpRateLimit(req, res, {
        scope: 'leaderboard:read',
        identity: clientIp(req),
        ...HTTP_RATE_LIMITS.publicRead,
      });
      if (!allowed) return;

      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Filtres de classement invalides.' });
        return;
      }

      res.json(await browseLeaderboard(parsed.data, req.actor?.userId));
    }),
  );
}
