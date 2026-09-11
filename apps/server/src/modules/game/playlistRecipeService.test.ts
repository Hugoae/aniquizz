import { describe, expect, it } from 'vitest';
import {
  buildPlaylistMembershipWhere,
  combinePlaylistSnapshots,
  type PlaylistSnapshot,
} from './playlistRecipeService';

const snap = (overrides: Partial<PlaylistSnapshot> & Pick<PlaylistSnapshot, 'playlistId' | 'songIds'>): PlaylistSnapshot => {
  const songs = overrides.songs ?? overrides.songIds.map((songId) => ({ songId, animeId: songId * 10 }));
  return {
    animeIds: [...new Set(songs.map((row) => row.animeId))],
    songs,
    snapshotCount: overrides.songIds.length,
    staleDropped: 0,
    isPublished: true,
    ...overrides,
  };
};

describe('buildPlaylistMembershipWhere', () => {
  it('ANDs COMPLETED with dimension filters', () => {
    expect(buildPlaylistMembershipWhere({ tags: ['Shounen'] })).toEqual({
      AND: [{ downloadStatus: 'COMPLETED' }, { tags: { hasSome: ['Shounen'] } }],
    });
  });

  it('ORs include ids with dimensions', () => {
    expect(buildPlaylistMembershipWhere({ tags: ['Shounen'], includeSongIds: [1, 2] })).toEqual({
      AND: [
        { downloadStatus: 'COMPLETED' },
        {
          OR: [{ AND: [{ tags: { hasSome: ['Shounen'] } }] }, { id: { in: [1, 2] } }],
        },
      ],
    });
  });

  it('keeps exclude as a notIn clause', () => {
    expect(buildPlaylistMembershipWhere({ tags: ['Shounen'], excludeSongIds: [9] })).toEqual({
      AND: [
        { downloadStatus: 'COMPLETED' },
        { tags: { hasSome: ['Shounen'] } },
        { id: { notIn: [9] } },
      ],
    });
  });
});

describe('combinePlaylistSnapshots', () => {
  it('intersects songs and reports staleDropped from the primary pack only', () => {
    const combined = combinePlaylistSnapshots([
      snap({ playlistId: 'genre', songIds: [1, 2], staleDropped: 3 }),
      snap({ playlistId: 'decade', songIds: [2, 3], staleDropped: 8 }),
    ]);
    expect(combined?.songIds).toEqual([2]);
    expect(combined?.staleDropped).toBe(3);
  });

  it('returns null when any pack is unpublished', () => {
    expect(
      combinePlaylistSnapshots([
        snap({ playlistId: 'genre', songIds: [1], isPublished: false }),
        snap({ playlistId: 'decade', songIds: [1] }),
      ]),
    ).toBeNull();
  });
});
