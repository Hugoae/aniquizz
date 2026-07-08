import { prisma } from '@aniquizz/database';
import type { CreateLobbyInput, JoinLobbyInput } from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type { GameManager } from '../game/gameManager';
import type { Room } from '../game/engine/Room';
import { mergeRoomSettings, normalizeRoomSettings } from '../game/settings';
import { getUserAnimeIds } from '../anilist/anilistService';
import { guard, requireAuth, RATE_LIMITS } from '../../core/guards';
import type { BotConfig } from '../game/engine/types';

/** Balanced default behaviour for lobby-spawned dev bots. */
const DEV_BOT_CONFIG: BotConfig = { accuracy: 0.7, minDelayMs: 2_000, maxDelayMs: 8_000 };

/**
 * Warm a player's AniList watched list while they sit in the lobby, so the
 * playlist build at match start reads it from cache instead of blocking on the
 * network (removes the "Watched" start-time spike). Resolves the AniList
 * username from the profile if needed and stores it on the player, then fetches
 * the list in the background and caches the ids on the player. Fire-and-forget.
 */
const warmWatchedList = async (room: Room, userId: string): Promise<void> => {
  if (room.settings.soundSelection !== 'watched') return;
  const player = room.players.get(userId);
  if (!player || player.isBot) return;

  let username = player.anilistUsername ?? null;
  if (!username) {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { anilistUsername: true },
    });
    username = profile?.anilistUsername ?? null;
    if (username) player.anilistUsername = username;
  }
  if (!username) return;

  try {
    const ids = await getUserAnimeIds(username);
    if (ids.length) room.setWatchedIds(userId, ids);
  } catch {
    // Non-fatal: the build will retry the (now-warm) cache at start time.
  }
};

/** Warm every human player's watched list (e.g. when a room switches to Watched). */
const warmWatchedListForRoom = (room: Room): void => {
  if (room.settings.soundSelection !== 'watched') return;
  for (const player of room.players.values()) {
    if (!player.isBot) void warmWatchedList(room, player.userId);
  }
};

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
      // Empty name → auto-assign the first free "Salon N" slot.
      const providedName = (payload.roomName ?? '').trim();
      const roomName = providedName || gameManager.nextDefaultRoomName();
      const settings = normalizeRoomSettings(payload.settings, {
        roomName,
        hostName: username,
        hostAvatar: avatar,
      });

      const room = gameManager.createRoom(uid(), settings);
      socket.join(room.id);
      room.addOrReconnect(uid(), username, avatar, socket.id, {
        asHost: true,
        role: socket.data.role,
        level: socket.data.level,
      });

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
      void warmWatchedList(room, uid());
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

      // Private rooms always require the password — even from a friend invite
      // (the invite is only a shortcut; `password_required` opens the prompt).
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
        role: socket.data.role,
        level: socket.data.level,
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
      void warmWatchedList(room, uid());
      broadcastRooms();
    } catch (error) {
      logger.error('Failed to join lobby', 'Lobby', error);
    }
  };

  const updateRoomSettings = (payload: { roomId: string; settings: unknown }) => {
    const room = gameManager.getRoom(payload.roomId);
    if (!room || uid() !== room.hostId) return;
    const next = mergeRoomSettings(room.settings, payload.settings);

    // Never shrink capacity below the players already in the room. Clamp up to
    // the current occupancy and tell the host why their choice was overridden.
    const occupancy = room.players.size;
    if (next.maxPlayers < occupancy) {
      next.maxPlayers = occupancy;
      socket.emit('error', {
        message: `Impossible de réduire à ce nombre : ${occupancy} joueur(s) déjà présent(s).`,
      });
    }

    const wasWatched = room.settings.soundSelection === 'watched';
    room.applySettings(uid(), next);
    // Newly switched to Watched → warm every player's list now, not at start.
    if (!wasWatched && next.soundSelection === 'watched') warmWatchedListForRoom(room);
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

  // Host removes another player. The host cannot kick themselves, and a match
  // in progress is left untouched (kick is a lobby-only control).
  const kickFromLobby = (payload: { roomId: string; targetId: string }) => {
    const room = gameManager.getRoom(payload.roomId);
    if (!room || uid() !== room.hostId) return;
    if (!payload.targetId || payload.targetId === room.hostId) return;
    if (room.status !== 'waiting') return;
    if (gameManager.kickPlayer(payload.roomId, payload.targetId, "Vous avez été exclu du salon par l'hôte.")) {
      logger.info(`[Lobby] Host kicked ${payload.targetId} from room ${room.id}`, 'Lobby');
      broadcastRooms();
    }
  };

  // DEV-only: host fills the lobby with simulated players. Gated to staff in
  // production so the event can never be abused from a shipped bundle.
  const addBotsFromLobby = (payload: { roomId: string; count: number }) => {
    const room = gameManager.getRoom(payload.roomId);
    if (!room || uid() !== room.hostId || room.status !== 'waiting') return;
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev && socket.data.role !== 'ADMIN') return;
    const count = Math.max(1, Math.min(Number(payload.count) || 1, room.settings.maxPlayers));
    const added = gameManager.addBotsToRoom(payload.roomId, count, DEV_BOT_CONFIG);
    if (added > 0) {
      logger.info(`[Lobby] ${added} bot(s) added to room ${room.id} by host`, 'Dev');
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
  socket.on('lobby:kick', requireAuth(socket, kickFromLobby));
  socket.on('dev:add_bots', requireAuth(socket, addBotsFromLobby));
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
