import { describe, expect, it } from 'vitest';
import { hasWatchedListLink, watchedListProvider } from './watchedList';

describe('hasWatchedListLink', () => {
  it('returns false when both providers are empty', () => {
    expect(hasWatchedListLink({ anilistUsername: null, malUsername: null })).toBe(false);
  });

  it('returns true for AniList username', () => {
    expect(hasWatchedListLink({ anilistUsername: 'Player' })).toBe(true);
  });

  it('returns true for MAL username', () => {
    expect(hasWatchedListLink({ malUsername: 'Player' })).toBe(true);
  });
});

describe('watchedListProvider', () => {
  it('prefers AniList when set', () => {
    expect(watchedListProvider({ anilistUsername: 'A', malUsername: 'M' })).toBe('anilist');
  });

  it('returns mal when only MAL is set', () => {
    expect(watchedListProvider({ malUsername: 'M' })).toBe('mal');
  });

  it('returns null when unset', () => {
    expect(watchedListProvider({})).toBeNull();
  });
});
