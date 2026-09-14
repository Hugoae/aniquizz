import type { MatchHistoryEntry, PresenceStatus, FriendSummary } from '@aniquizz/shared';

/** Basic per-game aggregates shown on both the personal and public profile. */
export interface ProfileBasicStats {
  gamesPlayed: number;
  winRate: number;
  accuracy: number;
  maxStreak: number;
  correctGuesses: number;
  dailyCompletions: number;
  dailyWins: number;
  dailyStreak: number;
  dailyLongestStreak: number;
  dailyPerfectDays: number;
  dailyTotalCorrect: number;
  dailyTotalResponseMs: number;
  dailyAvgRank: number | null;
  dailyBestRank: number | null;
  dailyAvgTimeMs: number | null;
  dailyBestTimeMs: number | null;
}

/** Normalized view-model rendered identically for the self and public views. */
export interface ProfileVM {
  id: string;
  username: string;
  avatar: string;
  role: string;
  xp: number;
  createdAt: string;
  status: PresenceStatus;
  lastSeenAt: string | null;
  totalSongs: number;
  discoveredSongs: number;
  progressPercent: number;
  bestScore: number;
  scoreTotal: number;
  avgXpPerGame: number;
  avgAnswerMs: number | null;
  fastestAnswerMs: number | null;
  roundsPlayed: number;
  multiCount: number;
  soloCount: number;
  playtimeMs: number;
  stats: ProfileBasicStats;
  history: MatchHistoryEntry[];
  historyRedacted?: boolean;
  friends: FriendSummary[];
}

/** Self-only stats payload from `profile:get_stats`. */
export interface OwnProfileStats {
  totalSongs: number;
  discoveredSongs: number;
  progressPercent: number;
  createdAt: string;
  xp: number;
  level: number;
  bestScore: number;
  scoreTotal: number;
  avgXpPerGame: number;
  avgAnswerMs: number | null;
  fastestAnswerMs: number | null;
  roundsPlayed: number;
  multiCount: number;
  soloCount: number;
  playtimeMs: number;
  history: MatchHistoryEntry[];
  stats: ProfileBasicStats;
}

export const INITIAL_OWN_PROFILE_STATS: OwnProfileStats = {
  totalSongs: 0,
  discoveredSongs: 0,
  progressPercent: 0,
  createdAt: '',
  xp: 0,
  level: 0,
  bestScore: 0,
  scoreTotal: 0,
  avgXpPerGame: 0,
  avgAnswerMs: null,
  fastestAnswerMs: null,
  roundsPlayed: 0,
  multiCount: 0,
  soloCount: 0,
  playtimeMs: 0,
  history: [],
  stats: {
    gamesPlayed: 0,
    winRate: 0,
    accuracy: 0,
    maxStreak: 0,
    correctGuesses: 0,
    dailyCompletions: 0,
    dailyWins: 0,
    dailyStreak: 0,
    dailyLongestStreak: 0,
    dailyPerfectDays: 0,
    dailyTotalCorrect: 0,
    dailyTotalResponseMs: 0,
    dailyAvgRank: null,
    dailyBestRank: null,
    dailyAvgTimeMs: null,
    dailyBestTimeMs: null,
  },
};

export function isOwnProfileStats(data: unknown): data is OwnProfileStats {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return typeof d.totalSongs === 'number' && typeof d.stats === 'object' && d.stats !== null;
}
