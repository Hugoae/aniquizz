// packages/shared/src/selection.ts
// Pure QCM / duo choice construction. Framework-agnostic and unit-testable.
// The caller provides a candidate pool of display names; these helpers pick
// wrong answers and shuffle deterministically via Fisher-Yates (shuffleArray).

import { normalizeString, shuffleArray } from './utils';

const PLACEHOLDER = '???';

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
