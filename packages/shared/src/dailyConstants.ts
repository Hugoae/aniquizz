import { GAME_CONFIG } from './constants';

export const DAILY_TIMEZONE = 'Europe/Paris';
export const DAILY_ROUND_COUNT = 5;
export const DAILY_GUESS_MS = 15_000;
/** Same length as the guess window; the client can still skip with Suivant. */
export const DAILY_REVEAL_MS = DAILY_GUESS_MS;
/**
 * Wall-clock guess window including the same start/end soft margins as Standard
 * matches (`GUESS_START_BUFFER` + `GUESS_END_GRACE` ≈ 0.5s total).
 */
export const DAILY_GUESS_WALL_MS =
  DAILY_GUESS_MS + GAME_CONFIG.TIMERS.GUESS_START_BUFFER + GAME_CONFIG.TIMERS.GUESS_END_GRACE;

/**
 * Instant the Standard timer shows 0: wall clock minus the start/end grace
 * (`DAILY_GUESS_WALL_MS - DAILY_GUESS_MS`). Commit the guess here, not at the wall.
 */
export function dailyGuessVisualEndsAt(roundEndsAtMs: number): number {
  return roundEndsAtMs - (DAILY_GUESS_WALL_MS - DAILY_GUESS_MS);
}
/**
 * Win bonus on top of participation + correct XP.
 * Tuned to a 5-round QCM solo (~`SOLO_WIN_BONUS` × `SOLO_MULTIPLIER`).
 */
export const DAILY_XP_WIN_BONUS = 20;
/** Extra XP when every active song of the day is found. */
export const DAILY_XP_PERFECT_BONUS = 10;
export const DAILY_SONG_LOOKBACK_DAYS = 60;
export const DAILY_FRANCHISE_LOOKBACK_DAYS = 14;
export const DAILY_HORIZON_DAYS = 14;
export const DAILY_LEADERBOARD_SIZE = 25;
/** Recap victory threshold — majority of the five songs. */
export const DAILY_WIN_MIN_CORRECT = 3;
export const DAILY_RULES_VERSION = 1;
export const DAILY_PRECISION = 'anime' as const;
export const DAILY_RESPONSE_TYPE = 'qcm' as const;

/** Generator relaxation order when a day's pool is too thin. */
export const DAILY_RELAXATION_STEPS = [
  'drop_discovery_bucket',
  'drop_popularity_buckets',
  'drop_franchise_lookback',
  'drop_song_lookback',
  'allow_duplicate_franchise',
  'relax_difficulty_mix',
  'relax_type_mix',
] as const;

export type DailyRelaxationStep = (typeof DAILY_RELAXATION_STEPS)[number];

/** Keys that must never appear on a guessing-phase Daily payload. */
export const DAILY_LEAK_KEYS = [
  'anime',
  'title',
  'artist',
  'validAnswers',
  'correctLabel',
  'franchise',
  'cover',
] as const;
