import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { gameManager } from '../../index';

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

      if (!game) return socket.emit('error', { message: "Salon introuvable." });
      
      const isReturningPlayer = game.players.has(socket.id);

      if (!isReturningPlayer && game.settings.isPrivate && game.settings.password && game.settings.password !== password) {
          if (!password) return socket.emit('password_required', { roomId });
          return socket.emit('error', { message: "Mot de passe incorrect." });
      }
      
      if (game.players.size >= game.settings.maxPlayers && !isReturningPlayer) {
          return socket.emit('error', { message: "Le salon est complet." });
      }

      socket.join(game.id);
      
      const isHostRejoining = String(game.hostId) === String(socket.id);
      const startReady = isHostRejoining; 

      game.addPlayer(socket.id, username, avatar, startReady);

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

      logger.info(`Settings mis à jour pour ${game.id}`, 'Lobby');

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

    game.hostId = String(payload.targetId);
    (game.settings as any).hostName = targetPlayer.username; 
    (game.settings as any).hostAvatar = targetPlayer.avatar;
    
    targetPlayer.isReady = true;

    io.to(game.id).emit('update_players', { 
        players: getPlayersWithHost(game), 
        hostId: game.hostId,
        status: game.status 
    });
    io.to(payload.targetId).emit('host_promoted');
    broadcastRooms();
  };

  const handleLeave = (payload: { roomId: string }) => {
    const roomId = payload.roomId;
    const game = gameManager.getGame(roomId);
    if (!game) return;

    socket.leave(roomId);

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

    game.removePlayer(socket.id); 

    if (game.players.size === 0) {
        gameManager.removeGame(roomId);
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
          io.to(game.id).emit('update_players', { 
              players: getPlayersWithHost(game), 
              hostId: game.hostId,
              status: game.status
          });
      }
  };

  socket.on('lobby:create', createLobby);
  socket.on('lobby:join', joinLobby);
  socket.on('get_rooms', getRooms);
  socket.on('transfer_host', transferHost);
  socket.on('leave_room', handleLeave);
  socket.on('toggle_ready', toggleReady);
  socket.on('update_room_settings', updateRoomSettings);
  
  socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) { 
        if (roomId !== socket.id) handleLeave({ roomId }); 
      }
  });
};