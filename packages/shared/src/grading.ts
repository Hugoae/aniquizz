// packages/shared/src/grading.ts
// Pure medal / performance-grade logic shared by the client and the server.
// A medal reflects a player's mastery ratio (earned score / best obtainable
// score), so the answer mode matters: acing easy Duo rounds (1 pt) can't reach
// the same medal as typing (5 pts). Thresholds are scaled by song difficulty.

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

/**
 * Resolves a medal from a mastery ratio (0–1 = earned score / best obtainable)
 * against the match's effective thresholds. Returns null below the bronze bar.
 */
export const computeMedal = (ratio: number, difficulties: string[]): MedalTier => {
  const t = effectiveMedalThresholds(difficulties);
  if (ratio >= t.platinum) return 'platinum';
  if (ratio >= t.gold) return 'gold';
  if (ratio >= t.silver) return 'silver';
  if (ratio >= t.bronze) return 'bronze';
  return null;
};

export interface MedalMeta {
  key: Medal;
  label: string;
  color: string;
}

/** Display metadata (label + color) for a medal, or null for no medal. */
export const getMedalMeta = (medal: MedalTier): MedalMeta | null => {
  if (!medal) return null;
  const meta = GAME_CONFIG.MEDALS.META[medal];
  return { key: medal, label: meta.label, color: meta.color };
};
