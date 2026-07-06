import type { CreateLobbyInput, JoinLobbyInput } from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type { GameManager } from '../game/gameManager';
import { mergeRoomSettings, normalizeRoomSettings } from '../game/settings';
import { guard, requireAuth, RATE_LIMITS } from '../../core/guards';

export const registerLobbyHandlers = (
  io: TypedServer,
  socket: TypedSocket,
  gameManager: GameManager,
) => {
  const uid = (): string => socket.data.userId as string;
  const broadcastRooms = () => io.emit('rooms_update', gameManager.getRoomList());

  const createLobby = (payload: CreateLobbyInput) => {
    try {
      const username = payload.username || socket.data.username || 'Joueur';
      const avatar = payload.avatar || 'player1';
      const settings = normalizeRoomSettings(payload.settings, {
        roomName: payload.roomName,
        hostName: username,
        hostAvatar: avatar,
      });

      const room = gameManager.createRoom(uid(), settings);
      socket.join(room.id);
      room.addOrReconnect(uid(), username, avatar, socket.id, { asHost: true });

      logger.info(
        `[Lobby] Room ${room.id} created by "${username}". Songs: ${settings.soundCount}`,
        'Lobby',
      );

      socket.emit('lobby:joined', {
        roomId: room.id,
        userId: uid(),
        settings: room.settings,
        isHost: true,
        players: room.toPublicPlayers(),
        status: room.status,
      });
      broadcastRooms();
    } catch (error) {
      logger.error('Failed to create lobby', 'Lobby', error);
      socket.emit('error', { message: 'Impossible de créer le salon.' });
    }
  };

  const joinLobby = (payload: JoinLobbyInput) => {
    try {
      const { roomId, password } = payload;
      const username = payload.username || socket.data.username || 'Joueur';
      const avatar = payload.avatar || 'player1';
      const room = gameManager.getRoom(roomId);

      if (!room) {
        return socket.emit('error', { message: 'Salon introuvable.' });
      }

      const isReturning = room.players.has(uid());

      if (
        !isReturning &&
        room.settings.isPrivate &&
        room.settings.password &&
        room.settings.password !== password
      ) {
        if (!password) return socket.emit('password_required', { roomId });
        return socket.emit('error', { message: 'Mot de passe incorrect.' });
      }

      if (!isReturning && room.players.size >= room.settings.maxPlayers) {
        return socket.emit('error', { message: 'Le salon est complet.' });
      }

      socket.join(room.id);
      gameManager.cancelCleanup(room.id);
      room.addOrReconnect(uid(), username, avatar, socket.id, {
        asHost: uid() === room.hostId,
      });
      // Entering the lobby view means this player is no longer on the game-over
      // screen; clears their "in game" badge and can settle the room to waiting.
      room.markInLobby(uid());

      logger.info(
        `[Lobby] "${username}" joined room ${roomId} (${room.players.size}/${room.settings.maxPlayers}).`,
        'Lobby',
      );

      socket.emit('lobby:joined', {
        roomId: room.id,
        userId: uid(),
        settings: room.settings,
        isHost: uid() === room.hostId,
        players: room.toPublicPlayers(),
        status: room.status,
      });
      room.emitLobbyUpdate();
      broadcastRooms();
    } catch (error) {
      logger.error('Failed to join lobby', 'Lobby', error);
    }
  };

  const updateRoomSettings = (payload: { roomId: string; settings: unknown }) => {
    const room = gameManager.getRoom(payload.roomId);
    if (!room || uid() !== room.hostId) return;
    const next = mergeRoomSettings(room.settings, payload.settings);
    room.applySettings(uid(), next);
    logger.info(`[Lobby] Settings updated for room ${room.id}`, 'Lobby');
    broadcastRooms();
  };

  const transferHost = (payload: { roomId: string; targetId: string }) => {
    const room = gameManager.getRoom(payload.roomId);
    if (!room) return;
    if (room.transferHost(uid(), payload.targetId)) {
      logger.info(`[Lobby] Host transferred in room ${room.id}`, 'Lobby');
      broadcastRooms();
    }
  };

  const handleLeave = (payload: { roomId: string }) => {
    const room = gameManager.getRoom(payload.roomId);
    if (!room) return;
    const player = room.players.get(uid());
    socket.leave(payload.roomId);
    logger.info(`[Lobby] "${player?.username ?? uid()}" left room ${payload.roomId}.`, 'Lobby');

    const isEmpty = room.removePlayer(uid());
    if (isEmpty) {
      gameManager.removeRoom(payload.roomId);
    }
    broadcastRooms();
  };

  const getRooms = () => socket.emit('rooms_update', gameManager.getRoomList());

  const toggleReady = (payload: { roomId: string }) => {
    gameManager.getRoom(payload.roomId)?.toggleReady(uid());
  };

  socket.on('lobby:create', guard(socket, 'lobby:create', RATE_LIMITS.createLobby, createLobby));
  socket.on('lobby:join', requireAuth(socket, joinLobby));
  socket.on('get_rooms', getRooms);
  socket.on('transfer_host', requireAuth(socket, transferHost));
  socket.on('leave_room', requireAuth(socket, handleLeave));
  socket.on('toggle_ready', requireAuth(socket, toggleReady));
  socket.on('update_room_settings', requireAuth(socket, updateRoomSettings));

  // Reconnect-friendly disconnect: keep the player, tear down only after grace.
  socket.on('disconnect', () => {
    const room = gameManager.findRoomBySocket(socket.id);
    if (!room) return;
    room.markDisconnected(socket.id);
    if (!room.hasConnectedPlayers) {
      gameManager.scheduleCleanup(room.id);
    }
    broadcastRooms();
  });
};
