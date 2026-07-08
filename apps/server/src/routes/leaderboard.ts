import type { Application, Request, Response } from 'express';
import { getLeaderboardPayload } from '../modules/profile/leaderboardService';
import { logger } from '../utils/logger';

export function registerLeaderboardRoute(app: Application): void {
  app.get('/leaderboard', async (_req: Request, res: Response) => {
    try {
      const payload = await getLeaderboardPayload();
      res.json(payload);
    } catch (error) {
      logger.error('[Leaderboard] Failed to load leaderboard', 'Profile', error);
      res.status(500).json({ error: 'Impossible de charger le classement.' });
    }
  });
}
