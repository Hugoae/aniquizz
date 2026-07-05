import type { Application, Request, Response } from 'express';
import type { Server } from 'socket.io';
import type { GameManager } from '../modules/game/gameManager';

export type HealthStats = {
  uptimeSeconds: number;
  activeRooms: number;
  activeMatches: number;
  connectedSockets: number;
  playersInRooms: number;
};

export function collectHealthStats(io: Server, gameManager: GameManager): HealthStats {
  const { activeRooms, activeMatches, playersInRooms } = gameManager.getStats();

  return {
    uptimeSeconds: Math.floor(process.uptime()),
    activeRooms,
    activeMatches,
    connectedSockets: io.engine.clientsCount,
    playersInRooms,
  };
}

export function registerHealthRoute(
  app: Application,
  io: Server,
  getGameManager: () => GameManager,
): void {
  app.get('/health', (_req: Request, res: Response) => {
    const stats = collectHealthStats(io, getGameManager());
    res.json({
      status: 'ok',
      ...stats,
    });
  });
}
