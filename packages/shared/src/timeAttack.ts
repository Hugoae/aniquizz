// Solo time-attack (Contre-la-montre). Pure helpers so engine, medals, and
// lobby copy stay aligned. Multiplayer cursors are out of this slice.

import { GAME_CONFIG } from './constants';
import {
  effectiveMedalThresholds,
  type Medal,
  type MedalTier,
  type NextMedalGoal,
} from './grading';
import type { Precision } from './precision';
import type { GameType } from './types';

export const TIME_ATTACK_BUDGETS_SECONDS = [60, 120, 180, 300] as const;
export type TimeAttackBudgetSeconds = (typeof TIME_ATTACK_BUDGETS_SECONDS)[number];

export const TIME_ATTACK_DEFAULT_BUDGET_SECONDS: TimeAttackBudgetSeconds = 180;
export const TIME_ATTACK_REVEAL_SECONDS = 3;
export const TIME_ATTACK_SKIP_TAX_MS = 5_000;
export const TIME_ATTACK_WRONG_TAX_MS = 3_000;
export const TIME_ATTACK_MIN_CLIP_SECONDS = 8;
export const TIME_ATTACK_MAX_CLIP_SECONDS = 90;

/** Found titles per minute required for each medal on medium + franchise. */
const TIME_ATTACK_FOUND_PER_MINUTE: Record<Medal, number> = {
  bronze: 2,
  silver: 3,
  gold: 4,
  platinum: 5,
};

export type TimeAttackTaxKind = 'skip' | 'wrong';

export interface TimeAttackSettings {
  gameType?: GameType | null;
  mode?: string | null;
  maxPlayers?: number | null;
}

export function normalizeTimeBudgetSeconds(
  value: number | null | undefined,
): TimeAttackBudgetSeconds {
  if (value === 60 || value === 120 || value === 180 || value === 300) return value;
  return TIME_ATTACK_DEFAULT_BUDGET_SECONDS;
}

export function timeAttackPoolSize(budgetSeconds: number): number {
  const budget = normalizeTimeBudgetSeconds(budgetSeconds);
  return Math.min(80, Math.max(20, Math.ceil(budget / 3)));
}

export function clipGuessSeconds(duration: number | null | undefined): number {
  const raw = duration == null || duration <= 0 ? TIME_ATTACK_MAX_CLIP_SECONDS : duration;
  return Math.min(
    TIME_ATTACK_MAX_CLIP_SECONDS,
    Math.max(TIME_ATTACK_MIN_CLIP_SECONDS, Math.round(raw)),
  );
}

export function applyTimeAttackTax(remainingMs: number, kind: TimeAttackTaxKind): number {
  const tax = kind === 'skip' ? TIME_ATTACK_SKIP_TAX_MS : TIME_ATTACK_WRONG_TAX_MS;
  return Math.max(0, remainingMs - tax);
}

/** True after settings normalize: live time-attack is solo-only this slice. */
export function isTimeAttackSettings(settings: TimeAttackSettings | null | undefined): boolean {
  if (settings?.gameType !== 'timeAttack') return false;
  if (settings.mode === 'solo') return true;
  return (settings.maxPlayers ?? 1) <= 1;
}

function minutesForBudget(budgetSeconds: number): number {
  return normalizeTimeBudgetSeconds(budgetSeconds) / 60;
}

/**
 * Integer found-count bars. Medium + franchise stays 2/3/4/5 per minute
 * (3 min → 6/9/12/15). Difficulty / precision use the same relative malus as
 * Standard mastery ratios.
 */
export function timeAttackMedalTargets(
  budgetSeconds: number,
  songDifficulties: string[],
  precision?: Precision,
): Record<Medal, number> {
  const minutes = minutesForBudget(budgetSeconds);
  const medium = GAME_CONFIG.MEDALS.THRESHOLDS.medium;
  const effective = effectiveMedalThresholds(songDifficulties, precision);
  const scale = (tier: Medal, basePerMinute: number): number => {
    const raw = Math.round(basePerMinute * minutes * (effective[tier] / medium[tier]));
    return Math.max(1, raw);
  };
  const bronze = scale('bronze', TIME_ATTACK_FOUND_PER_MINUTE.bronze);
  const silver = Math.max(bronze + 1, scale('silver', TIME_ATTACK_FOUND_PER_MINUTE.silver));
  const gold = Math.max(silver + 1, scale('gold', TIME_ATTACK_FOUND_PER_MINUTE.gold));
  const platinum = Math.max(gold + 1, scale('platinum', TIME_ATTACK_FOUND_PER_MINUTE.platinum));
  return { bronze, silver, gold, platinum };
}

export function timeAttackMedal(
  found: number,
  budgetSeconds: number,
  songDifficulties: string[],
  precision?: Precision,
): MedalTier {
  const required = timeAttackMedalTargets(budgetSeconds, songDifficulties, precision);
  if (found >= required.platinum) return 'platinum';
  if (found >= required.gold) return 'gold';
  if (found >= required.silver) return 'silver';
  if (found >= required.bronze) return 'bronze';
  return null;
}

export function timeAttackNextMedalGoal(
  found: number,
  budgetSeconds: number,
  songDifficulties: string[],
  currentMedal: MedalTier,
  precision?: Precision,
): NextMedalGoal | null {
  const required = timeAttackMedalTargets(budgetSeconds, songDifficulties, precision);
  const order: Medal[] = ['bronze', 'silver', 'gold', 'platinum'];
  const startIdx = currentMedal ? order.indexOf(currentMedal) + 1 : 0;
  for (let i = startIdx; i < order.length; i++) {
    const tier = order[i]!;
    const pointsNeeded = required[tier] - found;
    if (pointsNeeded > 0) {
      return { tier, pointsNeeded, label: GAME_CONFIG.MEDALS.META[tier].label };
    }
  }
  return null;
}

export function formatTimeAttackClock(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
