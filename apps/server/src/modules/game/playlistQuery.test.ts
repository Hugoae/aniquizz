import { describe, expect, it } from 'vitest';
import { playlistMembershipAnd } from './playlistQuery';

describe('playlistMembershipAnd', () => {
  it('intersects packs with one membership clause per id', () => {
    expect(playlistMembershipAnd(['genre', 'decade'])).toEqual([
      { thematicPlaylists: { some: { playlistId: 'genre' } } },
      { thematicPlaylists: { some: { playlistId: 'decade' } } },
    ]);
  });

  it('returns no constraint for an empty id list', () => {
    expect(playlistMembershipAnd([])).toEqual([]);
  });
});
