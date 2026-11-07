// Standard speed podium bonus (multiplayer typing modifier).
// Pure logic lives here so server scoring and client copy stay aligned.

import type { GameType } from './types';
import { scoreForAnswer } from './scoring';

export interface RankedCorrectAnswer {
  userId: string;
  timeMs: number;
}

export interface SpeedBonusSettings {
  speedBonusEnabled?: boolean | null;
  responseType?: string | null;
  maxPlayers?: number | null;
  mode?: string | null;
  gameType?: GameType | null;
}

/**
 * True when the Standard speed-podium modifier is active.
 * Typing-only, multiplayer (at least two seats). Solo / QCM / Mix stay off.
 */
export function isSpeedBonusEnabled(settings: SpeedBonusSettings | null | undefined): boolean {
  if (!settings?.speedBonusEnabled) return false;
  if (settings.responseType !== 'typing') return false;
  if ((settings.maxPlayers ?? 2) < 2) return false;
  if (settings.mode === 'solo') return false;
  return true;
}

/** Persisted `Match.mode` SPRINT rows are historical speed-bonus matches. */
export function speedBonusFromStoredMode(mode: string | null | undefined): boolean {
  return mode?.toUpperCase() === 'SPRINT';
}

/** Map a persisted Match.mode enum string to the shared GameType id. */
export function gameTypeFromStoredMode(mode: string | null | undefined): GameType {
  void mode;
  return 'standard';
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
export function computeSpeedPodiumBonus(rankedCorrect: RankedCorrectAnswer[]): Map<string, number> {
  const table = bonusTable(rankedCorrect.length);
  const bonuses = new Map<string, number>();
  rankedCorrect.forEach((entry, index) => {
    bonuses.set(entry.userId, table[index] ?? 0);
  });
  return bonuses;
}

/** 1-based rank among correct answerers (for reveal UI). */
export function speedPodiumRank(
  rankedCorrect: RankedCorrectAnswer[],
  userId: string,
): number | null {
  const index = rankedCorrect.findIndex((e) => e.userId === userId);
  return index >= 0 ? index + 1 : null;
}

/** Format a server-side answer timestamp for speed-bonus UI (seconds, 2 decimals). */
export function formatSpeedTimeSeconds(timeMs: number): string {
  return (timeMs / 1000).toFixed(2);
}

/**
 * Projected round total for a correct speed-bonus answer (base typing + podium).
 * `rankedCorrect` must be sorted fastest-first.
 */
export function computeSpeedProjectedPoints(
  rankedCorrect: RankedCorrectAnswer[],
  userId: string,
  basePoints: number,
): number {
  if (!rankedCorrect.some((entry) => entry.userId === userId)) return 0;
  const bonus = computeSpeedPodiumBonus(rankedCorrect).get(userId) ?? 0;
  return basePoints + bonus;
}

/** Best-case round total with speed bonus (typing base + max podium bonus). */
export function maxSpeedBonusPointsPerRound(): number {
  return scoreForAnswer('typing') + 3;
}
