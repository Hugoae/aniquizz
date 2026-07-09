import { customAlphabet } from 'nanoid';
import type { RoomListItem, RoomListSettingsSummary, RoomSettings } from '@aniquizz/shared';
import { BOT_PROFILES } from '@aniquizz/database';
import { logger } from '../../utils/logger';
import type { TypedServer } from '../../core/socketTypes';
import { LOBBY_LIST_ROOM } from '../lobby/lobbyRooms';
import { Room } from './engine/Room';
import type { BotConfig } from './engine/types';
import { normalizeRoomSettings } from './settings';

/** Detailed live-room projection for the admin panel. */
export interface AdminRoomProgress {
  currentRound: number;
  totalRounds: number;
  phase: 'intro' | 'ready' | 'guessing' | 'reveal' | null;
  anime: string | null;
  title: string | null;
  endsAt: number | null;
}

export interface AdminRoomSettings {
  mode: string;
  gameType: string;
  responseType: string;
  soundCount: number;
  soundTypes: string[];
  difficulty: string[];
  guessDuration: number;
  soundSelection: string;
}

export interface AdminRoomDetail {
  id: string;
  name: string;
  hostId: string;
  status: string;
  isPrivate: boolean;
  /** Plaintext lobby password (admin-only, for support). Empty if public. */
  password: string;
  maxPlayers: number;
  playerCount: number;
  humanCount: number;
  createdAt: string;
  settings: AdminRoomSettings;
  progress: AdminRoomProgress | null;
  players: {
    userId: string;
    username: string;
    avatar: string;
    isHost: boolean;
    isBot: boolean;
    isConnected: boolean;
    score: number;
  }[];
}

/** Grace period before an all-disconnected room is torn down. */
const CLEANUP_GRACE_MS = 15_000;
/** Trailing debounce for public room-list broadcasts. */
const ROOM_LIST_BROADCAST_MS = 150;

const toRoomListSettings = (settings: RoomSettings): RoomListSettingsSummary => ({
  soundCount: settings.soundCount,
  difficulty: settings.difficulty,
  guessDuration: settings.guessDuration,
  precision: settings.precision,
  responseType: settings.responseType,
  soundSelection: settings.soundSelection,
});

// --- IDLE / STALE ROOM POLICY ---------------------------------------------
/** How often the idle-room sweep runs. */
const SWEEP_INTERVAL_MS = 60_000;
/** A `waiting` lobby with no activity for this long is closed. */
const LOBBY_IDLE_MS = 30 * 60_000;
/** A match paused longer than this is auto-cancelled back to the lobby. */
const PAUSE_MAX_MS = 15 * 60_000;
/** A `playing` match with no round progress for this long is force-cancelled (frozen-match watchdog). */
const MATCH_STALE_MS = 5 * 60_000;

export class GameManager {
  private readonly rooms = new Map<string, Room>();
  private readonly cleanupTimers = new Map<string, NodeJS.Timeout>();
  private readonly io: TypedServer;
  private readonly generateId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);
  private roomListBroadcastTimer: NodeJS.Timeout | null = null;

  private readonly sweepTimer: NodeJS.Timeout;

  constructor(io: TypedServer) {
    this.io = io;
    // Periodic housekeeping for rooms that stay alive with connected players
    // (the disconnect grace-period only covers fully-empty rooms). unref() so
    // the timer never keeps the process alive on shutdown.
    this.sweepTimer = setInterval(() => this.sweepIdleRooms(), SWEEP_INTERVAL_MS);
    this.sweepTimer.unref?.();
  }

  /**
   * Reclaim resources from rooms that are idle or stuck:
   *  - a `waiting` lobby untouched for LOBBY_IDLE_MS is closed;
   *  - a match paused longer than PAUSE_MAX_MS is cancelled back to the lobby;
   *  - a `playing` match with no progress for MATCH_STALE_MS is force-cancelled.
   */
  private sweepIdleRooms(): void {
    const now = Date.now();
    for (const room of [...this.rooms.values()]) {
      if (room.status === 'paused') {
        const pausedMs = room.pausedForMs;
        if (pausedMs !== null && pausedMs > PAUSE_MAX_MS) {
          logger.info(`[GameManager] Room ${room.id} cancelled: paused ${Math.round(pausedMs / 60_000)}min.`, 'GameManager');
          room.forceCancel('Partie annulée : en pause depuis trop longtemps.');
        }
        continue;
      }

      if (room.status === 'playing' && now - room.lastActivityAt > MATCH_STALE_MS) {
        logger.warn(`[GameManager] Room ${room.id} force-cancelled: match stalled (no progress).`, 'GameManager');
        room.forceCancel('Partie interrompue : aucune activité détectée.');
        continue;
      }

      if (room.status === 'waiting' && now - room.lastActivityAt > LOBBY_IDLE_MS) {
        logger.info(`[GameManager] Room ${room.id} closed: idle lobby.`, 'GameManager');
        this.io.to(room.id).emit('room_closed', { reason: 'Salon fermé pour cause d\'inactivité.' });
        this.removeRoom(room.id);
      }
    }
  }

  createRoom(hostId: string, settings: RoomSettings): Room {
    const roomId = this.generateId();
    const room = new Room(roomId, this.io, hostId, settings);
    this.rooms.set(roomId, room);
    logger.info(`[GameManager] New room ${roomId} (host ${hostId}).`, 'GameManager');
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Default room name for a lobby created without one: "Salon N", where N is the
   * lowest positive integer not currently used by another "Salon N" room (so
   * closed rooms free their number back up).
   */
  nextDefaultRoomName(): string {
    const used = new Set<number>();
    for (const room of this.rooms.values()) {
      const match = /^Salon (\d+)$/.exec(room.settings.name ?? '');
      if (match) used.add(parseInt(match[1], 10));
    }
    let n = 1;
    while (used.has(n)) n += 1;
    return `Salon ${n}`;
  }

  removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.dispose();
    this.rooms.delete(roomId);
    this.cancelCleanup(roomId);
    logger.info(`[GameManager] Room ${roomId} removed.`, 'GameManager');
    this.broadcastRoomList();
  }

  findRoomBySocket(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.getPlayerBySocket(socketId)) return room;
    }
    return undefined;
  }

  /** Schedule teardown if a room stays empty of connected players. */
  scheduleCleanup(roomId: string): void {
    if (this.cleanupTimers.has(roomId)) return;
    const timer = setTimeout(() => {
      this.cleanupTimers.delete(roomId);
      const room = this.rooms.get(roomId);
      if (room && !room.hasConnectedPlayers) {
        this.removeRoom(roomId);
      }
    }, CLEANUP_GRACE_MS);
    this.cleanupTimers.set(roomId, timer);
  }

  cancelCleanup(roomId: string): void {
    const timer = this.cleanupTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(roomId);
    }
  }

  /**
   * Count connected human players currently in a multiplayer room (lobby or
   * running match). Solo rooms (maxPlayers === 1) and bots are excluded.
   */
  countMultiplayerPlayers(): number {
    let total = 0;
    for (const room of this.rooms.values()) {
      if (room.settings.maxPlayers <= 1) continue;
      for (const p of room.players.values()) {
        if (!p.isBot && p.isConnected) total += 1;
      }
    }
    return total;
  }

  getRoomList(): RoomListItem[] {
    return [...this.rooms.values()]
      .filter((room) => room.settings.maxPlayers > 1)
      .map((room) => ({
      id: room.id,
      name: room.settings.name,
      host: room.settings.hostName ?? '',
      hostAvatar: room.settings.hostAvatar ?? 'player1',
      mode: room.settings.gameType,
      players: room.players.size,
      maxPlayers: room.settings.maxPlayers,
      isPrivate: room.settings.isPrivate,
      status: room.status,
      settings: toRoomListSettings(room.settings),
    }));
  }

  /** Push the public room list to lobby browsers (debounced, targeted fan-out). */
  broadcastRoomList(): void {
    if (this.roomListBroadcastTimer) {
      clearTimeout(this.roomListBroadcastTimer);
    }
    this.roomListBroadcastTimer = setTimeout(() => {
      this.roomListBroadcastTimer = null;
      this.io.to(LOBBY_LIST_ROOM).emit('rooms_update', this.getRoomList());
    }, ROOM_LIST_BROADCAST_MS);
    this.roomListBroadcastTimer.unref?.();
  }

  /** Immediate snapshot for a socket that just subscribed or called get_rooms. */
  sendRoomListTo(socketId: string): void {
    this.io.to(socketId).emit('rooms_update', this.getRoomList());
  }

  getStats() {
    const rooms = [...this.rooms.values()];
    return {
      activeRooms: rooms.length,
      activeMatches: rooms.filter((r) => r.status === 'playing').length,
      playersInRooms: rooms.reduce((sum, r) => sum + r.players.size, 0),
    };
  }

  /** Live breakdown of rooms/players for the admin stats panel. */
  getLiveRoomStats() {
    const rooms = [...this.rooms.values()];
    let humansInRooms = 0;
    let botsInRooms = 0;
    let roomsPublic = 0;
    let roomsPrivate = 0;
    let roomsWaiting = 0;
    let roomsPlaying = 0;
    let roomsPaused = 0;
    for (const r of rooms) {
      for (const p of r.players.values()) {
        if (p.isBot) botsInRooms += 1;
        else humansInRooms += 1;
      }
      if (r.settings.isPrivate) roomsPrivate += 1;
      else roomsPublic += 1;
      if (r.status === 'waiting') roomsWaiting += 1;
      else if (r.status === 'playing') roomsPlaying += 1;
      else if (r.status === 'paused') roomsPaused += 1;
    }
    return {
      humansInRooms,
      botsInRooms,
      roomsPublic,
      roomsPrivate,
      roomsWaiting,
      roomsPlaying,
      roomsPaused,
    };
  }

  /** User ids currently inside a running match (playing or paused). */
  getInGameUserIds(): Set<string> {
    const ids = new Set<string>();
    for (const room of this.rooms.values()) {
      if (room.status !== 'playing' && room.status !== 'paused') continue;
      for (const p of room.players.values()) {
        if (!p.isBot) ids.add(p.userId);
      }
    }
    return ids;
  }

  /**
   * Rich presence for a single user derived from live rooms:
   * - in a running match → `in_game`
   * - in a waiting room → `in_lobby` (+ `joinable` if not full)
   * - not in any room → `online`
   * Caller decides `offline` (no live socket).
   */
  getUserPresence(userId: string): {
    status: 'online' | 'in_lobby' | 'in_game';
    roomId?: string;
    roomName?: string;
    joinable?: boolean;
  } {
    for (const room of this.rooms.values()) {
      for (const p of room.players.values()) {
        if (p.isBot || p.userId !== userId) continue;
        const inGame = room.status === 'playing' || room.status === 'paused';
        return {
          status: inGame ? 'in_game' : 'in_lobby',
          roomId: room.id,
          roomName: room.settings.name,
          joinable: room.status === 'waiting' && room.players.size < room.settings.maxPlayers,
        };
      }
    }
    return { status: 'online' };
  }

  /** Map of userId → the room they currently belong to (lobby or match). */
  getUserRoomMap(): Map<string, { id: string; name: string }> {
    const map = new Map<string, { id: string; name: string }>();
    for (const room of this.rooms.values()) {
      for (const p of room.players.values()) {
        if (!p.isBot) map.set(p.userId, { id: room.id, name: room.settings.name });
      }
    }
    return map;
  }

  // --- ADMIN / LIVE OPS -----------------------------------------------------

  /** Detailed live-room snapshot for the admin panel. */
  getRoomDetails(): AdminRoomDetail[] {
    return [...this.rooms.values()].map((room) => ({
      id: room.id,
      name: room.settings.name,
      hostId: room.hostId,
      status: room.status,
      isPrivate: room.settings.isPrivate,
      password: room.settings.isPrivate ? room.settings.password ?? '' : '',
      maxPlayers: room.settings.maxPlayers,
      playerCount: room.players.size,
      humanCount: room.humanCount,
      createdAt: room.createdAt.toISOString(),
      settings: {
        mode: room.settings.mode,
        gameType: room.settings.gameType,
        responseType: room.settings.responseType,
        soundCount: room.settings.soundCount,
        soundTypes: room.settings.soundTypes,
        difficulty: room.settings.difficulty,
        guessDuration: room.settings.guessDuration,
        soundSelection: room.settings.soundSelection,
      },
      progress: room.getAdminProgress(),
      players: [...room.players.values()].map((p) => ({
        userId: p.userId,
        username: p.username,
        avatar: p.avatar,
        isHost: p.userId === room.hostId,
        isBot: p.isBot === true,
        isConnected: p.isConnected,
        score: p.score,
      })),
    }));
  }

  /** Force-end a running match, returning the room to its lobby. */
  forceEndMatch(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    room.forceCancel('Partie terminée par un administrateur.');
    return true;
  }

  /** Close a room entirely: notify members, then tear it down. */
  closeRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    // Both lobby and in-game clients handle room_closed (the latter navigates
    // out); removeRoom disposes the running engine, so no separate cancel needed.
    this.io.to(roomId).emit('room_closed', { reason: 'Salon fermé par un administrateur.' });
    this.removeRoom(roomId);
    return true;
  }

  /** Kick a player from a room (admin or host). Bots are removed silently. */
  kickPlayer(
    roomId: string,
    userId: string,
    reason = 'Vous avez été expulsé du salon par un administrateur.',
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const socketId = room.kickPlayer(userId);
    if (socketId) {
      this.io.to(socketId).emit('room_closed', { reason });
      this.io.in(socketId).socketsLeave(roomId);
    }
    if (room.humanCount === 0) this.removeRoom(roomId);
    return true;
  }

  // --- DEV TOOLING (bots / scenarios) ---------------------------------------

  /** DEV-only: add up to `count` bots to a room. Returns the number added. */
  addBotsToRoom(roomId: string, count: number, config: BotConfig): number {
    const room = this.rooms.get(roomId);
    if (!room) return 0;
    let added = 0;
    for (let i = 0; i < count; i++) {
      if (!room.addBot(config)) break;
      added++;
    }
    return added;
  }

  /**
   * DEV-only: spin up a headless room populated entirely with bots and
   * (optionally) start the match immediately. Useful to exercise the full
   * engine + persistence pipeline without any human players.
   */
  async createBotScenario(opts: {
    botCount: number;
    autoStart: boolean;
    settings?: Partial<RoomSettings>;
    config: BotConfig;
    /** When set, the room is hosted by this human user (who will join & watch). */
    host?: { userId: string; username: string; avatar?: string };
  }): Promise<{ roomId: string; botsAdded: number }> {
    const hostBot = BOT_PROFILES[0];
    const humanHost = opts.host;

    // Hosted scenario leaves a seat for the human; headless is bots-only.
    const maxPlayers = humanHost
      ? Math.min(opts.botCount + 1, BOT_PROFILES.length + 1)
      : Math.min(Math.max(opts.botCount, 2), BOT_PROFILES.length);

    const settings = normalizeRoomSettings(
      { ...opts.settings, maxPlayers },
      {
        roomName: humanHost ? `Scénario de ${humanHost.username}` : 'Scénario bots',
        hostName: humanHost?.username ?? hostBot.username,
        hostAvatar: humanHost?.avatar ?? hostBot.avatar,
      },
    );

    const room = this.createRoom(humanHost ? humanHost.userId : hostBot.id, settings);
    const botsAdded = this.addBotsToRoom(room.id, opts.botCount, opts.config);

    // Only auto-start headless scenarios; a human host starts their own match.
    if (opts.autoStart && !humanHost && botsAdded > 0) {
      await room.startMatch();
    }
    return { roomId: room.id, botsAdded };
  }

  /** Remove up to `count` bots (most recently added first) from a room. */
  removeBotsFromRoom(roomId: string, count?: number): number {
    const room = this.rooms.get(roomId);
    if (!room) return 0;
    const botIds = [...room.players.values()].filter((p) => p.isBot).map((p) => p.userId);
    const targets = typeof count === 'number' ? botIds.slice(-count) : botIds;
    let removed = 0;
    for (const id of targets) {
      const wasEmpty = room.removePlayer(id);
      removed += 1;
      if (wasEmpty) {
        this.removeRoom(roomId);
        break;
      }
    }
    this.broadcastRoomList();
    return removed;
  }
}
