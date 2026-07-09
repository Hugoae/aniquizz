import express from 'express';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import { Server } from 'socket.io';
import cors from 'cors';
import { prisma } from '@aniquizz/database';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@aniquizz/shared';
import { securityConfig } from '../config/security';
import { GameManager } from '../modules/game/gameManager';
import { SocketManager } from '../core/SocketManager';
import { registerHealthRoute } from '../routes/health';
import { registerAdminRoutes } from '../modules/admin/adminRoutes';

export interface ServerBundle {
  app: express.Application;
  httpServer: ReturnType<typeof createServer>;
  io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
  gameManager: GameManager;
  url: string;
  close: () => Promise<void>;
}

/** Spin up an isolated HTTP + Socket.io stack on a random port (integration tests). */
export async function createServerBundle(): Promise<ServerBundle> {
  const app = express();
  app.use(cors(securityConfig));
  app.use(express.json());

  const httpServer = createServer(app);
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: securityConfig,
    pingTimeout: 60_000,
  });

  await prisma.$connect();

  const gameManager = new GameManager(io);
  registerHealthRoute(app, io, () => gameManager);
  registerAdminRoutes(app, io, gameManager);

  const socketManager = new SocketManager(io, gameManager);
  socketManager.initialize();

  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (httpServer.address() as AddressInfo).port;
  const url = `http://127.0.0.1:${port}`;

  return {
    app,
    httpServer,
    io,
    gameManager,
    url,
    close: async () => {
      for (const room of gameManager.getRoomList()) {
        gameManager.removeRoom(room.id);
      }
      io.disconnectSockets(true);
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
