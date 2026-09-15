import { prisma, Prisma, isBotId, type UserRole } from '@aniquizz/database';
import { getProfileStats } from '../profile/profileService';
import { buildUserSearchWhere, isProfileIdQuery } from './adminUserSearch';

/**
 * Admin user list, profile snapshot, sanctions, and stats reset.
 */

const untilFromMinutes = (minutes: number | null): Date | null => {
  if (minutes === null) return null;
  return new Date(Date.now() + minutes * 60_000);
};

// --- USERS ------------------------------------------------------------------

const PAGE_SIZE = 50;
const BOT_PREFIX = 'bot-';

export type UserListFilter =
  'all' | 'players' | 'moderators' | 'admins' | 'muted' | 'banned' | 'online' | 'in_game';

export type UserListSort = 'username' | 'xp' | 'games' | 'created' | 'seen';

const profileListSelect = {
  id: true,
  username: true,
  email: true,
  avatar: true,
  role: true,
  level: true,
  xp: true,
  gamesPlayed: true,
  gamesWon: true,
  bannedUntil: true,
  mutedUntil: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

const buildFilterWhere = (
  filter: UserListFilter,
  now: Date,
  onlineIds: string[],
  inGameIds: string[],
): Prisma.ProfileWhereInput => {
  switch (filter) {
    case 'players':
      return { NOT: { id: { startsWith: BOT_PREFIX } } };
    case 'moderators':
      return { role: 'MODERATOR' };
    case 'admins':
      return { role: 'ADMIN' };
    case 'muted':
      return { mutedUntil: { gt: now } };
    case 'banned':
      return { bannedUntil: { gt: now } };
    case 'online':
      return onlineIds.length ? { id: { in: onlineIds } } : { id: '__no_match__' };
    case 'in_game':
      return inGameIds.length ? { id: { in: inGameIds } } : { id: '__no_match__' };
    default:
      return {};
  }
};

const mapOrderBy = (
  sort: UserListSort,
  dir: 'asc' | 'desc',
): Prisma.ProfileOrderByWithRelationInput => {
  switch (sort) {
    case 'xp':
      return { xp: dir };
    case 'games':
      return { gamesPlayed: dir };
    case 'created':
      return { createdAt: dir };
    case 'seen':
      return { lastSeenAt: dir };
    default:
      return { username: dir };
  }
};

const mergeWhere = (...parts: Prisma.ProfileWhereInput[]): Prisma.ProfileWhereInput => {
  const clauses = parts.filter((p) => Object.keys(p).length > 0);
  if (!clauses.length) return {};
  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
};

export const getBannedUserCount = (): Promise<number> =>
  prisma.profile.count({ where: { bannedUntil: { gt: new Date() } } });

export const getMutedUserCount = (): Promise<number> =>
  prisma.profile.count({ where: { mutedUntil: { gt: new Date() } } });

export const listUsers = async (opts: {
  query?: string;
  page?: number;
  filter?: UserListFilter;
  sort?: UserListSort;
  sortDir?: 'asc' | 'desc';
  onlineIds?: string[];
  inGameIds?: string[];
}) => {
  const page = Math.max(1, opts.page ?? 1);
  const skip = (page - 1) * PAGE_SIZE;
  const filter = opts.filter ?? 'all';
  const sort = opts.sort ?? 'username';
  const sortDir = opts.sortDir ?? 'asc';
  const now = new Date();
  const onlineIds = opts.onlineIds ?? [];
  const inGameIds = opts.inGameIds ?? [];

  const searchWhere = buildUserSearchWhere(opts.query);
  // A pasted UUID is a ticket lookup — do not hide the row behind list filters.
  const filterWhere = isProfileIdQuery(opts.query ?? '')
    ? {}
    : buildFilterWhere(filter, now, onlineIds, inGameIds);
  const orderBy = mapOrderBy(sort, sortDir);

  // Bots are never surfaced in the admin user list; `all` = humans only.
  const where = mergeWhere(searchWhere, filterWhere, { NOT: { id: { startsWith: BOT_PREFIX } } });
  const [rows, total, bannedCount, mutedCount] = await Promise.all([
    prisma.profile.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy,
      select: profileListSelect,
    }),
    prisma.profile.count({ where }),
    getBannedUserCount(),
    getMutedUserCount(),
  ]);

  return {
    users: rows.map((u) => ({ ...u, isBot: isBotId(u.id) })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    bannedCount,
    mutedCount,
  };
};

/** Full profile snapshot (identity + computed stats) for the admin detail view. */
export const getUserProfile = async (id: string) => {
  const profile = await prisma.profile.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      role: true,
      level: true,
      xp: true,
      gamesPlayed: true,
      gamesWon: true,
      bannedUntil: true,
      mutedUntil: true,
      lastSeenAt: true,
      createdAt: true,
      anilistUsername: true,
      malUsername: true,
    },
  });
  if (!profile) return null;
  const stats = await getProfileStats(id);
  return { ...profile, isBot: isBotId(id), stats };
};

export const getProfileRole = (id: string) =>
  prisma.profile.findUnique({ where: { id }, select: { role: true } });

export const setUserRole = (id: string, role: UserRole) =>
  prisma.profile.update({ where: { id }, data: { role }, select: { id: true, role: true } });

export const setUserBan = (id: string, minutes: number | null) =>
  prisma.profile.update({
    where: { id },
    data: { bannedUntil: untilFromMinutes(minutes) },
    select: { id: true, bannedUntil: true, mutedUntil: true },
  });

export const setUserMute = (id: string, minutes: number | null) =>
  prisma.profile.update({
    where: { id },
    data: { mutedUntil: untilFromMinutes(minutes) },
    select: { id: true, bannedUntil: true, mutedUntil: true },
  });

export const resetUserStats = async (id: string) =>
  prisma.$transaction(async (tx) => {
    const participations = await tx.matchPlayer.findMany({
      where: { profileId: id },
      select: { matchId: true },
    });
    const matchIds = [...new Set(participations.map((p) => p.matchId))];

    const songHistory = await tx.songHistory.deleteMany({ where: { profileId: id } });
    const matchPlayers = await tx.matchPlayer.deleteMany({ where: { profileId: id } });
    const orphanMatches =
      matchIds.length > 0
        ? await tx.match.deleteMany({
            where: { id: { in: matchIds }, players: { none: {} } },
          })
        : { count: 0 };

    const profile = await tx.profile.update({
      where: { id },
      data: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalGuesses: 0,
        correctGuesses: 0,
        maxStreak: 0,
        currentWinStreak: 0,
        xp: 0,
        level: 1,
      },
      select: { id: true },
    });

    return {
      ...profile,
      songHistory: songHistory.count,
      matchPlayers: matchPlayers.count,
      orphanMatches: orphanMatches.count,
    };
  });
