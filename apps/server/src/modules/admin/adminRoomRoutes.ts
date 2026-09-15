import { z } from 'zod';
import type { Router } from 'express';
import { logger } from '../../utils/logger';
import type { AuthedRequest } from '../../core/httpAuth';
import type { GameManager } from '../game/gameManager';
import { ADMIN_ERRORS, guardProtectedTarget, pid, staff, wrap } from './adminHttp';

export function registerAdminRoomRoutes(router: Router, gameManager: GameManager): void {
  router.get('/rooms', ...staff('MODERATOR'), (_req, res) => {
    res.json({ rooms: gameManager.getRoomDetails() });
  });

  router.get('/rooms/:id', ...staff('MODERATOR'), (req: AuthedRequest, res) => {
    const room = gameManager.getRoomDetail(pid(req));
    if (!room) {
      res.status(404).json({ error: ADMIN_ERRORS.roomNotFound });
      return;
    }
    res.json({ room });
  });

  router.post('/rooms/:id/end', ...staff('MODERATOR'), (req: AuthedRequest, res) => {
    const ok = gameManager.forceEndMatch(pid(req));
    if (!ok) {
      res.status(404).json({ error: ADMIN_ERRORS.roomNotFound });
      return;
    }
    logger.info(`Admin ${req.actor!.username} force-ended match ${pid(req)}`, 'Admin');
    res.json({ ok: true });
  });

  router.post('/rooms/:id/close', ...staff('MODERATOR'), (req: AuthedRequest, res) => {
    const ok = gameManager.closeRoom(pid(req));
    if (!ok) {
      res.status(404).json({ error: ADMIN_ERRORS.roomNotFound });
      return;
    }
    logger.info(`Admin ${req.actor!.username} closed room ${pid(req)}`, 'Admin');
    res.json({ ok: true });
  });

  router.post(
    '/rooms/:id/kick',
    ...staff('MODERATOR'),
    wrap(async (req, res) => {
      const parsed = z.object({ userId: z.string().min(1) }).safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.missingUserId });
        return;
      }
      if (!(await guardProtectedTarget(req, res, parsed.data.userId))) return;
      const ok = gameManager.kickPlayer(pid(req), parsed.data.userId);
      if (!ok) {
        res.status(404).json({ error: ADMIN_ERRORS.roomNotFound });
        return;
      }
      logger.info(
        `Admin ${req.actor!.username} kicked ${parsed.data.userId} from ${pid(req)}`,
        'Admin',
      );
      res.json({ ok: true });
    }),
  );
}
