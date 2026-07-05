import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { captureError } from '../utils/errorReporter';
import { socketAuthMiddleware, AuthenticatedSocketData } from './authMiddleware';
import { instrumentSocket } from './socketInstrumentation';

// Imports des modules
import { registerChatHandlers } from '../modules/chat/chatHandlers';
import { registerLobbyHandlers } from '../modules/lobby/lobbyHandlers';
import { registerGameHandlers } from '../modules/game/gameHandlers';
import { registerProfileHandlers } from '../modules/profile/profileHandlers';
// ✅ Ajout du handler général (Ajuste le chemin si besoin selon où tu as mis le fichier)
import { registerGeneralHandlers } from '../modules/generalHandlers'; 

/**
 * SOCKET MANAGER
 * Point d'entrée unique pour la gestion des événements Socket.io
 * Distribue les sockets vers les modules correspondants.
 */
export class SocketManager {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  public initialize() {
    // Verify the Supabase token on every handshake before any handler runs.
    // Sets the canonical, trusted identity on `socket.data`.
    this.io.use(socketAuthMiddleware);

    this.io.engine.on('connection_error', (err) => {
      captureError(err, { context: 'Socket', source: 'connection_error' });
    });

    this.io.on('connection', (socket: Socket) => {
      // Identity is set by socketAuthMiddleware (never trust raw client userId).
      const { username, userId, isAuthenticated } = socket.data as AuthenticatedSocketData;

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

      // 3. Attacher les gestionnaires d'événements (Modules)
      // On enregistre tout ici, proprement.
      registerChatHandlers(this.io, socket);
      registerLobbyHandlers(this.io, socket);
      registerGameHandlers(this.io, socket);
      registerProfileHandlers(this.io, socket);
      registerGeneralHandlers(this.io, socket); // ✅ Ajouté ici

      // 4. Gestion de la déconnexion globale
      socket.on('disconnect', (reason) => {
        const data = socket.data as AuthenticatedSocketData;
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
          userId: (socket.data as AuthenticatedSocketData).userId ?? undefined,
        });
      });
    });
  }
}