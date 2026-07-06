import { customAlphabet } from 'nanoid';
import type { RoomListItem, RoomSettings } from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import type { TypedServer } from '../../core/socketTypes';
import { Room } from './engine/Room';

/** Grace period before an all-disconnected room is torn down. */
const CLEANUP_GRACE_MS = 30_000;

export class GameManager {
  private readonly rooms = new Map<string, Room>();
  private readonly cleanupTimers = new Map<string, NodeJS.Timeout>();
  private readonly io: TypedServer;
  private readonly generateId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

  constructor(io: TypedServer) {
    this.io = io;
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

  removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.dispose();
    this.rooms.delete(roomId);
    this.cancelCleanup(roomId);
    logger.info(`[GameManager] Room ${roomId} removed.`, 'GameManager');
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

  getRoomList(): RoomListItem[] {
    return [...this.rooms.values()].map((room) => ({
      id: room.id,
      name: room.settings.name,
      host: room.settings.hostName ?? '',
      hostAvatar: room.settings.hostAvatar ?? 'player1',
      mode: room.settings.gameType,
      players: room.players.size,
      maxPlayers: room.settings.maxPlayers,
      isPrivate: room.settings.isPrivate,
      status: room.status,
      settings: room.settings,
    }));
  }

  getStats() {
    const rooms = [...this.rooms.values()];
    return {
      activeRooms: rooms.length,
      activeMatches: rooms.filter((r) => r.status === 'playing').length,
      playersInRooms: rooms.reduce((sum, r) => sum + r.players.size, 0),
    };
  }
}
