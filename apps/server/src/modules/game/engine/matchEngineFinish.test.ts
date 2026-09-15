import { describe, expect, it } from 'vitest';
import { normalizeSongDifficulty, tallyCorrectByDifficulty } from './matchEngineFinish';

describe('normalizeSongDifficulty', () => {
  it('maps known grades and defaults to medium', () => {
    expect(normalizeSongDifficulty('easy')).toBe('easy');
    expect(normalizeSongDifficulty('HARD')).toBe('hard');
    expect(normalizeSongDifficulty('weird')).toBe('medium');
  });
});

describe('tallyCorrectByDifficulty', () => {
  it('counts only songs present in the difficulty map', () => {
    const difficultyBySong = new Map([
      [1, 'easy' as const],
      [2, 'hard' as const],
    ]);
    expect(tallyCorrectByDifficulty(new Set([1, 2, 9]), difficultyBySong)).toEqual({
      easy: 1,
      medium: 0,
      hard: 1,
    });
  });
});
