import { describe, expect, it } from 'vitest';
import { capNestedSongs, libraryBrowseNeedsActor, MAX_NESTED_SONGS_PER_ANIME } from './library';

describe('libraryBrowseNeedsActor', () => {
  it('is false for public catalogue browse', () => {
    expect(libraryBrowseNeedsActor({})).toBe(false);
    expect(libraryBrowseNeedsActor({ sort: 'popularity' })).toBe(false);
  });

  it('is true for liked, discovered, and liked_recent', () => {
    expect(libraryBrowseNeedsActor({ liked: 'liked' })).toBe(true);
    expect(libraryBrowseNeedsActor({ liked: 'unliked' })).toBe(true);
    expect(libraryBrowseNeedsActor({ discovered: 'heard' })).toBe(true);
    expect(libraryBrowseNeedsActor({ sort: 'liked_recent' })).toBe(true);
  });
});

describe('capNestedSongs', () => {
  it('keeps the total while slicing the nested list', () => {
    const songs = Array.from({ length: MAX_NESTED_SONGS_PER_ANIME + 5 }, (_, i) => i);
    const capped = capNestedSongs(songs);
    expect(capped.songs).toHaveLength(MAX_NESTED_SONGS_PER_ANIME);
    expect(capped.songCount).toBe(songs.length);
  });
});
