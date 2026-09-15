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
  const matchPeriodWhere: Prisma.MatchWhereInput = periodStart
    ? { startedAt: { gte: periodStart } }
    : {};
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

  const discovered = await prisma.songHistory.groupBy({
    by: ['songId'],
    where: { song: { downloadStatus: 'COMPLETED' } },
    _count: { _all: true },
  });
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
  const topSongIds = topRounds.map((r) => r.songId).filter((id): id is number => id !== null);
  const songRows = topSongIds.length
    ? await prisma.song.findMany({
        where: { id: { in: topSongIds } },
        select: {
          id: true,
          title: true,
          artist: true,
          difficulty: true,
          anime: { select: { name: true } },
        },
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
