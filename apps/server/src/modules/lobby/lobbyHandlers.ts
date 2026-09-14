import { prisma } from '@aniquizz/database';
import type { RoomSettings } from '@aniquizz/shared';
import {
  canKickFromLobby,
  createLobbyInputSchema,
  evaluateLobbyJoin,
  hasWatchedListLink,
  joinLobbyInputSchema,
  lobbyTargetInputSchema,
  resolveActiveListProvider,
  roomIdInputSchema,
  toClientRoomSettings,
  updateRoomSettingsInputSchema,
  type LobbyJoinRejectReason,
} from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type { GameManager } from '../game/gameManager';
import type { Room } from '../game/engine/Room';
import { mergeRoomSettings, normalizeRoomSettings } from '../game/settings';
import { assertPublishedPlaylistSource } from '../game/playlistRecipeService';
import { resolvePlayerCatalogueIds } from '../lists/listResolver';
import { guard, requireAuth, RATE_LIMITS } from '../../core/guards';
import { parseSocketPayload } from '../../core/parseSocketPayload';
import { resolveLobbyUsername } from '../../core/displayUsername';
import type { BotConfig } from '../game/engine/types';
import { LOBBY_LIST_ROOM } from './lobbyRooms';

/** Balanced default behaviour for lobby-spawned dev bots. */
const DEV_BOT_CONFIG: BotConfig = { accuracy: 0.7, minDelayMs: 2_000, maxDelayMs: 8_000 };

const JOIN_ERROR_MESSAGE: Record<Exclude<LobbyJoinRejectReason, 'password-required'>, string> = {
  'not-found': 'Salon introuvable.',
  'bad-password': 'Mot de passe incorrect.',
  full: 'Le salon est complet.',
  'in-progress': 'La partie est déjà en cours.',
};

/** Watched source, or a thematic pack with the Watched overlay. */
const roomUsesWatchedPool = (room: Room): boolean =>
  room.settings.soundSelection === 'watched' ||
  (room.settings.soundSelection === 'playlist' && Boolean(room.settings.playlistWatched));

/**
 * Warm a player's watched list (AniList or MAL) while they sit in the lobby so
 * match-start playlist build hits the in-memory cache. Fire-and-forget.
 */
const warmWatchedList = async (room: Room, userId: string): Promise<void> => {
  if (!roomUsesWatchedPool(room)) return;
  const player = room.players.get(userId);
  if (!player || player.isBot) return;

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { anilistUsername: true, malUsername: true, activeListProvider: true },
  });
  if (!profile || !hasWatchedListLink(profile)) return;

  if (profile.anilistUsername) player.anilistUsername = profile.anilistUsername;
  if (profile.malUsername) player.malUsername = profile.malUsername;
  player.activeListProvider = resolveActiveListProvider(profile);

  try {
    await resolvePlayerCatalogueIds(userId, profile);
  } catch {
    // Non-fatal: playlist build will retry at start time.
  }
};

/** Warm every human player's watched list (e.g. when a room switches to Watched). */
const warmWatchedListForRoom = (room: Room): void => {
  if (!roomUsesWatchedPool(room)) return;
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
  const broadcastRooms = () => gameManager.broadcastRoomList();

  const createLobby = async (payload: unknown) => {
    const parsed = parseSocketPayload(socket, createLobbyInputSchema, payload);
    if (!parsed) return;
    try {
      const username = resolveLobbyUsername(
        socket.data.isAuthenticated,
        socket.data.username,
        parsed.username,
      );
      const avatar = parsed.avatar || 'player1';
      // Empty name → auto-assign the first free "Salon N" slot.
      const providedName = (parsed.roomName ?? '').trim();
      const roomName = providedName || gameManager.nextDefaultRoomName();
      const settings = normalizeRoomSettings(parsed.settings, {
        roomName,
        hostName: username,
        hostAvatar: avatar,
      });
      const sourceCheck = await assertPublishedPlaylistSource(settings);
      if (!sourceCheck.ok) {
        socket.emit('error', { message: sourceCheck.reason });
        return;
      }

      const room = gameManager.createRoom(uid(), settings);
      void socket.join(room.id);
      room.addOrReconnect(uid(), username, avatar, socket.id, {
        asHost: true,
        role: socket.data.role,
        level: socket.data.level,
        anilistUsername: socket.data.anilistUsername,
        malUsername: socket.data.malUsername,
        activeListProvider: socket.data.activeListProvider,
      });

      logger.info(
        `[Lobby] Room ${room.id} created by "${username}". Songs: ${settings.soundCount}`,
        'Lobby',
      );

      socket.emit('lobby:joined', {
        roomId: room.id,
        userId: uid(),
        settings: toClientRoomSettings(room.settings, { includePassword: true }),
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

  const joinLobby = (payload: unknown) => {
    const parsed = parseSocketPayload(socket, joinLobbyInputSchema, payload);
    if (!parsed) return;
    try {
      const { roomId, password } = parsed;
      const username = resolveLobbyUsername(
        socket.data.isAuthenticated,
        socket.data.username,
        parsed.username,
      );
      const avatar = parsed.avatar || 'player1';
      const room = gameManager.getRoom(roomId);
      const decision = evaluateLobbyJoin({
        roomFound: Boolean(room),
        isReturning: Boolean(room?.players.has(uid())),
        isPrivate: Boolean(room?.settings.isPrivate),
        storedPassword: room?.settings.password ?? '',
        providedPassword: password,
        playerCount: room?.players.size ?? 0,
        maxPlayers: room?.settings.maxPlayers ?? 0,
        status: room?.status ?? 'waiting',
      });
      if (!decision.ok) {
        if (decision.reason === 'password-required') {
          return socket.emit('password_required', { roomId });
        }
        return socket.emit('error', { message: JOIN_ERROR_MESSAGE[decision.reason] });
      }
      if (!room) return;
      void socket.join(room.id);
      gameManager.cancelCleanup(room.id);
      room.addOrReconnect(uid(), username, avatar, socket.id, {
        asHost: uid() === room.hostId,
        role: socket.data.role,
        level: socket.data.level,
        anilistUsername: socket.data.anilistUsername,
        malUsername: socket.data.malUsername,
        activeListProvider: socket.data.activeListProvider,
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
        settings: toClientRoomSettings(room.settings, { includePassword: uid() === room.hostId }),
        isHost: uid() === room.hostId,
        players: room.toPublicPlayers(),
        status: room.status,
      });
      room.emitLobbyUpdate();
      void warmWatchedList(room, uid());
      broadcastRooms();
    } catch (error) {
      logger.error('Failed to join lobby', 'Lobby', error);
      socket.emit('error', { message: 'Impossible de rejoindre le salon.' });
    }
  };

  const updateRoomSettings = async (payload: { roomId: string; settings: unknown }) => {
    const parsed = parseSocketPayload(socket, updateRoomSettingsInputSchema, payload);
    if (!parsed) return;
    const room = gameManager.getRoom(parsed.roomId);
    if (!room || uid() !== room.hostId) return;
    let next: RoomSettings;
    try {
      next = mergeRoomSettings(room.settings, parsed.settings);
    } catch {
      socket.emit('error', { message: 'Paramètres invalides.' });
      return;
    }

    // Never shrink capacity below the players already in the room. Clamp up to
    // the current occupancy and tell the host why their choice was overridden.
    const occupancy = room.players.size;
    if (next.maxPlayers < occupancy) {
      next.maxPlayers = occupancy;
      socket.emit('error', {
        message: `Impossible de réduire à ce nombre : ${occupancy} joueur(s) déjà présent(s).`,
      });
    }

    const sourceCheck = await assertPublishedPlaylistSource(next);
    if (!sourceCheck.ok) {
      socket.emit('error', { message: sourceCheck.reason });
      return;
    }

    const wasWatchedPool = roomUsesWatchedPool(room);
    if (!room.applySettings(uid(), next)) {
      socket.emit('error', {
        message: 'Impossible de modifier les paramètres pendant le lancement.',
      });
      return;
    }
    // Newly switched to Watched (or playlist overlay) → warm lists now, not at start.
    if (!wasWatchedPool && roomUsesWatchedPool(room)) warmWatchedListForRoom(room);
    logger.info(`[Lobby] Settings updated for room ${room.id}`, 'Lobby');
    broadcastRooms();
  };

  const transferHost = (payload: unknown) => {
    const parsed = parseSocketPayload(socket, lobbyTargetInputSchema, payload);
    if (!parsed) return;
    const room = gameManager.getRoom(parsed.roomId);
    if (!room) return;
    if (room.transferHost(uid(), parsed.targetId)) {
      logger.info(`[Lobby] Host transferred in room ${room.id}`, 'Lobby');
      broadcastRooms();
    }
  };

  // Host removes another player. The host cannot kick themselves, and a match
  // in progress is left untouched (kick is a lobby-only control).
  const kickFromLobby = (payload: unknown) => {
    const parsed = parseSocketPayload(socket, lobbyTargetInputSchema, payload);
    if (!parsed) return;
    const room = gameManager.getRoom(parsed.roomId);
    if (!room) return;
    if (
      !canKickFromLobby({
        actorIsHost: uid() === room.hostId,
        hostId: room.hostId,
        targetId: parsed.targetId,
        status: room.status,
      })
    ) {
      return;
    }
    if (
      gameManager.kickPlayer(
        parsed.roomId,
        parsed.targetId,
        "Vous avez été exclu du salon par l'hôte.",
      )
    ) {
      logger.info(`[Lobby] Host kicked ${parsed.targetId} from room ${room.id}`, 'Lobby');
      broadcastRooms();
    }
  };

  // Host fills the lobby with simulated players. DEV: any host; production: ADMIN only.
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

  const handleLeave = (payload: unknown) => {
    const parsed = parseSocketPayload(socket, roomIdInputSchema, payload);
    if (!parsed) return;
    const room = gameManager.getRoom(parsed.roomId);
    if (!room) return;
    const player = room.players.get(uid());
    void socket.leave(parsed.roomId);
    logger.info(`[Lobby] "${player?.username ?? uid()}" left room ${parsed.roomId}.`, 'Lobby');

    const isEmpty = room.removePlayer(uid());
    if (isEmpty) {
      gameManager.removeRoom(parsed.roomId);
    }
    broadcastRooms();
  };

  const getRooms = () => {
    void socket.join(LOBBY_LIST_ROOM);
    gameManager.sendRoomListTo(socket.id);
  };

  const subscribeRoomList = () => {
    void socket.join(LOBBY_LIST_ROOM);
    gameManager.sendRoomListTo(socket.id);
  };

  const unsubscribeRoomList = () => {
    void socket.leave(LOBBY_LIST_ROOM);
  };

  const toggleReady = (payload: unknown) => {
    const parsed = parseSocketPayload(socket, roomIdInputSchema, payload);
    if (!parsed) return;
    gameManager.getRoom(parsed.roomId)?.toggleReady(uid());
  };

  socket.on('lobby:create', guard(socket, 'lobby:create', RATE_LIMITS.createLobby, createLobby));
  socket.on(
    'lobby:join',
    guard(socket, 'lobby:join', RATE_LIMITS.joinLobby, joinLobby, { byIp: true }),
  );
  socket.on('get_rooms', requireAuth(socket, getRooms));
  socket.on('lobby:subscribe_list', requireAuth(socket, subscribeRoomList));
  socket.on('lobby:unsubscribe_list', unsubscribeRoomList);
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
