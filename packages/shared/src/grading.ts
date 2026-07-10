// packages/shared/src/grading.ts
// Pure medal / performance-grade logic shared by the client and the server.
//
// A medal reflects a player's mastery ratio (earned score / best obtainable
// score), so the answer mode matters: acing easy Duo rounds (1 pt) can't reach
// the same medal as typing (5 pts). Thresholds are scaled by song difficulty.
//
// Integer rounding: medal tiers are resolved with Math.round(ratio × maxScore)
// so the server award, mastery-bar labels, and "earned" markers stay aligned.
// Raw float ratios (e.g. 0.9 vs 0.9000000000000001) caused boundary scores such
// as 18/20 QCM to show Platinum on the bar while awarding Gold — see
// docs/game/solo-medals.md.

import { GAME_CONFIG } from './constants';
import type { SongDifficulty } from './leveling';

export type Medal = 'bronze' | 'silver' | 'gold' | 'platinum';
/** A medal, or null when the player did not reach the minimum (bronze). */
export type MedalTier = Medal | null;

export interface MedalThresholds {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

const MEDAL_ASCENDING: Medal[] = ['bronze', 'silver', 'gold', 'platinum'];

const normalizeDifficulty = (raw: string): SongDifficulty => {
  switch ((raw ?? '').toLowerCase()) {
    case 'easy':
      return 'easy';
    case 'hard':
      return 'hard';
    default:
      return 'medium';
  }
};

/**
 * Effective (mean) medal thresholds across the match's actual song difficulties.
 * A match of mixed difficulties blends the per-difficulty thresholds.
 */
export const effectiveMedalThresholds = (difficulties: string[]): MedalThresholds => {
  const T = GAME_CONFIG.MEDALS.THRESHOLDS;
  if (!difficulties.length) return { ...T.medium };

  const acc: MedalThresholds = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  for (const raw of difficulties) {
    const t = T[normalizeDifficulty(raw)];
    acc.bronze += t.bronze;
    acc.silver += t.silver;
    acc.gold += t.gold;
    acc.platinum += t.platinum;
  }
  const n = difficulties.length;
  return {
    bronze: acc.bronze / n,
    silver: acc.silver / n,
    gold: acc.gold / n,
    platinum: acc.platinum / n,
  };
};

/** Integer score required for a medal tier on this match's scale (rounded). */
export const requiredScoreForTier = (
  tier: Medal,
  maxPossibleScore: number,
  difficulties: string[],
): number => {
  const thresholds = effectiveMedalThresholds(difficulties);
  return Math.round(thresholds[tier] * maxPossibleScore);
};

/** Integer score thresholds for every medal tier on this match's scale. */
export const medalMarkerScores = (
  maxPossibleScore: number,
  difficulties: string[],
): Record<Medal, number> => {
  const thresholds = effectiveMedalThresholds(difficulties);
  return {
    bronze: Math.round(thresholds.bronze * maxPossibleScore),
    silver: Math.round(thresholds.silver * maxPossibleScore),
    gold: Math.round(thresholds.gold * maxPossibleScore),
    platinum: Math.round(thresholds.platinum * maxPossibleScore),
  };
};

/**
 * Resolves a medal from the earned score against rounded integer thresholds
 * from {@link medalMarkerScores}. Returns null below the bronze bar.
 */
export const computeMedal = (
  score: number,
  maxPossibleScore: number,
  difficulties: string[],
): MedalTier => {
  if (maxPossibleScore <= 0) return null;

  const required = medalMarkerScores(maxPossibleScore, difficulties);
  if (score >= required.platinum) return 'platinum';
  if (score >= required.gold) return 'gold';
  if (score >= required.silver) return 'silver';
  if (score >= required.bronze) return 'bronze';
  return null;
};

export interface NextMedalGoal {
  tier: Medal;
  pointsNeeded: number;
  label: string;
}

/**
 * Next medal tier the player has not yet reached, and how many points they still
 * need on this match's score scale. Returns null when every tier is cleared.
 */
export const nextMedalGoal = (
  score: number,
  maxPossibleScore: number,
  difficulties: string[],
  currentMedal: MedalTier,
): NextMedalGoal | null => {
  if (maxPossibleScore <= 0) return null;

  const required = medalMarkerScores(maxPossibleScore, difficulties);
  const startIdx = currentMedal ? MEDAL_ASCENDING.indexOf(currentMedal) + 1 : 0;

  for (let i = startIdx; i < MEDAL_ASCENDING.length; i++) {
    const tier = MEDAL_ASCENDING[i];
    const pointsNeeded = required[tier] - score;
    if (pointsNeeded > 0) {
      return { tier, pointsNeeded, label: GAME_CONFIG.MEDALS.META[tier].label };
    }
  }

  return null;
};

/** Marker positions (0–1) for each medal tier on the mastery bar. */
export const medalMarkerRatios = (
  maxPossibleScore: number,
  difficulties: string[],
): Record<Medal, number> => {
  if (maxPossibleScore <= 0) {
    const zero = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    return zero;
  }

  const scores = medalMarkerScores(maxPossibleScore, difficulties);
  return {
    bronze: scores.bronze / maxPossibleScore,
    silver: scores.silver / maxPossibleScore,
    gold: scores.gold / maxPossibleScore,
    platinum: scores.platinum / maxPossibleScore,
  };
};

export interface MedalMeta {
  key: Medal;
  label: string;
  textClass: string;
  borderClass: string;
}

/** Display metadata (label + design-token classes) for a medal, or null for no medal. */
export const getMedalMeta = (medal: MedalTier): MedalMeta | null => {
  if (!medal) return null;
  const meta = GAME_CONFIG.MEDALS.META[medal];
  return { key: medal, label: meta.label, textClass: meta.textClass, borderClass: meta.borderClass };
};
