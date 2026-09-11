// packages/shared/src/selection.ts
// Pure QCM / duo choice construction. Framework-agnostic and unit-testable.
// The caller provides a candidate pool of display names; these helpers pick
// wrong answers and shuffle deterministically via Fisher-Yates (shuffleArray).

import type { Precision } from './game';
import { normalizeString, shuffleArray } from './utils';

const PLACEHOLDER = '???';

/** Minimal anime row for building a QCM/duo candidate pool. */
export interface ChoiceAnimeRow {
  id: number;
  name: string;
  franchise: string | null;
}

/**
 * Deduped display-name pool for QCM/duo wrong answers.
 * When `allowedAnimeIds` is set (Watched and/or a thematic playlist), only names
 * from that restricted universe are included so players cannot eliminate choices
 * that cannot be the answer. See docs/game/watched-qcm-choices.md and
 * docs/game/thematic-playlists.md.
 */
export const buildChoiceCandidatePool = (
  rows: ChoiceAnimeRow[],
  precision: Precision,
  allowedAnimeIds?: number[],
): string[] => {
  const restricted = allowedAnimeIds !== undefined;
  const allowedSet = restricted ? new Set(allowedAnimeIds) : null;
  const filtered = allowedSet ? rows.filter((a) => allowedSet.has(a.id)) : rows;
  const names = filtered.map((a) => (precision === 'franchise' ? a.franchise || a.name : a.name));
  return [...new Set(names.filter((n) => n.length > 0))];
};

/**
 * Build a multiple-choice set containing the correct answer plus `count - 1`
 * distinct wrong answers drawn at random from `pool`.
 */
export const buildChoices = (
  correctTarget: string,
  pool: string[],
  count = 4,
): string[] => {
  const correctNorm = normalizeString(correctTarget);

  const uniqueWrong = Array.from(
    new Set(pool.filter((c) => c && normalizeString(c) !== correctNorm)),
  );

  const wrong = shuffleArray(uniqueWrong).slice(0, count - 1);
  while (wrong.length < count - 1) {
    wrong.push(PLACEHOLDER);
  }

  return shuffleArray([...wrong, correctTarget]);
};

/** Build a two-option set (correct + one wrong) from existing QCM choices. */
export const buildDuo = (correctTarget: string, choices: string[]): string[] => {
  const correctNorm = normalizeString(correctTarget);
  const wrong = choices.find((c) => normalizeString(c) !== correctNorm) ?? PLACEHOLDER;
  return shuffleArray([correctTarget, wrong]);
};
