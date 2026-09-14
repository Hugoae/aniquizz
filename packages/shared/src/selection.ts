// packages/shared/src/selection.ts
// Pure QCM / duo choice construction. Framework-agnostic and unit-testable.
// The caller provides a candidate pool of display names; these helpers pick
// wrong answers and shuffle deterministically via Fisher-Yates (shuffleArray).

import {
  resolveArtistAcceptedAnswers,
  resolveArtistQcmTarget,
  resolveArtistUnits,
} from './artistAnswers';
import type { Precision } from './precision';
import { answerIdentityKey, shuffleArray } from './utils';

const PLACEHOLDER = '???';

/** Minimal anime row for building a QCM/duo candidate pool. */
export interface ChoiceAnimeRow {
  id: number;
  name: string;
  franchise: string | null;
}

/** One catalogue credit whose billed units may appear as QCM/duo options. */
export interface ArtistChoiceRow {
  artist: string;
  artistNames: readonly string[];
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
  if (precision === 'artist') return [];
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
export const buildChoices = (correctTarget: string, pool: string[], count = 4): string[] => {
  const correctNorm = answerIdentityKey(correctTarget);

  const uniqueWrong = Array.from(
    new Set(
      pool.filter((c) => {
        if (!c) return false;
        const key = answerIdentityKey(c);
        return Boolean(key) && key !== correctNorm;
      }),
    ),
  );

  const wrong = shuffleArray(uniqueWrong).slice(0, count - 1);
  while (wrong.length < count - 1) {
    wrong.push(PLACEHOLDER);
  }

  return shuffleArray([...wrong, correctTarget]);
};

/**
 * Artist QCM/duo: every option is a billed unit (never `A, B`). Correct = first
 * billed unit. Other people credited on the same song stay out of distractors.
 */
export const buildArtistChoices = (
  correctArtist: string,
  correctNames: readonly string[],
  pool: ArtistChoiceRow[],
  count = 4,
): string[] => {
  const correctTarget = resolveArtistQcmTarget(correctArtist, correctNames);
  const acceptedKeys = new Set(
    resolveArtistAcceptedAnswers(correctArtist, correctNames)
      .map(answerIdentityKey)
      .filter((key) => key.length > 0),
  );
  const seen = new Set<string>();
  const uniqueWrong: string[] = [];

  for (const row of pool) {
    for (const unit of resolveArtistUnits(row.artist, row.artistNames)) {
      const key = answerIdentityKey(unit);
      if (!key || acceptedKeys.has(key) || seen.has(key)) continue;
      seen.add(key);
      uniqueWrong.push(unit);
    }
  }

  const wrong = shuffleArray(uniqueWrong).slice(0, count - 1);
  while (wrong.length < count - 1) {
    wrong.push(PLACEHOLDER);
  }

  return shuffleArray([...wrong, correctTarget]);
};

/** Build a two-option set (correct + one wrong) from existing QCM choices. */
export const buildDuo = (correctTarget: string, choices: string[]): string[] => {
  const correctNorm = answerIdentityKey(correctTarget);
  const wrong = choices.find((c) => answerIdentityKey(c) !== correctNorm) ?? PLACEHOLDER;
  return shuffleArray([correctTarget, wrong]);
};
