import type { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type { GameManager } from '../game/gameManager';
import { MODERATION_BAN_MESSAGE } from '@aniquizz/shared';
import type { UserRole } from '@aniquizz/database';
import * as adminService from './adminService';
import { resetDailyProgress } from '../daily/dailyAdmin';
import { recordStaffAudit } from './adminAuditService';
import {
  ADMIN_ERRORS,
  durationSchema,
  guardProtectedTarget,
  pid,
  rejectSelfTarget,
  ROLES,
  staff,
  wrap,
} from './adminHttp';

export function registerAdminUserRoutes(
  router: Router,
  io: TypedServer,
  gameManager: GameManager,
): void {
  const forEachUserSocket = (userId: string, fn: (s: TypedSocket) => void) => {
    for (const s of io.sockets.sockets.values()) {
      if (s.data.userId === userId) fn(s as unknown as TypedSocket);
    }
  };

  const pushSanctionToSockets = (
    userId: string,
    sanction: { bannedUntil: Date | null; mutedUntil: Date | null },
  ) => {
    const payload = {
      bannedUntil: sanction.bannedUntil?.toISOString() ?? null,
      mutedUntil: sanction.mutedUntil?.toISOString() ?? null,
    };
    forEachUserSocket(userId, (s) => {
      s.data.mutedUntil = payload.mutedUntil;
      s.emit('profile:sanction_updated', payload);
    });
  };

  router.get(
    '/users',
    ...staff('MODERATOR'),
    wrap(async (req, res) => {
      const query = typeof req.query.query === 'string' ? req.query.query : undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const filter = typeof req.query.filter === 'string' ? req.query.filter : 'all';
      const sort = typeof req.query.sort === 'string' ? req.query.sort : 'username';
      const sortDir = req.query.sortDir === 'desc' ? 'desc' : 'asc';

      const connected = new Set<string>();
      for (const s of io.sockets.sockets.values()) {
        if (typeof s.data.userId === 'string') connected.add(s.data.userId);
      }
      const inGame = gameManager.getInGameUserIds();
      const roomMap = gameManager.getUserRoomMap();

      const onlineIds = [...connected].filter((id) => !inGame.has(id));
      const inGameIds = [...inGame];

      const allowedFilters = new Set([
        'all',
        'players',
        'moderators',
        'admins',
        'muted',
        'banned',
        'online',
        'in_game',
      ]);
      const allowedSorts = new Set(['username', 'xp', 'games', 'created', 'seen']);

      const result = await adminService.listUsers({
        query,
        page: Number.isFinite(page) ? page : 1,
        filter: allowedFilters.has(filter) ? (filter as adminService.UserListFilter) : 'all',
        sort: allowedSorts.has(sort) ? (sort as adminService.UserListSort) : 'username',
        sortDir,
        onlineIds,
        inGameIds,
      });

      const withPresence = result.users.map((u) => ({
        ...u,
        presence: inGame.has(u.id) ? 'in_game' : connected.has(u.id) ? 'online' : 'offline',
        currentRoom: roomMap.get(u.id) ?? null,
      }));

      let onlineCount = 0;
      for (const id of connected) {
        if (!inGame.has(id)) onlineCount += 1;
      }

      res.json({
        users: withPresence,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        counts: {
          online: onlineCount,
          inGame: inGame.size,
          banned: result.bannedCount,
          muted: result.mutedCount,
        },
      });
    }),
  );

  router.get(
    '/users/:id/profile',
    ...staff('MODERATOR'),
    wrap(async (req, res) => {
      const profile = await adminService.getUserProfile(pid(req));
      if (!profile) {
        res.status(404).json({ error: ADMIN_ERRORS.userNotFound });
        return;
      }
      res.json(profile);
    }),
  );

  router.patch(
    '/users/:id/role',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const parsed = z.object({ role: z.enum(ROLES) }).safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.invalidRole });
        return;
      }
      if (pid(req) === req.actor!.userId) {
        res.status(400).json({ error: ADMIN_ERRORS.selfRole });
        return;
      }
      if (!(await guardProtectedTarget(req, res, pid(req)))) return;
      const previous = await adminService.getProfileRole(pid(req));
      const result = await adminService.setUserRole(pid(req), parsed.data.role as UserRole);
      logger.info(
        `Admin ${req.actor!.username} set role ${parsed.data.role} on ${pid(req)}`,
        'Admin',
      );
      void recordStaffAudit({
        actorId: req.actor!.userId,
        actorUsername: req.actor!.username,
        targetId: pid(req),
        action: 'ROLE_CHANGE',
        fromRole: previous?.role ?? null,
        toRole: parsed.data.role as UserRole,
      });
      res.json(result);
    }),
  );

  router.post(
    '/users/:id/ban',
    ...staff('MODERATOR'),
    wrap(async (req, res) => {
      const parsed = durationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.invalidDuration });
        return;
      }
      const targetId = pid(req);
      if (rejectSelfTarget(req, res, targetId)) return;
      if (!(await guardProtectedTarget(req, res, targetId))) return;
      const result = await adminService.setUserBan(targetId, parsed.data.minutes);
      pushSanctionToSockets(targetId, result);
      if (parsed.data.minutes !== null) {
        gameManager.ejectUserFromAllRooms(targetId, MODERATION_BAN_MESSAGE);
        forEachUserSocket(targetId, (s) => {
          s.emit('error', { message: MODERATION_BAN_MESSAGE });
          s.disconnect(true);
        });
      }
      logger.info(
        `Admin ${req.actor!.username} ban(${parsed.data.minutes}) on ${targetId}`,
        'Admin',
      );
      void recordStaffAudit({
        actorId: req.actor!.userId,
        actorUsername: req.actor!.username,
        targetId,
        action: parsed.data.minutes === null ? 'UNBAN' : 'BAN',
        durationMinutes: parsed.data.minutes,
      });
      res.json(result);
    }),
  );

  router.post(
    '/users/:id/mute',
    ...staff('MODERATOR'),
    wrap(async (req, res) => {
      const parsed = durationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: ADMIN_ERRORS.invalidDuration });
        return;
      }
      const targetId = pid(req);
      if (rejectSelfTarget(req, res, targetId)) return;
      if (!(await guardProtectedTarget(req, res, targetId))) return;
      const result = await adminService.setUserMute(targetId, parsed.data.minutes);
      pushSanctionToSockets(targetId, result);
      logger.info(
        `Admin ${req.actor!.username} mute(${parsed.data.minutes}) on ${targetId}`,
        'Admin',
      );
      void recordStaffAudit({
        actorId: req.actor!.userId,
        actorUsername: req.actor!.username,
        targetId,
        action: parsed.data.minutes === null ? 'UNMUTE' : 'MUTE',
        durationMinutes: parsed.data.minutes,
      });
      res.json(result);
    }),
  );

  router.post(
    '/users/:id/reset-stats',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const targetId = pid(req);
      if (!(await guardProtectedTarget(req, res, targetId, { allowSelf: true }))) return;
      const result = await adminService.resetUserStats(targetId);
      logger.info(
        `Admin ${req.actor!.username} reset stats on ${targetId} (${result.matchPlayers} participations, ${result.songHistory} pokédex rows, ${result.orphanMatches} orphan matches)`,
        'Admin',
      );
      res.json(result);
    }),
  );

  router.post(
    '/users/:id/reset-daily',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const targetId = pid(req);
      if (!(await guardProtectedTarget(req, res, targetId, { allowSelf: true }))) return;
      const result = await resetDailyProgress(targetId);
      logger.info(
        `Admin ${req.actor!.username} reset daily quiz on ${targetId} (reset=${result.reset}, xp=${result.xpReverted})`,
        'Admin',
      );
      res.json(result);
    }),
  );

  router.post(
    '/users/:id/disconnect',
    ...staff('MODERATOR'),
    wrap(async (req, res) => {
      const targetId = pid(req);
      if (rejectSelfTarget(req, res, targetId)) return;
      if (!(await guardProtectedTarget(req, res, targetId))) return;
      let count = 0;
      forEachUserSocket(targetId, (s) => {
        s.emit('force_logout', { reason: 'Vous avez été déconnecté par la modération.' });
        count += 1;
      });
      logger.info(
        `Admin ${req.actor!.username} forced logout of ${targetId} (${count} socket(s))`,
        'Admin',
      );
      void recordStaffAudit({
        actorId: req.actor!.userId,
        actorUsername: req.actor!.username,
        targetId,
        action: 'DISCONNECT',
      });
      res.json({ disconnected: count });
    }),
  );
}
