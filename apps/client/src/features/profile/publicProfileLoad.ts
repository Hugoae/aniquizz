import type { PublicProfile } from '@aniquizz/shared';

/** Failed public-profile fetch — not a friends add/block/list error. */
export const PUBLIC_PROFILE_LOAD_ERROR_EVENT = 'profile:error' as const;

export const PUBLIC_PROFILE_LOAD_TIMEOUT_MS = 8_000;

export function publicProfileLoadErrorMessage(payload: { message?: string } | undefined): string {
  return payload?.message || 'Profil introuvable.';
}

/** Client-side unavailable card when the public fetch times out or errors. */
export function unavailablePublicProfileView(id: string): PublicProfile {
  return {
    id,
    username: '',
    avatar: '',
    role: 'USER',
    status: 'hidden',
    lastSeenAt: null,
    friends: [],
    relation: 'none',
    unavailable: true,
    createdAt: new Date(0).toISOString(),
    xp: 0,
    level: 1,
    bestScore: 0,
    scoreTotal: 0,
    avgXpPerGame: 0,
    avgAnswerMs: null,
    fastestAnswerMs: null,
    roundsPlayed: 0,
    multiCount: 0,
    soloCount: 0,
    playtimeMs: 0,
    discoveredSongs: 0,
    totalSongs: 0,
    progressPercent: 0,
    history: [],
    historyRedacted: true,
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      totalGuesses: 0,
      correctGuesses: 0,
      maxStreak: 0,
      winRate: 0,
      accuracy: 0,
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
}
