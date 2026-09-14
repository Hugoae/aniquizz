import type { PublicProfile } from '@aniquizz/shared';
import type { OwnProfileStats, ProfileBasicStats, ProfileVM } from '@/features/profile/types';

function withDailyDefaults(stats: ProfileBasicStats): ProfileBasicStats {
  return {
    ...stats,
    dailyCompletions: stats.dailyCompletions ?? 0,
    dailyWins: stats.dailyWins ?? 0,
    dailyStreak: stats.dailyStreak ?? 0,
    dailyLongestStreak: stats.dailyLongestStreak ?? 0,
    dailyPerfectDays: stats.dailyPerfectDays ?? 0,
    dailyTotalCorrect: stats.dailyTotalCorrect ?? 0,
    dailyTotalResponseMs: stats.dailyTotalResponseMs ?? 0,
    dailyAvgRank: stats.dailyAvgRank ?? null,
    dailyBestRank: stats.dailyBestRank ?? null,
    dailyAvgTimeMs: stats.dailyAvgTimeMs ?? null,
    dailyBestTimeMs: stats.dailyBestTimeMs ?? null,
  };
}

export function buildOwnProfileViewModel(input: {
  userId: string;
  username: string;
  avatar: string;
  role: string;
  xp: number;
  stats: OwnProfileStats;
}): ProfileVM {
  return {
    id: input.userId,
    username: input.username,
    avatar: input.avatar,
    role: input.role,
    xp: input.xp,
    createdAt: input.stats.createdAt,
    status: 'online',
    lastSeenAt: null,
    totalSongs: input.stats.totalSongs,
    discoveredSongs: input.stats.discoveredSongs,
    progressPercent: input.stats.progressPercent,
    bestScore: input.stats.bestScore,
    scoreTotal: input.stats.scoreTotal,
    avgXpPerGame: input.stats.avgXpPerGame,
    avgAnswerMs: input.stats.avgAnswerMs,
    fastestAnswerMs: input.stats.fastestAnswerMs,
    roundsPlayed: input.stats.roundsPlayed,
    multiCount: input.stats.multiCount,
    soloCount: input.stats.soloCount,
    playtimeMs: input.stats.playtimeMs,
    stats: withDailyDefaults(input.stats.stats),
    history: input.stats.history,
    historyRedacted: false,
    friends: [],
  };
}

export function buildPublicProfileViewModel(publicData: PublicProfile): ProfileVM {
  return {
    id: publicData.id,
    username: publicData.username,
    avatar: publicData.avatar,
    role: publicData.role,
    xp: publicData.xp,
    createdAt: publicData.createdAt,
    status: publicData.status,
    lastSeenAt: publicData.lastSeenAt,
    totalSongs: publicData.totalSongs,
    discoveredSongs: publicData.discoveredSongs,
    progressPercent: publicData.progressPercent,
    bestScore: publicData.bestScore,
    scoreTotal: publicData.scoreTotal,
    avgXpPerGame: publicData.avgXpPerGame,
    avgAnswerMs: publicData.avgAnswerMs,
    fastestAnswerMs: publicData.fastestAnswerMs,
    roundsPlayed: publicData.roundsPlayed,
    multiCount: publicData.multiCount,
    soloCount: publicData.soloCount,
    playtimeMs: publicData.playtimeMs,
    stats: withDailyDefaults({
      gamesPlayed: publicData.stats.gamesPlayed,
      winRate: publicData.stats.winRate,
      accuracy: publicData.stats.accuracy,
      maxStreak: publicData.stats.maxStreak,
      correctGuesses: publicData.stats.correctGuesses,
      dailyCompletions: publicData.stats.dailyCompletions,
      dailyWins: publicData.stats.dailyWins,
      dailyStreak: publicData.stats.dailyStreak,
      dailyLongestStreak: publicData.stats.dailyLongestStreak,
      dailyPerfectDays: publicData.stats.dailyPerfectDays,
      dailyTotalCorrect: publicData.stats.dailyTotalCorrect,
      dailyTotalResponseMs: publicData.stats.dailyTotalResponseMs,
      dailyAvgRank: publicData.stats.dailyAvgRank,
      dailyBestRank: publicData.stats.dailyBestRank,
      dailyAvgTimeMs: publicData.stats.dailyAvgTimeMs,
      dailyBestTimeMs: publicData.stats.dailyBestTimeMs,
    }),
    history: publicData.history,
    historyRedacted: publicData.historyRedacted,
    friends: publicData.friends,
  };
}
