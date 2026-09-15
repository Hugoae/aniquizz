import type { Router } from 'express';
import { logger } from '../../utils/logger';
import type { TypedServer } from '../../core/socketTypes';
import type { GameManager } from '../game/gameManager';
import { collectHealthStats } from '../../routes/health';
import * as adminService from './adminService';
import { staff, wrap } from './adminHttp';

const parsePeriodDays = (raw: unknown): number | null => {
  switch (String(raw)) {
    case '24h':
      return 1;
    case '30d':
      return 30;
    case 'all':
      return null;
    case '7d':
    default:
      return 7;
  }
};

export function registerAdminStatsRoutes(
  router: Router,
  io: TypedServer,
  gameManager: GameManager,
): void {
  router.get('/stats', ...staff('MODERATOR'), (_req, res) => {
    res.json(collectHealthStats(io, gameManager));
  });

  router.get(
    '/stats/overview',
    ...staff('MODERATOR'),
    wrap(async (req, res) => {
      const periodDays = parsePeriodDays(req.query.period);
      const base = collectHealthStats(io, gameManager);
      const roomStats = gameManager.getLiveRoomStats();

      const onlineUsers = new Set<string>();
      for (const s of io.sockets.sockets.values()) {
        const uid = s.data.userId;
        if (uid) onlineUsers.add(uid);
      }

      const overview = await adminService.getStatsOverview(periodDays);

      res.json({
        live: {
          uptimeSeconds: base.uptimeSeconds,
          connectedSockets: base.connectedSockets,
          uniqueOnline: onlineUsers.size,
          activeRooms: base.activeRooms,
          activeMatches: base.activeMatches,
          playersInRooms: base.playersInRooms,
          humansInRooms: roomStats.humansInRooms,
          botsInRooms: roomStats.botsInRooms,
          roomsPublic: roomStats.roomsPublic,
          roomsPrivate: roomStats.roomsPrivate,
          roomsWaiting: roomStats.roomsWaiting,
          roomsPlaying: roomStats.roomsPlaying,
          roomsPaused: roomStats.roomsPaused,
          memoryRssMb: Math.round(process.memoryUsage().rss / 1_048_576),
          nodeVersion: process.version,
        },
        community: overview.community,
        activity: overview.activity,
      });
    }),
  );

  router.post(
    '/stats/reset-activity',
    ...staff('ADMIN'),
    wrap(async (req, res) => {
      const result = await adminService.resetActivityStats();
      logger.warn(
        `Admin ${req.actor!.username} reset game-activity stats (${result.matches} matches, ${result.songHistory} history rows).`,
        'Admin',
      );
      res.json(result);
    }),
  );
}
