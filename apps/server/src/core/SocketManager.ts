import { logger } from '../utils/logger';
import { captureError } from '../utils/errorReporter';
import { socketAuthMiddleware } from './authMiddleware';
import { instrumentSocket } from './socketInstrumentation';
import type { TypedServer, TypedSocket } from './socketTypes';
import type { GameManager } from '../modules/game/gameManager';

import { registerChatHandlers } from '../modules/chat/chatHandlers';
import { registerLobbyHandlers } from '../modules/lobby/lobbyHandlers';
import { registerGameHandlers } from '../modules/game/gameHandlers';
import { registerProfileHandlers } from '../modules/profile/profileHandlers';
import { registerGeneralHandlers } from '../modules/generalHandlers';

/**
 * Single entry point for Socket.io event wiring. Distributes each connection
 * to the feature handler modules. Dependencies (GameManager) are injected —
 * no module reaches back into the index singleton.
 */
export class SocketManager {
  private io: TypedServer;
  private gameManager: GameManager;

  constructor(io: TypedServer, gameManager: GameManager) {
    this.io = io;
    this.gameManager = gameManager;
  }

  public initialize() {
    // Verify the Supabase token on every handshake before any handler runs.
    // Sets the canonical, trusted identity on `socket.data`.
    this.io.use(socketAuthMiddleware);

    this.io.engine.on('connection_error', (err) => {
      captureError(err, { context: 'Socket', source: 'connection_error' });
    });

    this.io.on('connection', (socket: TypedSocket) => {
      // Identity is set by socketAuthMiddleware (never trust raw client userId).
      const { username, userId, isAuthenticated } = socket.data;

      instrumentSocket(socket);

      logger.child({
        context: 'Socket',
        socketId: socket.id,
        userId: userId ?? undefined,
      }).info(
        'socket:connected',
        undefined,
        {
          lifecycle: 'connect',
          username,
          isAuthenticated,
          authUserId: userId ?? undefined,
        },
      );

      registerChatHandlers(this.io, socket, this.gameManager);
      registerLobbyHandlers(this.io, socket, this.gameManager);
      registerGameHandlers(this.io, socket, this.gameManager);
      registerProfileHandlers(this.io, socket);
      registerGeneralHandlers(this.io, socket);

      socket.on('disconnect', (reason) => {
        const data = socket.data;
        logger.child({
          context: 'Socket',
          socketId: socket.id,
          userId: data.userId ?? undefined,
        }).info(
          'socket:disconnected',
          undefined,
          {
            lifecycle: 'disconnect',
            username: data.username ?? 'guest',
            reason,
          },
        );
      });

      // 5. Gestion des erreurs
      socket.on('error', (err) => {
        captureError(err, {
          context: 'Socket',
          source: 'socket_error',
          socketId: socket.id,
          userId: socket.data.userId ?? undefined,
        });
      });
    });
  }
}