import { Router, type Application } from 'express';
import { logger } from '../../utils/logger';
import type { TypedServer } from '../../core/socketTypes';
import type { GameManager } from '../game/gameManager';
import { registerAdminDailyRoutes } from './adminDailyRoutes';
import { registerAdminUserRoutes } from './adminUserRoutes';
import { registerAdminRoomRoutes } from './adminRoomRoutes';
import { registerAdminCatalogueRoutes } from './adminCatalogueRoutes';
import { registerAdminStatsRoutes } from './adminStatsRoutes';
import { registerAdminPlaylistRoutes } from './adminPlaylistRoutes';
import { registerAdminDevRoutes } from './adminDevRoutes';
import { registerAdminAuditRoutes } from './adminAuditRoutes';

export function registerAdminRoutes(
  app: Application,
  io: TypedServer,
  gameManager: GameManager,
): void {
  const router = Router();

  registerAdminUserRoutes(router, io, gameManager);
  registerAdminRoomRoutes(router, gameManager);
  registerAdminAuditRoutes(router);
  registerAdminCatalogueRoutes(router);
  registerAdminStatsRoutes(router, io, gameManager);
  registerAdminDailyRoutes(router);
  registerAdminPlaylistRoutes(router);
  registerAdminDevRoutes(router, gameManager);

  app.use('/admin', router);
  logger.info('Admin routes registered at /admin', 'Admin');
}
