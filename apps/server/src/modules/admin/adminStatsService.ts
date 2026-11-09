import { prisma, Prisma } from '@aniquizz/database';

/**
 * Community + game-activity aggregates for the admin stats panel.
 */

const BOT_PREFIX = 'bot-';
const NOT_BOT: Prisma.ProfileWhereInput = { NOT: { id: { startsWith: BOT_PREFIX } } };

const mergeWhere = (...parts: Prisma.ProfileWhereInput[]): Prisma.ProfileWhereInput => {
  const clauses = parts.filter((p) => Object.keys(p).length > 0);
  if (!clauses.length) return {};
  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
};

const pct = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

interface TopSongRow {
  title: string;
  artist: string;
  songType: string;
  sequence: number;
  difficulty: string;
  anime: string;
  franchise: string | null;
  cover: string | null;
  count: number;
}

interface TopAnimeRow {
  name: string;
  cover: string | null;
  year: number | null;
  format: string | null;
  studio: string | null;
  count: number;
}

interface TopDifficultyRow {
  difficulty: string;
  count: number;
}

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
    malLinked: number;
    malLinkedPercent: number;
    watchedListLinked: number;
    watchedListLinkedPercent: number;
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
    topAnimes: {
      name: string;
      count: number;
      cover: string | null;
      year: number | null;
      format: string | null;
      studio: string | null;
    }[];
    topSongs: {
      title: string;
      artist: string;
      anime: string;
      franchise: string | null;
      count: number;
      cover: string | null;
      songType: string;
      sequence: number;
      difficulty: string;
    }[];
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
  const matchPeriodWhere: Prisma.MatchWhereInput = periodStart
    ? { startedAt: { gte: periodStart } }
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
    malLinked,
    watchedListLinked,
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
    prisma.profile.count({ where: mergeWhere(NOT_BOT, { malUsername: { not: null } }) }),
    prisma.profile.count({
      where: mergeWhere(NOT_BOT, {
        OR: [{ anilistUsername: { not: null } }, { malUsername: { not: null } }],
      }),
    }),
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

  // COUNT(DISTINCT) in SQL: a groupBy would ship one row per discovered song.
  const [discoveredRow] = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(DISTINCT h."songId")::bigint AS total
    FROM "SongHistory" h
    INNER JOIN "Song" s ON s.id = h."songId"
    WHERE s."downloadStatus" = 'COMPLETED'
  `;
  const discoveredSongs = Number(discoveredRow?.total ?? 0);
  const playableSongs = catalogue.completed;

  // Matches in the selected period (drives per-day chart, avg duration, modes).
  // All-time: sample the most recent 5000 matches to stay bounded.
  // Finished matches only. A quit still leaves rounds for the tops, but it is not a played match.
  const periodMatches = await prisma.match.findMany({
    where: { status: 'FINISHED', ...matchPeriodWhere },
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

  // Every started title counts, including a match that was quit or still open.
  // Animes are grouped on their own: deriving them from the top songs hid
  // a show whose plays were spread across many tracks.
  const startedAfter = periodStart ? Prisma.sql`AND m."startedAt" >= ${periodStart}` : Prisma.empty;
  const [topSongRows, topAnimeRows, topDifficultyRows] = await Promise.all([
    prisma.$queryRaw<TopSongRow[]>`
      SELECT s.title,
             s.artist,
             s."songType"::text AS "songType",
             s.sequence,
             s.difficulty::text AS difficulty,
             a.name AS anime,
             f.name AS franchise,
             a."coverImage" AS cover,
             COUNT(*)::int AS count
      FROM "MatchRound" r
      INNER JOIN "Song" s ON s.id = r."songId"
      INNER JOIN "Anime" a ON a.id = s."animeId"
      LEFT JOIN "Franchise" f ON f.id = a."franchiseId"
      INNER JOIN "Match" m ON m.id = r."matchId"
      WHERE r."songId" IS NOT NULL
      ${startedAfter}
      GROUP BY s.id, s.title, s.artist, s."songType", s.sequence, s.difficulty, a.name, a."coverImage", f.name
      ORDER BY count DESC, s.title ASC
      LIMIT 5
    `,
    prisma.$queryRaw<TopAnimeRow[]>`
      SELECT a.name,
             a."coverImage" AS cover,
             a."seasonYear" AS year,
             a.format,
             a.studio,
             COUNT(*)::int AS count
      FROM "MatchRound" r
      INNER JOIN "Song" s ON s.id = r."songId"
      INNER JOIN "Anime" a ON a.id = s."animeId"
      INNER JOIN "Match" m ON m.id = r."matchId"
      WHERE r."songId" IS NOT NULL
      ${startedAfter}
      GROUP BY a.id, a.name, a."coverImage", a."seasonYear", a.format, a.studio
      ORDER BY count DESC, a.name ASC
      LIMIT 5
    `,
    prisma.$queryRaw<TopDifficultyRow[]>`
      SELECT s.difficulty::text AS difficulty,
             COUNT(*)::int AS count
      FROM "MatchRound" r
      INNER JOIN "Song" s ON s.id = r."songId"
      INNER JOIN "Match" m ON m.id = r."matchId"
      WHERE r."songId" IS NOT NULL
      ${startedAfter}
      GROUP BY s.difficulty
      ORDER BY count DESC
      LIMIT 1
    `,
  ]);
  const topSongs = topSongRows.map((row) => ({
    title: row.title,
    artist: row.artist,
    anime: row.anime,
    franchise: row.franchise,
    count: Number(row.count),
    cover: row.cover,
    songType: row.songType,
    sequence: Number(row.sequence),
    difficulty: row.difficulty,
  }));
  const topAnimes = topAnimeRows.map((row) => ({
    name: row.name,
    count: Number(row.count),
    cover: row.cover,
    year: row.year === null ? null : Number(row.year),
    format: row.format,
    studio: row.studio,
  }));
  const topDifficulty = topDifficultyRows[0]
    ? { difficulty: topDifficultyRows[0].difficulty, count: Number(topDifficultyRows[0].count) }
    : null;

  // Correct-answer rate for the period (humans only).
  const answerWhere: Prisma.RoundAnswerWhereInput = {
    ...answerPeriodWhere,
    matchPlayer: { profileId: { not: { startsWith: BOT_PREFIX } } },
  };
  const answerGroups = await prisma.roundAnswer.groupBy({
    by: ['isCorrect'],
    where: answerWhere,
    _count: { _all: true },
  });
  let answersTotal = 0;
  let answersCorrect = 0;
  for (const group of answerGroups) {
    answersTotal += group._count._all;
    if (group.isCorrect) answersCorrect += group._count._all;
  }

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
      malLinked,
      malLinkedPercent: pct(malLinked, totalPlayers),
      watchedListLinked,
      watchedListLinkedPercent: pct(watchedListLinked, totalPlayers),
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
