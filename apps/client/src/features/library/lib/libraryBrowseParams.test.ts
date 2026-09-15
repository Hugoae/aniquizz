import { describe, expect, it } from 'vitest';
import {
  buildLibrarySearchParams,
  libraryAnimeSongsHref,
  libraryPageHref,
  nextDebouncedLibraryQuery,
  parsePage,
  parseSongTypes,
  viewFromSearchParams,
} from './libraryBrowseParams';

describe('nextDebouncedLibraryQuery', () => {
  it('does not reset the page when trim is unchanged', () => {
    expect(nextDebouncedLibraryQuery('bleach', 'bleach')).toEqual({
      query: 'bleach',
      resetPage: false,
    });
    expect(nextDebouncedLibraryQuery('  bleach  ', 'bleach')).toEqual({
      query: 'bleach',
      resetPage: false,
    });
  });

  it('resets the page when the trimmed query changes', () => {
    expect(nextDebouncedLibraryQuery('naruto', 'bleach')).toEqual({
      query: 'naruto',
      resetPage: true,
    });
    expect(nextDebouncedLibraryQuery('', 'bleach')).toEqual({
      query: '',
      resetPage: true,
    });
  });
});

describe('buildLibrarySearchParams', () => {
  const songsPage3: Parameters<typeof buildLibrarySearchParams>[0] = {
    query: '',
    songTypes: [],
    difficulties: [],
    discovered: '',
    liked: '',
    view: 'songs',
    sort: 'title',
    page: 3,
    songId: null,
    animeId: null,
  };

  it('keeps view=songs and page=N for a deep link', () => {
    const qs = buildLibrarySearchParams(songsPage3);
    expect(qs.get('view')).toBe('songs');
    expect(qs.get('page')).toBe('3');
    expect(qs.get('q')).toBeNull();
  });

  it('omits page=1', () => {
    const qs = buildLibrarySearchParams({ ...songsPage3, page: 1 });
    expect(qs.get('page')).toBeNull();
  });

  it('keeps q and page together', () => {
    const qs = buildLibrarySearchParams({ ...songsPage3, query: 'bleach', page: 2 });
    expect(qs.get('q')).toBe('bleach');
    expect(qs.get('page')).toBe('2');
  });

  it('prefers animeId over q so homonyms cannot leak into the songs view', () => {
    const qs = buildLibrarySearchParams({
      ...songsPage3,
      page: 1,
      query: 'One Piece',
      animeId: 21,
    });
    expect(qs.get('animeId')).toBe('21');
    expect(qs.get('q')).toBeNull();
    expect(qs.get('view')).toBe('songs');
  });
});

describe('libraryPageHref', () => {
  it('builds a real /library link for crawlers', () => {
    const state: Parameters<typeof libraryPageHref>[0] = {
      query: '',
      songTypes: [],
      difficulties: [],
      discovered: '',
      liked: '',
      view: 'songs',
      sort: 'title',
      page: 1,
      songId: null,
      animeId: null,
    };
    expect(libraryPageHref(state, 2)).toBe('/library?view=songs&page=2');
  });
});

describe('parse helpers', () => {
  it('parses INSERT alongside OP/ED', () => {
    expect(parseSongTypes('OP,INSERT')).toEqual(['OP', 'INSERT']);
  });

  it('falls back invalid page to 1', () => {
    expect(parsePage('3')).toBe(3);
    expect(parsePage('0')).toBe(1);
    expect(parsePage('nope')).toBe(1);
  });
});

describe('libraryAnimeSongsHref', () => {
  it('deep-links the songs view with the anime id, not the display name', () => {
    expect(libraryAnimeSongsHref(21)).toBe('/library?view=songs&animeId=21');
  });
});

describe('viewFromSearchParams', () => {
  it('opens songs when only animeId is present', () => {
    expect(viewFromSearchParams(new URLSearchParams('animeId=21'))).toBe('songs');
  });

  it('keeps an explicit franchise view', () => {
    expect(viewFromSearchParams(new URLSearchParams('view=franchise&animeId=21'))).toBe(
      'franchise',
    );
  });
});
