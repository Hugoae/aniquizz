// apps/server/src/modules/friends/friendsService.ts
// Friendship persistence + validation. Pure DB logic — no socket concerns.
// Identity is always the JWT userId (never socket.id). Presence (online / in a
// lobby / in a match) is injected via a resolver so this stays framework-free.

import { prisma } from '@aniquizz/database';
import type {
  FriendsState,
  FriendSummary,
  FriendRequest,
  PresenceStatus,
  RecentPlayer,
} from '@aniquizz/shared';

const PROFILE_SELECT = {
  id: true,
  username: true,
  avatar: true,
  level: true,
  lastSeenAt: true,
} as const;

interface ProfileLite {
  id: string;
  username: string;
  avatar: string;
  level: number;
  lastSeenAt: Date | null;
}

/** Live presence for a user, resolved from socket rooms + GameManager. */
export interface PresenceInfo {
  status: PresenceStatus;
  roomId?: string | null;
  roomName?: string | null;
  joinable?: boolean;
}

/** Injected presence lookup (see friendsPresence.resolvePresence). */
export type ResolvePresence = (userId: string) => PresenceInfo;

/** User-facing (French) validation error surfaced to the client as `friends:error`. */
export class FriendServiceError extends Error {}

const toSummary = (p: ProfileLite, presence: ResolvePresence): FriendSummary => {
  const pr = presence(p.id);
  return {
    id: p.id,
    username: p.username,
    avatar: p.avatar,
    level: p.level,
    status: pr.status,
    lastSeenAt: p.lastSeenAt ? p.lastSeenAt.toISOString() : null,
    roomId: pr.roomId ?? null,
    roomName: pr.roomName ?? null,
    joinable: pr.joinable ?? false,
  };
};

const statusRank = (s: PresenceStatus): number =>
  s === 'in_game' ? 0 : s === 'in_lobby' ? 1 : s === 'online' ? 2 : 3;

const getState = async (userId: string, presence: ResolvePresence): Promise<FriendsState> => {
  const [rows, me] = await Promise.all([
    prisma.friendship.findMany({
      where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: { requester: { select: PROFILE_SELECT }, addressee: { select: PROFILE_SELECT } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.profile.findUnique({ where: { id: userId }, select: { allowFriendRequests: true } }),
  ]);

  const friends: FriendSummary[] = [];
  const incoming: FriendRequest[] = [];
  const outgoing: FriendRequest[] = [];
  const blocked: FriendSummary[] = [];

  for (const r of rows) {
    const other = r.requesterId === userId ? r.addressee : r.requester;
    if (r.status === 'ACCEPTED') {
      friends.push(toSummary(other, presence));
    } else if (r.status === 'PENDING') {
      const req: FriendRequest = {
        id: r.id,
        user: toSummary(other, presence),
        createdAt: r.createdAt.toISOString(),
      };
      if (r.addresseeId === userId) incoming.push(req);
      else outgoing.push(req);
    } else if (r.status === 'BLOCKED' && r.requesterId === userId) {
      // Only surface blocks *I* created; blocks against me stay hidden.
      blocked.push(toSummary(other, presence));
    }
  }

  // Most-active presence first, then alphabetical.
  friends.sort(
    (a, b) => statusRank(a.status) - statusRank(b.status) || a.username.localeCompare(b.username),
  );

  return { friends, incoming, outgoing, blocked, allowFriendRequests: me?.allowFriendRequests ?? true };
};

interface RequestOutcome {
  /** 'created' = a new pending request; 'accepted' = a mutual request auto-accepted. */
  type: 'created' | 'accepted';
  /** The target profile. */
  other: ProfileLite;
  /** The requesting profile (for the request_received toast). */
  requester: ProfileLite;
}

/** Resolve a target profile from either an exact username or a userId. */
const resolveTarget = async (input: { username?: string; userId?: string }): Promise<ProfileLite> => {
  if (input.userId) {
    const byId = await prisma.profile.findUnique({ where: { id: input.userId }, select: PROFILE_SELECT });
    if (!byId) throw new FriendServiceError('Utilisateur introuvable.');
    return byId;
  }
  const username = (input.username ?? '').trim();
  if (!username) throw new FriendServiceError('Pseudo requis.');
  const byName = await prisma.profile.findUnique({ where: { username }, select: PROFILE_SELECT });
  if (!byName) throw new FriendServiceError('Utilisateur introuvable.');
  return byName;
};

const sendRequest = async (
  requesterId: string,
  input: { username?: string; userId?: string },
): Promise<RequestOutcome> => {
  const target = await resolveTarget(input);
  if (target.id === requesterId) {
    throw new FriendServiceError('Vous ne pouvez pas vous ajouter vous-même.');
  }

  const [requester, targetPrivacy] = await Promise.all([
    prisma.profile.findUnique({ where: { id: requesterId }, select: PROFILE_SELECT }),
    prisma.profile.findUnique({ where: { id: target.id }, select: { allowFriendRequests: true } }),
  ]);
  if (!requester) throw new FriendServiceError('Profil introuvable.');

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: requesterId },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') throw new FriendServiceError('Vous êtes déjà amis.');
    if (existing.status === 'BLOCKED') {
      if (existing.requesterId === requesterId) {
        throw new FriendServiceError("Vous avez bloqué cet utilisateur. Débloquez-le d'abord.");
      }
      throw new FriendServiceError('Action impossible.');
    }
    // PENDING:
    if (existing.requesterId === requesterId) throw new FriendServiceError('Demande déjà envoyée.');
    // The target already sent us a request → accept it (mutual add).
    await prisma.friendship.update({ where: { id: existing.id }, data: { status: 'ACCEPTED' } });
    return { type: 'accepted', other: target, requester };
  }

  if (targetPrivacy && targetPrivacy.allowFriendRequests === false) {
    throw new FriendServiceError("Cet utilisateur n'accepte pas les demandes d'amis.");
  }

  await prisma.friendship.create({ data: { requesterId, addresseeId: target.id } });
  return { type: 'created', other: target, requester };
};

const acceptRequest = async (userId: string, requestId: string): Promise<{ otherId: string }> => {
  const fr = await prisma.friendship.findUnique({ where: { id: requestId } });
  if (!fr || fr.addresseeId !== userId || fr.status !== 'PENDING') {
    throw new FriendServiceError('Demande introuvable.');
  }
  await prisma.friendship.update({ where: { id: requestId }, data: { status: 'ACCEPTED' } });
  return { otherId: fr.requesterId };
};

/** Reject an incoming request or cancel an outgoing one (both delete the row). */
const rejectRequest = async (userId: string, requestId: string): Promise<{ otherId: string }> => {
  const fr = await prisma.friendship.findUnique({ where: { id: requestId } });
  if (!fr || fr.status !== 'PENDING' || (fr.addresseeId !== userId && fr.requesterId !== userId)) {
    throw new FriendServiceError('Demande introuvable.');
  }
  await prisma.friendship.delete({ where: { id: requestId } });
  return { otherId: fr.requesterId === userId ? fr.addresseeId : fr.requesterId };
};

const removeFriend = async (userId: string, otherUserId: string): Promise<{ otherId: string }> => {
  const res = await prisma.friendship.deleteMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId, addresseeId: otherUserId },
        { requesterId: otherUserId, addresseeId: userId },
      ],
    },
  });
  if (res.count === 0) throw new FriendServiceError("Cet utilisateur n'est pas dans vos amis.");
  return { otherId: otherUserId };
};

/** Block a user: wipe any relationship, then store a directional BLOCKED row. */
const blockUser = async (userId: string, targetId: string): Promise<{ otherId: string }> => {
  if (userId === targetId) throw new FriendServiceError('Action impossible.');
  const target = await prisma.profile.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) throw new FriendServiceError('Utilisateur introuvable.');

  await prisma.$transaction([
    prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetId },
          { requesterId: targetId, addresseeId: userId },
        ],
      },
    }),
    prisma.friendship.create({
      data: { requesterId: userId, addresseeId: targetId, status: 'BLOCKED' },
    }),
  ]);
  return { otherId: targetId };
};

const unblockUser = async (userId: string, targetId: string): Promise<{ otherId: string }> => {
  const res = await prisma.friendship.deleteMany({
    where: { requesterId: userId, addresseeId: targetId, status: 'BLOCKED' },
  });
  if (res.count === 0) throw new FriendServiceError("Cet utilisateur n'est pas bloqué.");
  return { otherId: targetId };
};

const setPrivacy = async (userId: string, allow: boolean): Promise<void> => {
  await prisma.profile.update({ where: { id: userId }, data: { allowFriendRequests: allow } });
};

/** Users we already have any relationship with (friend / pending / blocked). */
const relatedUserIds = async (userId: string): Promise<Set<string>> => {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  const ids = new Set<string>();
  for (const r of rows) ids.add(r.requesterId === userId ? r.addresseeId : r.requesterId);
  return ids;
};

const RECENT_LIMIT = 12;

/** Non-bot users recently played with, excluding self + existing relationships. */
const getRecentPlayers = async (userId: string): Promise<RecentPlayer[]> => {
  const myMatches = await prisma.matchPlayer.findMany({
    where: { profileId: userId },
    select: { matchId: true },
    orderBy: { match: { startedAt: 'desc' } },
    take: 40,
  });
  const matchIds = myMatches.map((m) => m.matchId);
  if (matchIds.length === 0) return [];

  const related = await relatedUserIds(userId);

  const rows = await prisma.matchPlayer.findMany({
    where: { matchId: { in: matchIds }, profileId: { not: userId } },
    include: {
      profile: { select: { id: true, username: true, avatar: true, level: true } },
      match: { select: { startedAt: true } },
    },
    orderBy: { match: { startedAt: 'desc' } },
  });

  const seen = new Map<string, RecentPlayer>();
  for (const r of rows) {
    const p = r.profile;
    if (!p || p.id === userId) continue;
    if (p.id.startsWith('bot-')) continue;
    if (related.has(p.id)) continue;
    if (seen.has(p.id)) continue; // rows already sorted desc → first wins
    seen.set(p.id, {
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      level: p.level,
      lastPlayedAt: r.match.startedAt.toISOString(),
    });
    if (seen.size >= RECENT_LIMIT) break;
  }
  return [...seen.values()];
};

/** True when `viewerId` is blocked by `targetId` OR has blocked `targetId`. */
const isBlockedEitherWay = async (viewerId: string, targetId: string): Promise<boolean> => {
  const row = await prisma.friendship.findFirst({
    where: {
      status: 'BLOCKED',
      OR: [
        { requesterId: viewerId, addresseeId: targetId },
        { requesterId: targetId, addresseeId: viewerId },
      ],
    },
    select: { id: true },
  });
  return !!row;
};

const getProfileLite = (userId: string) =>
  prisma.profile.findUnique({ where: { id: userId }, select: PROFILE_SELECT });

export const friendsService = {
  getState,
  getProfileLite,
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
  blockUser,
  unblockUser,
  setPrivacy,
  getRecentPlayers,
  isBlockedEitherWay,
  toSummary,
};
