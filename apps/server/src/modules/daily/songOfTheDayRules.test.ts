import { describe, expect, it } from 'vitest';
import { songOfTheDayChangeBlock } from './songOfTheDayRules';

const base = {
  isoDate: '2026-11-19',
  today: '2026-11-19',
  songId: 4,
  quizSongIds: new Set<number>(),
  otherFeaturedSongIds: new Set<number>(),
};

describe('songOfTheDayChangeBlock', () => {
  it('allows a song that is free today and on the horizon', () => {
    expect(songOfTheDayChangeBlock(base)).toBeNull();
  });

  it('locks a past day', () => {
    expect(songOfTheDayChangeBlock({ ...base, isoDate: '2026-11-18' })).toBe('past');
  });

  it('refuses a song already in that day quiz', () => {
    expect(songOfTheDayChangeBlock({ ...base, quizSongIds: new Set([4]) })).toBe('in-quiz');
  });

  it('refuses a song already featured on another horizon day', () => {
    expect(songOfTheDayChangeBlock({ ...base, otherFeaturedSongIds: new Set([4]) })).toBe(
      'other-day',
    );
  });
});
