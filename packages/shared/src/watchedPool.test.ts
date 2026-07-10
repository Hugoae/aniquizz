import { describe, expect, it } from 'vitest';
import { isWatchedPoolInsufficient, withWatchedPoolSoundCount } from './watchedPool';

describe('isWatchedPoolInsufficient', () => {
  it('returns true when playable songs are below sound count', () => {
    expect(isWatchedPoolInsufficient(5, 10)).toBe(true);
  });

  it('returns false when playable songs meet sound count', () => {
    expect(isWatchedPoolInsufficient(10, 10)).toBe(false);
    expect(isWatchedPoolInsufficient(15, 10)).toBe(false);
  });
});

describe('withWatchedPoolSoundCount', () => {
  it('recomputes insufficient when sound count changes live', () => {
    const adjusted = withWatchedPoolSoundCount(
      { animeCount: 10, playableSongs: 6, soundCount: 100, insufficient: true },
      5,
    );
    expect(adjusted?.soundCount).toBe(5);
    expect(adjusted?.insufficient).toBe(false);
  });

  it('returns stats unchanged when sound count matches', () => {
    const stats = { animeCount: 10, playableSongs: 6, soundCount: 5, insufficient: false };
    expect(withWatchedPoolSoundCount(stats, 5)).toBe(stats);
  });
});
