// apps/server/src/modules/friends/friendsPresence.ts
// Rich presence for friends, built on per-user Socket.io rooms + GameManager.
// Every authenticated socket joins `user:<userId>` (see SocketManager). Since a
// single active socket per user is enforced, a room holds 0 or 1 socket.

import { prisma } from '@aniquizz/database';
import type { GameManager } from '../game/gameManager';
import type { TypedServer } from '../../core/socketTypes';
import type { PresenceInfo } from './friendsService';

const PRESENCE_DEBOUNCE_MS = 400;

const pendingPresenceTimers = new Map<string, NodeJS.Timeout>();
const lastPresencePayloadKey = new Map<string, string>();

const presencePayloadKey = (pr: PresenceInfo): string =>
  `${pr.status}|${pr.roomId ?? ''}|${pr.roomName ?? ''}|${pr.joinable ?? false}`;

/** Skip re-emitting identical presence to friends (connect storms, duplicate lifecycle hooks). */
const shouldSkipPresenceBroadcast = (userId: string, pr: PresenceInfo): boolean => {
  if (pr.status === 'offline') {
    lastPresencePayloadKey.delete(userId);
    return false;
  }
  const key = presencePayloadKey(pr);
  if (lastPresencePayloadKey.get(userId) === key) return true;
  lastPresencePayloadKey.set(userId, key);
  return false;
};

/**
 * Debounced presence broadcast for high-frequency lifecycle events (lobby join,
 * game start, return to lobby). Connect/disconnect use `immediate: true`.
 */
export const schedulePresenceBroadcast = (
  io: TypedServer,
  gameManager: GameManager,
  userId: string,
  options: { immediate?: boolean } = {},
): void => {
  const run = () => {
    pendingPresenceTimers.delete(userId);
    void broadcastPresence(io, gameManager, userId);
  };

  if (options.immediate) {
    const pending = pendingPresenceTimers.get(userId);
    if (pending) {
      clearTimeout(pending);
      pendingPresenceTimers.delete(userId);
    }
    run();
    return;
  }

  const pending = pendingPresenceTimers.get(userId);
  if (pending) clearTimeout(pending);
  pendingPresenceTimers.set(userId, setTimeout(run, PRESENCE_DEBOUNCE_MS));
};

export const userRoom = (userId: string): string => `user:${userId}`;

/** Whether the user currently has a live socket. */
export const isUserOnline = (io: TypedServer, userId: string): boolean =>
  (io.sockets.adapter.rooms.get(userRoom(userId))?.size ?? 0) > 0;

/** Full presence for a user: offline if no socket, else derived from GameManager. */
export const resolvePresence = (
  io: TypedServer,
  gameManager: GameManager,
  userId: string,
): PresenceInfo => {
  if (!isUserOnline(io, userId)) return { status: 'offline' };
  return gameManager.getUserPresence(userId);
};

/** Curried resolver bound to a server + manager, passed into friendsService. */
export const presenceResolver =
  (io: TypedServer, gameManager: GameManager) =>
  (userId: string): PresenceInfo =>
    resolvePresence(io, gameManager, userId);

/** Ids of a user's accepted friends. */
const acceptedFriendIds = async (userId: string): Promise<string[]> => {
  const rows = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
};

/**
 * Notify a user's currently-online friends that their presence changed.
 * Best-effort: presence is a nicety, never blocks the socket lifecycle.
 */
export const broadcastPresence = async (
  io: TypedServer,
  gameManager: GameManager,
  userId: string,
): Promise<void> => {
  try {
    const pr = resolvePresence(io, gameManager, userId);
    if (shouldSkipPresenceBroadcast(userId, pr)) return;
    const lastSeenAt = new Date().toISOString();
    const friendIds = await acceptedFriendIds(userId);
    for (const friendId of friendIds) {
      if (isUserOnline(io, friendId)) {
        io.to(userRoom(friendId)).emit('friends:presence', {
          userId,
          status: pr.status,
          lastSeenAt,
          roomId: pr.roomId ?? null,
          roomName: pr.roomName ?? null,
          joinable: pr.joinable ?? false,
        });
      }
    }
  } catch {
    /* presence is best-effort */
  }
};
