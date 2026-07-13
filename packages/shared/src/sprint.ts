// Sprint — speed podium bonus (multiplayer typing-only mode).
// Pure logic lives here so server scoring and client copy stay aligned.

import type { GameType } from './types';
import { scoreForAnswer } from './scoring';

export type SprintGameType = 'sprint';

export const GAME_TYPE_LABELS = {
  standard: 'Standard',
  sprint: 'Sprint',
} as const;

export type GameTypeId = keyof typeof GAME_TYPE_LABELS;

export interface RankedCorrectAnswer {
  userId: string;
  timeMs: number;
}

/** Podium bonus table indexed by arrival rank (0 = fastest). Empty beyond top 3. */
const PODIUM_BONUS_BY_CORRECT_COUNT: Record<number, number[]> = {
  1: [0],
  2: [2, 1],
  3: [3, 2, 1],
};

function bonusTable(correctCount: number): number[] {
  if (correctCount <= 0) return [];
  if (correctCount === 1) return PODIUM_BONUS_BY_CORRECT_COUNT[1]!;
  if (correctCount === 2) return PODIUM_BONUS_BY_CORRECT_COUNT[2]!;
  return PODIUM_BONUS_BY_CORRECT_COUNT[3]!;
}

/**
 * Speed podium bonus for one round. `rankedCorrect` must be sorted fastest-first
 * (ascending `timeMs`). Only the top three correct answerers receive a bonus when
 * three or more players answered correctly.
 */
export function computeSprintPodiumBonus(
  rankedCorrect: RankedCorrectAnswer[],
): Map<string, number> {
  const table = bonusTable(rankedCorrect.length);
  const bonuses = new Map<string, number>();
  rankedCorrect.forEach((entry, index) => {
    bonuses.set(entry.userId, table[index] ?? 0);
  });
  return bonuses;
}

/** 1-based rank among correct answerers (for reveal UI). */
export function sprintSpeedRank(
  rankedCorrect: RankedCorrectAnswer[],
  userId: string,
): number | null {
  const index = rankedCorrect.findIndex((e) => e.userId === userId);
  return index >= 0 ? index + 1 : null;
}

/** Format a server-side answer timestamp for Sprint UI (seconds, 2 decimals). */
export function formatSprintTimeSeconds(timeMs: number): string {
  return (timeMs / 1000).toFixed(2);
}

/**
 * Projected round total for a correct Sprint answer (base typing + podium bonus).
 * `rankedCorrect` must be sorted fastest-first.
 */
export function computeSprintProjectedPoints(
  rankedCorrect: RankedCorrectAnswer[],
  userId: string,
  basePoints: number,
): number {
  if (!rankedCorrect.some((entry) => entry.userId === userId)) return 0;
  const bonus = computeSprintPodiumBonus(rankedCorrect).get(userId) ?? 0;
  return basePoints + bonus;
}

/** Map a persisted Match.mode enum string to the shared GameType id. */
export function gameTypeFromStoredMode(mode: string | null | undefined): GameType {
  return mode?.toUpperCase() === 'SPRINT' ? 'sprint' : 'standard';
}

/** Best-case round total in Sprint (typing base + max podium bonus). */
export function maxSprintPointsPerRound(): number {
  return scoreForAnswer('typing') + 3;
}
