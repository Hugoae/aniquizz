// packages/shared/src/leveling.ts
// Pure XP / level logic shared by the client and the server.
// Framework-agnostic and fully unit-testable. The server is authoritative:
// it computes match XP here and persists the derived level.

import { GAME_CONFIG } from './constants';

export type SongDifficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTIES: SongDifficulty[] = ['easy', 'medium', 'hard'];

/** Per-difficulty tally of a player's correct answers in a match. */
export type CorrectByDifficulty = Record<SongDifficulty, number>;

export interface MatchXpInput {
  /** Correct answers broken down by the difficulty of each answered song. */
  correctByDifficulty: CorrectByDifficulty;
  /** Rounds the player took part in (drives participation XP + the floor). */
  roundsPlayed: number;
  /** Final score; placement/solo bonuses only apply when score > 0. */
  score: number;
  /** Whether the player won (solo objective reached or multi podium). */
  isWinner: boolean;
  /** 1-based competition rank (1-2-2-4 ties) for the multiplayer placement bonus. */
  rank: number;
  /** Total players in the match (for the top-half placement bonus). */
  playerCount: number;
  isSolo: boolean;
  /** Consecutive won matches AFTER this one (>= WIN_STREAK_MIN → bonus). */
  winStreak: number;
}

/** Difficulty-weighted placement bonus for a multiplayer finish. */
const multiPlacementBonus = (rank: number, playerCount: number): number => {
  const { PLACEMENT } = GAME_CONFIG.LEVELING;
  if (rank === 1) return PLACEMENT.FIRST;
  if (rank === 2) return PLACEMENT.SECOND;
  if (rank === 3) return PLACEMENT.THIRD;
  if (rank <= Math.ceil(playerCount / 2)) return PLACEMENT.TOP_HALF;
  return 0;
};

/**
 * XP earned for a finished match. See the Phase 7 plan for the full breakdown:
 * difficulty-weighted correct answers + participation + placement, adjusted for
 * solo, then the flat win-streak bonus, floored to MIN_XP if the player played.
 */
export const xpForMatch = (input: MatchXpInput): number => {
  const L = GAME_CONFIG.LEVELING;
  if (input.roundsPlayed <= 0) return 0;

  let correctXp = 0;
  for (const diff of DIFFICULTIES) {
    const count = input.correctByDifficulty[diff] ?? 0;
    correctXp += count * L.XP_PER_CORRECT * L.DIFFICULTY_WEIGHT[diff];
  }

  const perf = correctXp + input.roundsPlayed * L.XP_PER_ROUND;

  let placement = 0;
  if (input.score > 0) {
    placement = input.isSolo
      ? input.isWinner
        ? L.SOLO_WIN_BONUS
        : 0
      : multiPlacementBonus(input.rank, input.playerCount);
  }

  let total = perf + placement;
  if (input.isSolo) total *= L.SOLO_MULTIPLIER;
  if (input.isWinner && input.winStreak >= L.WIN_STREAK_MIN) {
    total *= 1 + L.WIN_STREAK_BONUS;
  }

  return Math.max(Math.round(total), L.MIN_XP);
};

/**
 * Cumulative XP required to REACH a given level (level 1 = 0 XP).
 * XP to go L→L+1 is CURVE_BASE * L, so reaching level L costs
 * CURVE_BASE * (L-1) * L / 2. Clamped to the level cap.
 */
export const totalXpForLevel = (level: number): number => {
  const capped = Math.min(level, GAME_CONFIG.LEVELING.MAX_LEVEL);
  if (capped <= 1) return 0;
  const n = capped - 1;
  return (GAME_CONFIG.LEVELING.CURVE_BASE * n * (n + 1)) / 2;
};

/** Level derived from a lifetime XP total (1 .. MAX_LEVEL). Robust to fp rounding. */
export const levelFromXp = (xp: number): number => {
  const { CURVE_BASE, MAX_LEVEL } = GAME_CONFIG.LEVELING;
  if (xp <= 0) return 1;
  let level = Math.floor((1 + Math.sqrt(1 + (8 * xp) / CURVE_BASE)) / 2);
  if (level < 1) level = 1;
  // Correct any floating-point drift at exact level boundaries.
  while (level < MAX_LEVEL && totalXpForLevel(level + 1) <= xp) level += 1;
  while (level > 1 && totalXpForLevel(level) > xp) level -= 1;
  return Math.min(level, MAX_LEVEL);
};

export interface LevelProgress {
  level: number;
  /** XP accumulated within the current level. */
  xpIntoLevel: number;
  /** XP span of the current level (XP needed to reach the next). */
  xpForNextLevel: number;
  /** Progress within the current level, 0–100. */
  percent: number;
}

/** Level + progress bar data derived from a lifetime XP total. */
export const levelProgress = (xp: number): LevelProgress => {
  const safeXp = Math.max(0, xp);
  const level = levelFromXp(safeXp);
  // At the level cap there is no "next level" to progress towards.
  if (level >= GAME_CONFIG.LEVELING.MAX_LEVEL) {
    return { level, xpIntoLevel: 0, xpForNextLevel: 0, percent: 100 };
  }
  const floor = totalXpForLevel(level);
  const span = totalXpForLevel(level + 1) - floor;
  const xpIntoLevel = safeXp - floor;
  const percent = span > 0 ? Math.min(100, Math.max(0, (xpIntoLevel / span) * 100)) : 0;
  return { level, xpIntoLevel, xpForNextLevel: span, percent };
};
