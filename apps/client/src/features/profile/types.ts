import type { MatchHistoryEntry, PresenceStatus, FriendSummary } from '@aniquizz/shared';

/** Basic per-game aggregates shown on both the personal and public profile. */
export interface ProfileBasicStats {
  gamesPlayed: number;
  winRate: number;
  accuracy: number;
  maxStreak: number;
  correctGuesses: number;
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
  friends: FriendSummary[];
}
