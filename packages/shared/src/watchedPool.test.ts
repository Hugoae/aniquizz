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

  it('keeps AniList block metadata when the round count changes', () => {
    const adjusted = withWatchedPoolSoundCount(
      {
        animeCount: 0,
        playableSongs: 0,
        soundCount: 20,
        insufficient: true,
        listError: 'anilist_blocked',
      },
      10,
    );
    expect(adjusted?.listError).toBe('anilist_blocked');
    expect(adjusted?.soundCount).toBe(10);
  });
});
