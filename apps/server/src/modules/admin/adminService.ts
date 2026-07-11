import {
  prisma,
  Prisma,
  isBotId,
  type Difficulty,
  type DownloadStatus,
  type SongType,
  type UserRole,
} from '@aniquizz/database';
import { getProfileStats } from '../profile/profileService';
import { invalidateChoiceCandidates } from '../game/gameService';

/**
 * Admin data operations. All role/authorization checks happen in the route
 * layer (server-side); this module only performs the DB work.
 */

const clampLimit = (limit: number | undefined, fallback = 50, max = 200): number => {
  if (!limit || Number.isNaN(limit)) return fallback;
  return Math.min(Math.max(1, Math.floor(limit)), max);
};

const untilFromMinutes = (minutes: number | null): Date | null => {
  if (minutes === null) return null;
  return new Date(Date.now() + minutes * 60_000);
};

// --- USERS ------------------------------------------------------------------

const PAGE_SIZE = 50;
const BOT_PREFIX = 'bot-';

export type UserListFilter =
  | 'all'
  | 'players'
  | 'moderators'
  | 'admins'
  | 'muted'
  | 'banned'
  | 'online'
  | 'in_game';

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

const buildSearchWhere = (query?: string): Prisma.ProfileWhereInput => {
  if (!query) return {};
  return {
    OR: [
      { username: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ],
  };
};

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

  const searchWhere = buildSearchWhere(opts.query);
  const filterWhere = buildFilterWhere(filter, now, onlineIds, inGameIds);
  const orderBy = mapOrderBy(sort, sortDir);

  // Bots are never surfaced in the admin user list; `all` = humans only.
  const where = mergeWhere(
    searchWhere,
    filterWhere,
    { NOT: { id: { startsWith: BOT_PREFIX } } },
  );
  const [rows, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy,
      select: profileListSelect,
    }),
    prisma.profile.count({ where }),
  ]);

  return {
    users: rows.map((u) => ({ ...u, isBot: isBotId(u.id) })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
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
    },
  });
  if (!profile) return null;
  const stats = await getProfileStats(id);
  return { ...profile, isBot: isBotId(id), stats };
};

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

// --- STATS OVERVIEW ---------------------------------------------------------

const NOT_BOT: Prisma.ProfileWhereInput = { NOT: { id: { startsWith: BOT_PREFIX } } };

const pct = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

export interface StatsOverview {
  community: {
    totalPlayers: number;
    newPlayers24h: number;
    newPlayers7d: number;
    activePlayers24h: number;
    activePlayers7d: number;
    banned: number;
    muted: number;
    roles: { USER: number; MODERATOR: number; ADMIN: number };
    anilistLinked: number;
    anilistLinkedPercent: number;
  };
  activity: {
    periodDays: number;
    totalMatches: number;
    matchesToday: number;
    matchesWeek: number;
    matchesPeriod: number;
    avgMatchDurationSec: number;
    correctRatePercent: number;
    catalogue: {
      total: number;
      completed: number;
      pending: number;
      processing: number;
      error: number;
      skipped: number;
    };
    discoveredSongs: number;
    playableSongs: number;
    coveragePercent: number;
    topAnimes: { name: string; count: number }[];
    topSongs: { title: string; artist: string; anime: string; count: number }[];
    topDifficulty: { difficulty: string; count: number } | null;
    modes: { mode: string; count: number }[];
    perDay: { date: string; count: number }[];
  };
}

/**
 * Aggregate community + game-activity metrics for the admin stats panel.
 * `periodDays === null` means all-time (no lower time bound).
 */
export const getStatsOverview = async (periodDays: number | null): Promise<StatsOverview> => {
  const now = Date.now();
  const d1 = new Date(now - 86_400_000);
  const d7 = new Date(now - 7 * 86_400_000);
  const periodStart = periodDays === null ? null : new Date(now - periodDays * 86_400_000);
  const nowDate = new Date();

  // Reusable "started within the selected period" clauses (empty = all-time).
  const matchPeriodWhere: Prisma.MatchWhereInput = periodStart ? { startedAt: { gte: periodStart } } : {};
  const roundPeriodWhere: Prisma.MatchRoundWhereInput = periodStart
    ? { match: { startedAt: { gte: periodStart } } }
    : {};
  const answerPeriodWhere: Prisma.RoundAnswerWhereInput = periodStart
    ? { round: { match: { startedAt: { gte: periodStart } } } }
    : {};

  // --- Community ---
  const [
    totalPlayers,
    newPlayers24h,
    newPlayers7d,
    activePlayers24h,
    activePlayers7d,
    banned,
    muted,
    anilistLinked,
    rolesGrouped,
  ] = await Promise.all([
    prisma.profile.count({ where: NOT_BOT }),
    prisma.profile.count({ where: mergeWhere(NOT_BOT, { createdAt: { gte: d1 } }) }),
    prisma.profile.count({ where: mergeWhere(NOT_BOT, { createdAt: { gte: d7 } }) }),
    prisma.profile.count({ where: mergeWhere(NOT_BOT, { lastSeenAt: { gte: d1 } }) }),
    prisma.profile.count({ where: mergeWhere(NOT_BOT, { lastSeenAt: { gte: d7 } }) }),
    prisma.profile.count({ where: mergeWhere(NOT_BOT, { bannedUntil: { gt: nowDate } }) }),
    prisma.profile.count({ where: mergeWhere(NOT_BOT, { mutedUntil: { gt: nowDate } }) }),
    prisma.profile.count({ where: mergeWhere(NOT_BOT, { anilistUsername: { not: null } }) }),
    prisma.profile.groupBy({ by: ['role'], where: NOT_BOT, _count: { _all: true } }),
  ]);

  const roles = { USER: 0, MODERATOR: 0, ADMIN: 0 };
  for (const r of rolesGrouped) roles[r.role] = r._count._all;

  // --- Activity ---
  const [totalMatches, matchesToday, matchesWeek, matchesPeriod] = await Promise.all([
    prisma.match.count({ where: { status: 'FINISHED' } }),
    prisma.match.count({ where: { status: 'FINISHED', startedAt: { gte: d1 } } }),
    prisma.match.count({ where: { status: 'FINISHED', startedAt: { gte: d7 } } }),
    prisma.match.count({ where: { status: 'FINISHED', ...matchPeriodWhere } }),
  ]);

  // Catalogue health.
  const catGrouped = await prisma.song.groupBy({
    by: ['downloadStatus'],
    _count: { _all: true },
  });
  const catalogue = { total: 0, completed: 0, pending: 0, processing: 0, error: 0, skipped: 0 };
  for (const c of catGrouped) {
    const n = c._count._all;
    catalogue.total += n;
    switch (c.downloadStatus) {
      case 'COMPLETED':
        catalogue.completed = n;
        break;
      case 'PENDING':
        catalogue.pending = n;
        break;
      case 'PROCESSING':
        catalogue.processing = n;
        break;
      case 'ERROR':
        catalogue.error = n;
        break;
      case 'SKIPPED':
        catalogue.skipped = n;
        break;
    }
  }

  const discovered = await prisma.songHistory.groupBy({ by: ['songId'], _count: { _all: true } });
  const discoveredSongs = discovered.length;
  const playableSongs = catalogue.completed;

  // Matches in the selected period (drives per-day chart, avg duration, modes).
  // All-time: sample the most recent 5000 matches to stay bounded.
  const periodMatches = await prisma.match.findMany({
    where: matchPeriodWhere,
    select: { mode: true, startedAt: true, endedAt: true, status: true },
    orderBy: { startedAt: 'desc' },
    take: 5000,
  });

  // Per-day buckets (oldest → newest). All-time falls back to a 30-day window.
  const chartDays = periodDays ?? 30;
  const perDayMap = new Map<string, number>();
  for (let i = chartDays - 1; i >= 0; i -= 1) {
    const day = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
    perDayMap.set(day, 0);
  }
  let durationSum = 0;
  let durationCount = 0;
  const modeMap = new Map<string, number>();
  for (const m of periodMatches) {
    const day = m.startedAt.toISOString().slice(0, 10);
    if (perDayMap.has(day)) perDayMap.set(day, (perDayMap.get(day) ?? 0) + 1);
    if (m.endedAt) {
      durationSum += (m.endedAt.getTime() - m.startedAt.getTime()) / 1000;
      durationCount += 1;
    }
    modeMap.set(m.mode, (modeMap.get(m.mode) ?? 0) + 1);
  }
  const perDay = [...perDayMap.entries()].map(([date, count]) => ({ date, count }));
  const avgMatchDurationSec = durationCount ? Math.round(durationSum / durationCount) : 0;
  const modes = [...modeMap.entries()]
    .map(([mode, count]) => ({ mode, count }))
    .sort((a, b) => b.count - a.count);

  // Top songs / animes / difficulty for the period (by rounds played).
  const topRounds = await prisma.matchRound.groupBy({
    by: ['songId'],
    where: { songId: { not: null }, ...roundPeriodWhere },
    _count: { songId: true },
    orderBy: { _count: { songId: 'desc' } },
    take: 30,
  });
  const topSongIds = topRounds
    .map((r) => r.songId)
    .filter((id): id is number => id !== null);
  const songRows = topSongIds.length
    ? await prisma.song.findMany({
        where: { id: { in: topSongIds } },
        select: { id: true, title: true, artist: true, difficulty: true, anime: { select: { name: true } } },
      })
    : [];
  const songById = new Map(songRows.map((s) => [s.id, s]));

  const topSongs: StatsOverview['activity']['topSongs'] = [];
  const animeCounts = new Map<string, number>();
  const diffCounts = new Map<string, number>();
  for (const r of topRounds) {
    if (r.songId === null) continue;
    const song = songById.get(r.songId);
    if (!song) continue;
    const count = r._count.songId;
    if (topSongs.length < 5) {
      topSongs.push({
        title: song.title,
        artist: song.artist,
        anime: song.anime?.name ?? '—',
        count,
      });
    }
    const animeName = song.anime?.name ?? '—';
    animeCounts.set(animeName, (animeCounts.get(animeName) ?? 0) + count);
    diffCounts.set(song.difficulty, (diffCounts.get(song.difficulty) ?? 0) + count);
  }
  const topAnimes = [...animeCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const topDifficultyEntry = [...diffCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topDifficulty = topDifficultyEntry
    ? { difficulty: topDifficultyEntry[0], count: topDifficultyEntry[1] }
    : null;

  // Correct-answer rate for the period (humans only).
  const answerWhere: Prisma.RoundAnswerWhereInput = {
    ...answerPeriodWhere,
    matchPlayer: { profileId: { not: { startsWith: BOT_PREFIX } } },
  };
  const [answersTotal, answersCorrect] = await Promise.all([
    prisma.roundAnswer.count({ where: answerWhere }),
    prisma.roundAnswer.count({ where: { ...answerWhere, isCorrect: true } }),
  ]);

  return {
    community: {
      totalPlayers,
      newPlayers24h,
      newPlayers7d,
      activePlayers24h,
      activePlayers7d,
      banned,
      muted,
      roles,
      anilistLinked,
      anilistLinkedPercent: pct(anilistLinked, totalPlayers),
    },
    activity: {
      periodDays: periodDays ?? 0,
      totalMatches,
      matchesToday,
      matchesWeek,
      matchesPeriod,
      avgMatchDurationSec,
      correctRatePercent: pct(answersCorrect, answersTotal),
      catalogue,
      discoveredSongs,
      playableSongs,
      coveragePercent: pct(discoveredSongs, playableSongs),
      topAnimes,
      topSongs,
      topDifficulty,
      modes,
      perDay,
    },
  };
};

/**
 * Wipe all game-activity data: match history (matches, players, rounds, answers)
 * and song-discovery history. Does NOT touch the song catalogue or profiles.
 */
export const resetActivityStats = async () => {
  const [answers, rounds, players, matches, history] = await prisma.$transaction([
    prisma.roundAnswer.deleteMany({}),
    prisma.matchRound.deleteMany({}),
    prisma.matchPlayer.deleteMany({}),
    prisma.match.deleteMany({}),
    prisma.songHistory.deleteMany({}),
  ]);
  return {
    matches: matches.count,
    rounds: rounds.count,
    answers: answers.count,
    matchPlayers: players.count,
    songHistory: history.count,
  };
};

// --- CATALOGUE --------------------------------------------------------------

export const listSongs = async (opts: {
  query?: string;
  status?: DownloadStatus;
  limit?: number;
}) => {
  const where: Prisma.SongWhereInput = {};
  if (opts.status) where.downloadStatus = opts.status;
  if (opts.query) {
    where.OR = [
      { title: { contains: opts.query, mode: 'insensitive' } },
      { artist: { contains: opts.query, mode: 'insensitive' } },
      { anime: { name: { contains: opts.query, mode: 'insensitive' } } },
    ];
  }

  return prisma.song.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: clampLimit(opts.limit),
    select: {
      id: true,
      title: true,
      artist: true,
      songType: true,
      sequence: true,
      difficulty: true,
      downloadStatus: true,
      isLocked: true,
      errorLog: true,
      videoKey: true,
      updatedAt: true,
      anime: { select: { id: true, name: true } },
    },
  });
};

// --- CATALOGUE TREE (Franchise -> Anime -> Song) ----------------------------

const CATALOGUE_PAGE_SIZE = 20;

const songSelect = {
  id: true,
  title: true,
  artist: true,
  songType: true,
  sequence: true,
  videoKey: true,
  sourceUrl: true,
  duration: true,
  difficulty: true,
  episodeRange: true,
  tags: true,
  isLocked: true,
  downloadStatus: true,
  errorLog: true,
  animeId: true,
  updatedAt: true,
} satisfies Prisma.SongSelect;

const animeSelect = {
  id: true,
  name: true,
  altNames: true,
  siteUrl: true,
  studio: true,
  coverImage: true,
  popularity: true,
  tags: true,
  format: true,
  status: true,
  seasonYear: true,
  franchiseId: true,
  isLocked: true,
} satisfies Prisma.AnimeSelect;

export interface CatalogueTreeOpts {
  query?: string;
  page?: number;
  pageSize?: number;
  status?: DownloadStatus;
  difficulty?: Difficulty;
  /** Filter franchises by lock state. Undefined = no filter. */
  locked?: boolean;
}

const loadAnimesWithSongs = async (
  animeWhere: Prisma.AnimeWhereInput,
  songFilter: Prisma.SongWhereInput,
) => {
  const animes = await prisma.anime.findMany({
    where: animeWhere,
    orderBy: { name: 'asc' },
    select: animeSelect,
  });
  if (!animes.length) return [];
  const songs = await prisma.song.findMany({
    where: { animeId: { in: animes.map((a) => a.id) }, ...songFilter },
    orderBy: [{ songType: 'asc' }, { sequence: 'asc' }],
    select: songSelect,
  });
  const byAnime = new Map<number, typeof songs>();
  for (const s of songs) {
    const list = byAnime.get(s.animeId) ?? [];
    list.push(s);
    byAnime.set(s.animeId, list);
  }
  return animes.map((a) => ({ ...a, songs: byAnime.get(a.id) ?? [] }));
};

export const catalogueTree = async (opts: CatalogueTreeOpts) => {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(Math.max(1, Math.floor(opts.pageSize ?? CATALOGUE_PAGE_SIZE)), 100);
  const q = opts.query?.trim();

  const songFilter: Prisma.SongWhereInput = {};
  if (opts.status) songFilter.downloadStatus = opts.status;
  if (opts.difficulty) songFilter.difficulty = opts.difficulty;

  // An anime is relevant when its name matches, its franchise name matches, or
  // it owns a song matching the text. (altNames partial search unsupported.)
  const animeTextFilter: Prisma.AnimeWhereInput | undefined = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { franchise: { name: { contains: q, mode: 'insensitive' } } },
          {
            songs: {
              some: {
                OR: [
                  { title: { contains: q, mode: 'insensitive' } },
                  { artist: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      }
    : undefined;

  const franchiseWhere: Prisma.FranchiseWhereInput = {
    animes: { some: animeTextFilter ?? {} },
    ...(opts.locked !== undefined ? { isLocked: opts.locked } : {}),
  };
  const orphanAnimeWhere: Prisma.AnimeWhereInput = {
    franchiseId: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            {
              songs: {
                some: {
                  OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { artist: { contains: q, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [orphanCountRaw, franchiseTotal] = await Promise.all([
    prisma.anime.count({ where: orphanAnimeWhere }),
    prisma.franchise.count({ where: franchiseWhere }),
  ]);
  // The "Sans franchise" bucket has no lock state, so hide it when filtering by lock.
  const orphanCount = opts.locked !== undefined ? 0 : orphanCountRaw;
  const hasOrphan = orphanCount > 0;
  const orphanOffset = hasOrphan ? 1 : 0;
  const totalGroups = franchiseTotal + orphanOffset;
  const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize));

  const start = (page - 1) * pageSize;
  const groups: Array<{
    id: number | null;
    name: string;
    genres: string[];
    isLocked: boolean;
    animes: Awaited<ReturnType<typeof loadAnimesWithSongs>>;
  }> = [];

  let franchiseSkip = start;
  let franchiseTake = pageSize;

  if (hasOrphan) {
    if (start === 0) {
      groups.push({
        id: null,
        name: 'Sans franchise',
        genres: [],
        isLocked: false,
        animes: await loadAnimesWithSongs(orphanAnimeWhere, songFilter),
      });
      franchiseSkip = 0;
      franchiseTake = pageSize - 1;
    } else {
      franchiseSkip = start - 1;
    }
  }

  if (franchiseTake > 0) {
    const franchises = await prisma.franchise.findMany({
      where: franchiseWhere,
      orderBy: { name: 'asc' },
      skip: franchiseSkip,
      take: franchiseTake,
      select: { id: true, name: true, genres: true, isLocked: true },
    });
    for (const fr of franchises) {
      groups.push({
        id: fr.id,
        name: fr.name,
        genres: fr.genres,
        isLocked: fr.isLocked,
        animes: await loadAnimesWithSongs(
          { franchiseId: fr.id, ...(animeTextFilter ?? {}) },
          songFilter,
        ),
      });
    }
  }

  const [totalFranchises, totalAnimes, totalSongs, completedSongs] = await Promise.all([
    prisma.franchise.count(),
    prisma.anime.count(),
    prisma.song.count(),
    prisma.song.count({ where: { downloadStatus: 'COMPLETED' } }),
  ]);

  return {
    groups,
    pagination: { page, pageSize, totalGroups, totalPages },
    counts: {
      franchises: totalFranchises,
      animes: totalAnimes,
      songs: totalSongs,
      completedSongs,
    },
  };
};

// --- CATALOGUE MUTATIONS ----------------------------------------------------

export interface SongWriteInput {
  title?: string;
  artist?: string;
  songType?: SongType;
  sequence?: number;
  videoKey?: string;
  sourceUrl?: string | null;
  duration?: number | null;
  difficulty?: Difficulty;
  downloadStatus?: DownloadStatus;
  isLocked?: boolean;
  tags?: string[];
  episodeRange?: string | null;
  animeId?: number;
}

export const updateSong = (id: number, data: SongWriteInput) =>
  prisma.song.update({ where: { id }, data, select: songSelect });

export const createSong = (
  data: SongWriteInput & {
    title: string;
    artist: string;
    songType: SongType;
    videoKey: string;
    animeId: number;
  },
) =>
  prisma.song.create({
    data: {
      title: data.title,
      artist: data.artist,
      songType: data.songType,
      sequence: data.sequence ?? 1,
      videoKey: data.videoKey,
      sourceUrl: data.sourceUrl ?? null,
      duration: data.duration ?? null,
      difficulty: data.difficulty ?? 'MEDIUM',
      downloadStatus: data.downloadStatus ?? 'PENDING',
      isLocked: data.isLocked ?? false,
      tags: data.tags ?? [],
      episodeRange: data.episodeRange ?? null,
      animeId: data.animeId,
    },
    select: songSelect,
  });

export const deleteSong = (id: number) => prisma.song.delete({ where: { id } });

export const bulkUpdateSongs = (
  ids: number[],
  data: { difficulty?: Difficulty; downloadStatus?: DownloadStatus; isLocked?: boolean },
) => prisma.song.updateMany({ where: { id: { in: ids } }, data });

export interface AnimeWriteInput {
  name?: string;
  altNames?: string[];
  siteUrl?: string | null;
  studio?: string | null;
  coverImage?: string | null;
  popularity?: number;
  tags?: string[];
  format?: string | null;
  status?: string | null;
  seasonYear?: number | null;
  franchiseId?: number | null;
  isLocked?: boolean;
}

export const updateAnime = async (id: number, data: AnimeWriteInput) => {
  const res = await prisma.anime.update({ where: { id }, data, select: animeSelect });
  invalidateChoiceCandidates();
  return res;
};

export const createAnime = async (data: AnimeWriteInput & { name: string }) => {
  const res = await prisma.anime.create({
    data: {
      name: data.name,
      altNames: data.altNames ?? [],
      siteUrl: data.siteUrl ?? null,
      studio: data.studio ?? null,
      coverImage: data.coverImage ?? null,
      popularity: data.popularity ?? 0,
      tags: data.tags ?? [],
      format: data.format ?? null,
      status: data.status ?? null,
      seasonYear: data.seasonYear ?? null,
      franchiseId: data.franchiseId ?? null,
      isLocked: data.isLocked ?? false,
    },
    select: animeSelect,
  });
  invalidateChoiceCandidates();
  return res;
};

export const deleteAnime = async (id: number) => {
  const res = await prisma.anime.delete({ where: { id } });
  invalidateChoiceCandidates();
  return res;
};

export interface FranchiseWriteInput {
  name?: string;
  genres?: string[];
  isLocked?: boolean;
}

export const updateFranchise = async (id: number, data: FranchiseWriteInput) => {
  const res = await prisma.franchise.update({
    where: { id },
    data,
    select: { id: true, name: true, genres: true, isLocked: true },
  });
  invalidateChoiceCandidates();
  return res;
};

export const createFranchise = async (data: FranchiseWriteInput & { name: string }) => {
  const res = await prisma.franchise.create({
    data: { name: data.name, genres: data.genres ?? [], isLocked: data.isLocked ?? false },
    select: { id: true, name: true, genres: true, isLocked: true },
  });
  invalidateChoiceCandidates();
  return res;
};

export const deleteFranchise = async (id: number) => {
  const res = await prisma.franchise.delete({ where: { id } });
  invalidateChoiceCandidates();
  return res;
};
