// Time-attack (Contre-la-montre), solo and versus. Pure helpers so engine,
// medals, and lobby copy stay aligned. Versus ranking lives in timeAttackRace.ts.

import { GAME_CONFIG } from './constants';
import {
  effectiveMedalThresholds,
  type Medal,
  type MedalTier,
  type NextMedalGoal,
} from './grading';
import type { Precision } from './precision';
import { normalizeSongStartMode, type SongStartMode } from './songStartMode';
import type { GameType } from './types';

/** Guess budget, 1 min to 5 min, one step every 30 s. */
export const TIME_ATTACK_MIN_BUDGET_SECONDS = 60;
export const TIME_ATTACK_MAX_BUDGET_SECONDS = 300;
export const TIME_ATTACK_BUDGET_STEP_SECONDS = 30;
export const TIME_ATTACK_DEFAULT_BUDGET_SECONDS = 180;
export const TIME_ATTACK_REVEAL_SECONDS = 3;
export const TIME_ATTACK_SKIP_TAX_MS = 5_000;
export const TIME_ATTACK_SKIP_TAX_STEP_MS = 2_000;
export const TIME_ATTACK_SKIP_TAX_MAX_MS = 15_000;
export const TIME_ATTACK_WRONG_TAX_MS = 3_000;
export const TIME_ATTACK_MIN_CLIP_SECONDS = 8;
export const TIME_ATTACK_MAX_CLIP_SECONDS = 90;
/**
 * Seconds kept after the guess window so the reveal is not cut off.
 * Same 2s safety PlaylistBuilder uses for a Standard random start.
 */
export const TIME_ATTACK_START_SAFETY_SECONDS = 2;
/** Draw at least one title per this many budget seconds (stricter than the floors below). */
const TIME_ATTACK_POOL_HEADROOM_DIVISOR = 3;
const TIME_ATTACK_MIN_POOL = 20;
const TIME_ATTACK_MAX_POOL = 80;
/**
 * The streak prime can add one full starting budget. The draw then has to cover
 * that longer clock (5 min + 5 min → 200 titles at one song per 3 s).
 */
export const TIME_ATTACK_STREAK_MAX_POOL = 200;
/** Consecutive found titles required before a prime. Slider step 1. */
export const TIME_ATTACK_STREAK_MIN = 3;
export const TIME_ATTACK_STREAK_MAX = 10;
export const TIME_ATTACK_STREAK_DEFAULT = 5;
/** Seconds added each time the streak hits a multiple of the required length. */
export const TIME_ATTACK_STREAK_BONUS_MIN_SECONDS = 3;
export const TIME_ATTACK_STREAK_BONUS_MAX_SECONDS = 10;
export const TIME_ATTACK_STREAK_BONUS_DEFAULT_SECONDS = 5;

/**
 * Found titles per minute required for each medal on medium + franchise.
 * Raised after the first playtest: 2/3/4/5 (3 min → 6/9/12/15) was cleared too
 * easily once autocomplete is in play. 4/6/8/10 was a notch too steep; 4/5/7/9
 * → 12/15/21/27 in 3 min.
 */
const TIME_ATTACK_FOUND_PER_MINUTE: Record<Medal, number> = {
  bronze: 4,
  silver: 5,
  gold: 7,
  platinum: 9,
};

export type TimeAttackTaxKind = 'skip' | 'wrong';

export interface TimeAttackSettings {
  gameType?: GameType | null;
  mode?: string | null;
  maxPlayers?: number | null;
}

export function normalizeTimeBudgetSeconds(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return TIME_ATTACK_DEFAULT_BUDGET_SECONDS;
  const clamped = Math.min(
    TIME_ATTACK_MAX_BUDGET_SECONDS,
    Math.max(TIME_ATTACK_MIN_BUDGET_SECONDS, value),
  );
  const steps = Math.round(
    (clamped - TIME_ATTACK_MIN_BUDGET_SECONDS) / TIME_ATTACK_BUDGET_STEP_SECONDS,
  );
  return TIME_ATTACK_MIN_BUDGET_SECONDS + steps * TIME_ATTACK_BUDGET_STEP_SECONDS;
}

/**
 * Fastest a title can spend the budget and still advance.
 * A late random start leaves only the minimum clip. A skip can be cheaper (5s).
 * The draw uses the faster of the two, so a run of end-of-song starts still
 * covers the clock.
 */
export function timeAttackShortestTitleSeconds(): number {
  return Math.min(TIME_ATTACK_MIN_CLIP_SECONDS, TIME_ATTACK_SKIP_TAX_MS / 1000);
}

/** Extra time the prime may add in one run: one full starting budget. */
export function timeAttackStreakBonusCapSeconds(budgetSeconds: number | null | undefined): number {
  return normalizeTimeBudgetSeconds(budgetSeconds);
}

export function normalizeTimeAttackStreakLength(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return TIME_ATTACK_STREAK_DEFAULT;
  return Math.min(TIME_ATTACK_STREAK_MAX, Math.max(TIME_ATTACK_STREAK_MIN, Math.round(value)));
}

export function normalizeTimeAttackStreakBonusSeconds(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return TIME_ATTACK_STREAK_BONUS_DEFAULT_SECONDS;
  return Math.min(
    TIME_ATTACK_STREAK_BONUS_MAX_SECONDS,
    Math.max(TIME_ATTACK_STREAK_BONUS_MIN_SECONDS, Math.round(value)),
  );
}

/**
 * Milliseconds to add when `streak` lands on a multiple of the required length.
 * Streak 0 never pays (a miss just reset it). Two ceilings apply: the live
 * clock cannot pass the chosen duration, and the running total cannot pass
 * one extra starting budget. The last prime may be shorter than the slider.
 */
export function timeAttackStreakGrantMs(input: {
  enabled: boolean;
  streak: number;
  required: number | null | undefined;
  bonusSeconds: number | null | undefined;
  grantedMs: number;
  /** Current clock. The prime cannot push it above the chosen duration. */
  remainingMs: number;
  budgetSeconds: number | null | undefined;
}): number {
  if (!input.enabled || input.streak <= 0) return 0;
  const required = normalizeTimeAttackStreakLength(input.required);
  if (input.streak % required !== 0) return 0;
  const bonusMs = normalizeTimeAttackStreakBonusSeconds(input.bonusSeconds) * 1000;
  const budgetMs = timeAttackStreakBonusCapSeconds(input.budgetSeconds) * 1000;
  const grantRoom = budgetMs - Math.max(0, input.grantedMs);
  const displayRoom = budgetMs - Math.max(0, input.remainingMs);
  const room = Math.min(grantRoom, displayRoom);
  if (room <= 0) return 0;
  return Math.min(bonusMs, room);
}

export function timeAttackPoolSize(budgetSeconds: number, streakBonus = false): number {
  const budget = normalizeTimeBudgetSeconds(budgetSeconds);
  const seconds = streakBonus ? budget + timeAttackStreakBonusCapSeconds(budget) : budget;
  const cover = Math.ceil(seconds / timeAttackShortestTitleSeconds());
  const headroom = Math.ceil(seconds / TIME_ATTACK_POOL_HEADROOM_DIVISOR);
  const maxPool = streakBonus ? TIME_ATTACK_STREAK_MAX_POOL : TIME_ATTACK_MAX_POOL;
  return Math.min(maxPool, Math.max(TIME_ATTACK_MIN_POOL, cover, headroom));
}

export interface TimeAttackClipWindow {
  videoStartTime: number;
  guessDuration: number;
}

/**
 * Guess window for one time-attack title.
 * Beginning plays the catalogue clip from 0. Random may start late, but only
 * where the minimum clip, the 3s reveal, and the safety margin still fit.
 * The clock is then the audio that remains (8–90s), not the full file.
 * A song too short to move stays at the beginning.
 */
export function timeAttackClipWindow(
  durationSeconds: number | null | undefined,
  songStartMode: SongStartMode | null | undefined,
  random: () => number = Math.random,
): TimeAttackClipWindow {
  const full = clipGuessSeconds(durationSeconds);
  if (normalizeSongStartMode(songStartMode) !== 'random') {
    return { videoStartTime: 0, guessDuration: full };
  }

  const total =
    durationSeconds == null || !Number.isFinite(durationSeconds) || durationSeconds <= 0
      ? 0
      : durationSeconds;
  const tail = TIME_ATTACK_REVEAL_SECONDS + TIME_ATTACK_START_SAFETY_SECONDS;
  const maxStart = Math.floor(total - TIME_ATTACK_MIN_CLIP_SECONDS - tail);
  if (maxStart <= 1) {
    return { videoStartTime: 0, guessDuration: full };
  }

  const roll = random();
  const unit = Number.isFinite(roll) ? Math.min(1, Math.max(0, roll)) : 0;
  const start = Math.floor(unit * maxStart);
  if (start <= 0) {
    return { videoStartTime: 0, guessDuration: full };
  }

  const remaining = total - start - tail;
  return {
    videoStartTime: start,
    guessDuration: clipGuessSeconds(remaining),
  };
}

export function clipGuessSeconds(duration: number | null | undefined): number {
  const raw = duration == null || duration <= 0 ? TIME_ATTACK_MAX_CLIP_SECONDS : duration;
  return Math.min(
    TIME_ATTACK_MAX_CLIP_SECONDS,
    Math.max(TIME_ATTACK_MIN_CLIP_SECONDS, Math.round(raw)),
  );
}

/**
 * Skips get pricier within a run (5 s, 7 s, 9 s … capped), so « skip everything I
 * do not know in two seconds » stops being the optimal strategy. Wrong answers are flat.
 */
export function timeAttackTaxMs(
  kind: TimeAttackTaxKind,
  skipsSoFar = 0,
  escalateSkips = true,
): number {
  if (kind === 'wrong' || !escalateSkips) {
    return kind === 'wrong' ? TIME_ATTACK_WRONG_TAX_MS : TIME_ATTACK_SKIP_TAX_MS;
  }
  return Math.min(
    TIME_ATTACK_SKIP_TAX_MAX_MS,
    TIME_ATTACK_SKIP_TAX_MS + Math.max(0, skipsSoFar) * TIME_ATTACK_SKIP_TAX_STEP_MS,
  );
}

export function applyTimeAttackTax(
  remainingMs: number,
  kind: TimeAttackTaxKind,
  skipsSoFar = 0,
  escalateSkips = true,
): number {
  return Math.max(0, remainingMs - timeAttackTaxMs(kind, skipsSoFar, escalateSkips));
}

/** Versus races hold 2 to 8 players: one lane each, so the roster stays readable. */
export const TIME_ATTACK_RACE_MIN_PLAYERS = 2;
export const TIME_ATTACK_RACE_MAX_PLAYERS = 8;

function isSoloShape(settings: TimeAttackSettings): boolean {
  if (settings.mode === 'solo') return true;
  return (settings.maxPlayers ?? 1) <= 1;
}

/** True after settings normalize: the solo run (single shared round loop). */
export function isTimeAttackSettings(settings: TimeAttackSettings | null | undefined): boolean {
  if (settings?.gameType !== 'timeAttack') return false;
  return isSoloShape(settings);
}

/** Versus: a time-attack room for 2+ players, one independent lane per player. */
export function isTimeAttackRace(settings: TimeAttackSettings | null | undefined): boolean {
  if (settings?.gameType !== 'timeAttack') return false;
  return !isSoloShape(settings);
}

/** Any time-attack room, solo or versus (shared scoring, pool size, UI clock). */
export function isTimeAttackGame(settings: TimeAttackSettings | null | undefined): boolean {
  return settings?.gameType === 'timeAttack';
}

function minutesForBudget(budgetSeconds: number): number {
  return normalizeTimeBudgetSeconds(budgetSeconds) / 60;
}

/**
 * Integer found-count bars. Medium + franchise is 4/5/7/9 per minute
 * (3 min → 12/15/21/27). Difficulty / precision use the same relative malus as
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
