import { describe, expect, it } from 'vitest';
import { hasWatchedListLink, resolveActiveListProvider, watchedListProvider } from './watchedList';

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

describe('resolveActiveListProvider', () => {
  it('uses the stored active source when that username is still linked', () => {
    expect(
      resolveActiveListProvider({
        anilistUsername: 'A',
        malUsername: 'M',
        activeListProvider: 'mal',
      }),
    ).toBe('mal');
  });

  it('falls back to the remaining link when the active source was unlinked', () => {
    expect(
      resolveActiveListProvider({
        anilistUsername: null,
        malUsername: 'M',
        activeListProvider: 'anilist',
      }),
    ).toBe('mal');
  });

  it('prefers AniList when both are set and no preference is stored', () => {
    expect(watchedListProvider({ anilistUsername: 'A', malUsername: 'M' })).toBe('anilist');
  });

  it('returns mal when only MAL is set', () => {
    expect(watchedListProvider({ malUsername: 'M' })).toBe('mal');
  });

  it('returns null when unset', () => {
    expect(watchedListProvider({})).toBeNull();
  });
});
