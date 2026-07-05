import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { gameManager } from '../../index';
import { guard, requireAuth, RATE_LIMITS } from '../../core/guards';

export const registerLobbyHandlers = (io: Server, socket: Socket) => {

  const broadcastRooms = () => {
    io.emit('rooms_update', gameManager.getGameList());
  };

  const getPlayersWithHost = (game: any) => {
    return Array.from(game.players.values()).map((p: any) => ({
      ...p,
      isHost: String(p.id) === String(game.hostId), 
      isInGame: (game.status === 'playing' || game.status === 'finished') 
                && (typeof game.hasReturned === 'function' ? !game.hasReturned(p.id) : false)
    }));
  };

  const createLobby = (payload: any) => {
    try {
      const { username, avatar, settings, roomName } = payload;
      
      const game = gameManager.createGame(socket.id, {
        ...settings,
        name: roomName || `Salon de ${username}`, // Le serveur utilisera le nom envoyé par le client
        hostName: username,
        hostAvatar: avatar
      });

      // Log Storytelling
      logger.info(`[Lobby] Room ${game.id} créée par "${username}". Mode: ${settings.gameType}, Songs: ${settings.soundCount}`, 'Lobby');

      socket.join(game.id);
      game.addPlayer(socket.id, username, avatar, true);

      if (typeof game.playerReturnToLobby === 'function') {
        game.playerReturnToLobby(socket.id);
      }

      socket.emit('lobby:joined', { 
        roomId: game.id, 
        playerId: socket.id, 
        settings: game.settings, 
        isHost: true, 
        players: getPlayersWithHost(game),
        status: game.status 
      });

      broadcastRooms();
    } catch (error) {
      logger.error('Erreur création lobby', 'Lobby', error);
      socket.emit('error', { message: "Impossible de créer le salon." });
    }
  };

  const joinLobby = (payload: any) => {
    try {
      const { roomId, username, avatar, password } = payload;
      const game = gameManager.getGame(roomId);

      if (!game) {
        logger.warn(`[Lobby] Tentative de rejoindre salon inexistant: ${roomId} par "${username}"`, 'Lobby');
        return socket.emit('error', { message: "Salon introuvable." });
      }
      
      const isReturningPlayer = game.players.has(socket.id);

      if (!isReturningPlayer && game.settings.isPrivate && game.settings.password && game.settings.password !== password) {
          logger.warn(`[Lobby] Échec Auth Room ${roomId} par "${username}" (Mauvais mot de passe)`, 'Lobby');
          if (!password) return socket.emit('password_required', { roomId });
          return socket.emit('error', { message: "Mot de passe incorrect." });
      }
      
      if (game.players.size >= game.settings.maxPlayers && !isReturningPlayer) {
          logger.warn(`[Lobby] Room ${roomId} pleine. Rejet de "${username}"`, 'Lobby');
          return socket.emit('error', { message: "Le salon est complet." });
      }

      socket.join(game.id);
      
      const isHostRejoining = String(game.hostId) === String(socket.id);
      const startReady = isHostRejoining; 

      game.addPlayer(socket.id, username, avatar, startReady);
      
      // Log Storytelling
      logger.info(`[Lobby] "${username}" a rejoint la Room ${roomId}. (Total: ${game.players.size}/${game.settings.maxPlayers})`, 'Lobby');

      if (typeof game.playerReturnToLobby === 'function') {
          game.playerReturnToLobby(socket.id);
      }

      socket.emit('lobby:joined', { 
        roomId: game.id, 
        playerId: socket.id, 
        settings: game.settings, 
        players: getPlayersWithHost(game),
        status: game.status
      });

      io.to(game.id).emit('update_players', { 
          players: getPlayersWithHost(game), 
          hostId: game.hostId,
          status: game.status
      });
      broadcastRooms();
    } catch (error) {
      logger.error('Erreur join lobby', 'Lobby', error);
    }
  };

  const updateRoomSettings = (payload: { roomId: string, settings: any }) => {
      const game = gameManager.getGame(payload.roomId);
      if (!game) return;
      
      if (String(game.hostId) !== String(socket.id)) return;

      game.settings = { ...game.settings, ...payload.settings };
      if (payload.settings.roomName) {
          game.settings.name = payload.settings.roomName;
      }

      logger.info(`[Lobby] Settings mis à jour pour Room ${game.id} (Mode: ${game.settings.gameType})`, 'Lobby');

      io.to(game.id).emit('room_updated', {
          roomSettings: game.settings,
          roomName: game.settings.name,
          players: getPlayersWithHost(game)
      });
      
      broadcastRooms();
  };

  const transferHost = (payload: { roomId: string, targetId: string }) => {
    const game = gameManager.getGame(payload.roomId);
    if (!game) return;
    if (String(game.hostId) !== String(socket.id)) return;

    const targetPlayer = game.players.get(payload.targetId);
    if (!targetPlayer) return;

    const oldHostName = game.settings.hostName; // Pour le log

    game.hostId = String(payload.targetId);
    (game.settings as any).hostName = targetPlayer.username; 
    (game.settings as any).hostAvatar = targetPlayer.avatar;
    
    targetPlayer.isReady = true;

    logger.info(`[Lobby] Transfert Hôte Room ${game.id}: ${oldHostName} -> ${targetPlayer.username}`, 'Lobby');

    io.to(game.id).emit('update_players', { 
        players: getPlayersWithHost(game), 
        hostId: game.hostId,
        status: game.status 
    });
    io.to(payload.targetId).emit('host_promoted');
    broadcastRooms();
  };

  // ✅ LOGIQUE SERVER-SIDE CENTRALISÉE POUR LE DÉPART
  const handleLeave = (payload: { roomId: string }) => {
    const roomId = payload.roomId;
    const game = gameManager.getGame(roomId);
    if (!game) return;

    const player = game.players.get(socket.id);
    const username = player ? player.username : "Inconnu";

    socket.leave(roomId);
    logger.info(`[Lobby] "${username}" quitte la Room ${roomId}.`, 'Lobby');

    // Promotion d'un nouvel hôte si nécessaire (Multi)
    if (String(game.hostId) === String(socket.id)) {
        const allPlayers = Array.from(game.players.values()) as any[];
        const candidates = allPlayers.filter(p => String(p.id) !== String(socket.id));
        
        if (candidates.length > 0) {
            candidates.sort((a, b) => a.username.localeCompare(b.username));
            const nextHost = candidates[0];

            game.hostId = String(nextHost.id);
            (game.settings as any).hostName = nextHost.username;
            (game.settings as any).hostAvatar = nextHost.avatar;
            nextHost.isReady = true;

            logger.info(`[Lobby] Hôte parti. Nouveau host Room ${roomId}: ${nextHost.username}`, 'Lobby');

            io.to(roomId).emit('chat:message', { 
                id: 'system', 
                senderId: 'system',
                username: 'Système', 
                content: `${nextHost.username} est maintenant l'hôte.`, 
                timestamp: Date.now(),
                isSystem: true
            });
            io.to(nextHost.id).emit('host_promoted');
        }
    }

    // Retirer le joueur
    game.removePlayer(socket.id); 

    // ✅ SI LA ROOM EST VIDE (0 JOUEURS) -> DESTRUCTION TOTALE
    if (game.players.size === 0) {
        game.stopGame(); // <-- Arrête les timers
        gameManager.removeGame(roomId); // <-- Supprime de la mémoire
        logger.info(`[Lobby] Room ${roomId} détruite (vide).`, 'Lobby');
        broadcastRooms();
    } else {
        broadcastRooms();
    }
  };

  const getRooms = () => { socket.emit('rooms_update', gameManager.getGameList()); };
  
  const toggleReady = (payload: { roomId: string }) => {
      const game = gameManager.getGame(payload.roomId);
      if (!game) return;
      const player = game.players.get(socket.id);
      
      if (String(game.hostId) === String(socket.id)) return;

      if (player) {
          player.isReady = !player.isReady;
          // Petit log debug pour voir si les gens spam le ready
          logger.debug(`[Lobby] Room ${payload.roomId}: "${player.username}" est ${player.isReady ? 'PRÊT' : 'NON PRÊT'}`, 'Lobby');
          
          io.to(game.id).emit('update_players', { 
              players: getPlayersWithHost(game), 
              hostId: game.hostId,
              status: game.status
          });
      }
  };

  socket.on('lobby:create', guard(socket, 'lobby:create', RATE_LIMITS.createLobby, createLobby));
  socket.on('lobby:join', requireAuth(socket, joinLobby));
  socket.on('get_rooms', getRooms);
  socket.on('transfer_host', requireAuth(socket, transferHost));
  socket.on('leave_room', requireAuth(socket, handleLeave));
  socket.on('toggle_ready', requireAuth(socket, toggleReady));
  socket.on('update_room_settings', requireAuth(socket, updateRoomSettings));
  
  socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) { 
        if (roomId !== socket.id) handleLeave({ roomId }); 
      }
  });
};
