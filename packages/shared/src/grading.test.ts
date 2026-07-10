import { describe, it, expect } from 'vitest';
import {
  computeMedal,
  medalMarkerScores,
  nextMedalGoal,
  requiredScoreForTier,
} from './grading';

const mediumSongs = (n: number): string[] => Array.from({ length: n }, () => 'medium');

describe('computeMedal - integer score thresholds', () => {
  it('awards platinum at the QCM boundary (18/20 medium)', () => {
    const difficulties = mediumSongs(10);
    expect(requiredScoreForTier('platinum', 20, difficulties)).toBe(18);
    expect(computeMedal(18, 20, difficulties)).toBe('platinum');
    expect(computeMedal(17, 20, difficulties)).toBe('gold');
  });

  it('awards platinum at the typing boundary (45/50 medium)', () => {
    const difficulties = mediumSongs(10);
    expect(requiredScoreForTier('platinum', 50, difficulties)).toBe(45);
    expect(computeMedal(45, 50, difficulties)).toBe('platinum');
    expect(computeMedal(44, 50, difficulties)).toBe('gold');
  });

  it('awards platinum when the rounded threshold is met for mixed difficulties', () => {
    const difficulties = [...Array(9).fill('medium'), 'easy'];
    expect(requiredScoreForTier('platinum', 20, difficulties)).toBe(18);
    expect(computeMedal(18, 20, difficulties)).toBe('platinum');
    expect(computeMedal(17, 20, difficulties)).toBe('gold');
  });
});

describe('nextMedalGoal - aligned with computeMedal', () => {
  it('returns null once every tier is cleared', () => {
    const difficulties = mediumSongs(10);
    expect(nextMedalGoal(18, 20, difficulties, 'platinum')).toBeNull();
  });
});

describe('medalMarkerScores', () => {
  it('matches the labels shown on the mastery bar for medium QCM', () => {
    const scores = medalMarkerScores(20, mediumSongs(10));
    expect(scores).toEqual({ bronze: 10, silver: 12, gold: 14, platinum: 18 });
  });
});
