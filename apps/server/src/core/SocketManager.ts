import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { registerChatHandlers } from '../modules/chat/chatHandlers';
import { registerLobbyHandlers } from '../modules/lobby/lobbyHandlers';
import { registerGameHandlers } from '../modules/game/gameHandlers';

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
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connecté : ${socket.id}`, 'Socket');

      // 1. Attacher les gestionnaires d'événements (Modules)
      registerChatHandlers(this.io, socket);
      registerLobbyHandlers(this.io, socket);
      registerGameHandlers(this.io, socket);

      // 2. Gestion de la déconnexion globale
      socket.on('disconnect', (reason) => {
        logger.warn(`❌ Client déconnecté (${socket.id}): ${reason}`);
        // Ici on pourra ajouter la logique pour nettoyer le joueur des parties
      });

      // 3. Gestion des erreurs
      socket.on('error', (err) => {
        logger.error(`Erreur Socket (${socket.id})`, 'Socket', err);
      });
    });
  }
}