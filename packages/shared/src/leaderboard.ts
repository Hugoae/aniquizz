export const LEADERBOARD_METRICS = [
  'xp',
  'victories',
  'games',
  'discoveries',
  'accuracy',
] as const;

export type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number];

export const LEADERBOARD_ACCURACY_MIN_ROUNDS = 50;
export const LEADERBOARD_DEFAULT_PAGE_SIZE = 25;
export const LEADERBOARD_MAX_PAGE_SIZE = 50;
export const LEADERBOARD_PODIUM_SAMPLE = 8;

export interface LeaderboardPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface LeaderboardPlayer {
  rank: number;
  id: string;
  username: string;
  avatar: string;
  level: number;
}

export interface LeaderboardXpEntry extends LeaderboardPlayer {
  metric: 'xp';
  xp: number;
}

export interface LeaderboardVictoriesEntry extends LeaderboardPlayer {
  metric: 'victories';
  gamesWon: number;
  gamesPlayed: number;
  winRate: number;
}

export interface LeaderboardGamesEntry extends LeaderboardPlayer {
  metric: 'games';
  gamesPlayed: number;
}

export interface LeaderboardDiscoveriesEntry extends LeaderboardPlayer {
  metric: 'discoveries';
  discoveries: number;
}

export interface LeaderboardAccuracyEntry extends LeaderboardPlayer {
  metric: 'accuracy';
  accuracy: number;
  correctGuesses: number;
  totalGuesses: number;
}

export type LeaderboardEntry =
  | LeaderboardXpEntry
  | LeaderboardVictoriesEntry
  | LeaderboardGamesEntry
  | LeaderboardDiscoveriesEntry
  | LeaderboardAccuracyEntry;

export interface LeaderboardPodiumGroup {
  rank: number;
  count: number;
  entries: LeaderboardEntry[];
}

export type LeaderboardViewer =
  | { status: 'ranked'; entry: LeaderboardEntry; page: number }
  | { status: 'ineligible'; totalGuesses: number; requiredGuesses: number }
  | { status: 'unranked' };

export interface LeaderboardBrowseParams {
  metric?: LeaderboardMetric;
  page?: number;
  pageSize?: number;
}

export interface LeaderboardResponse {
  metric: LeaderboardMetric;
  entries: LeaderboardEntry[];
  podium: LeaderboardPodiumGroup[];
  pagination: LeaderboardPagination;
  catalogueSize: number;
  viewer: LeaderboardViewer | null;
}

export const isLeaderboardMetric = (value: string): value is LeaderboardMetric =>
  (LEADERBOARD_METRICS as readonly string[]).includes(value);

export const clampLeaderboardPageSize = (value: number | undefined): number => {
  if (!Number.isFinite(value) || value == null) return LEADERBOARD_DEFAULT_PAGE_SIZE;
  return Math.min(LEADERBOARD_MAX_PAGE_SIZE, Math.max(1, Math.floor(value)));
};

export const accuracyPercent = (correctGuesses: number, totalGuesses: number): number => {
  if (totalGuesses <= 0) return 0;
  return Math.round((correctGuesses / totalGuesses) * 1000) / 10;
};

export const winRatePercent = (gamesWon: number, gamesPlayed: number): number => {
  if (gamesPlayed <= 0) return 0;
  return Math.round((gamesWon / gamesPlayed) * 100);
};

export const coveragePercent = (discoveries: number, catalogueSize: number): number => {
  if (catalogueSize <= 0) return 0;
  return Math.round((discoveries / catalogueSize) * 1000) / 10;
};

export const isAccuracyEligible = (totalGuesses: number): boolean =>
  totalGuesses >= LEADERBOARD_ACCURACY_MIN_ROUNDS;

export const pageForRow = (rowNumber: number, pageSize: number): number => {
  if (rowNumber <= 0 || pageSize <= 0) return 1;
  return Math.ceil(rowNumber / pageSize);
};
