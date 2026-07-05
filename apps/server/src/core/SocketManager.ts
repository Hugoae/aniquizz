import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { socketAuthMiddleware, AuthenticatedSocketData } from './authMiddleware';

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

    this.io.on('connection', (socket: Socket) => {
      // Identity is set by socketAuthMiddleware (never trust raw client userId).
      const { username, userId, isAuthenticated } = socket.data as AuthenticatedSocketData;

      logger.info(
        `Connexion : ${username} (${socket.id}) [${isAuthenticated ? `auth:${userId}` : 'guest'}]`,
        'Socket',
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
        const name = socket.data.username || "Anonyme";
        // On réduit le log au niveau debug pour ne pas polluer si c'est fréquent
        logger.debug(`❌ Déconnexion : ${name} (${socket.id}) - Raison: ${reason}`, 'Socket');
      });

      // 5. Gestion des erreurs
      socket.on('error', (err) => {
        const name = socket.data.username || "Anonyme";
        logger.error(`Erreur Socket [${name}]:`, 'Socket', err);
      });
    });
  }
}