import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createCachedFetcher,
  expandLockedFranchiseSequels,
  findSequelEdge,
  type AniListMedia,
} from './anilist-sequel-walk';

function media(
  id: number,
  sequelId: number | null,
  status = 'FINISHED',
): AniListMedia {
  return {
    id,
    status,
    title: { romaji: `Anime ${id}` },
    relations: {
      edges: sequelId
        ? [{ relationType: 'SEQUEL', node: { id: sequelId, type: 'ANIME' } }]
        : [],
    },
  };
}

describe('findSequelEdge', () => {
  it('returns the first anime SEQUEL edge', () => {
    const edge = findSequelEdge(
      media(1, 2),
    );
    assert.equal(edge?.node.id, 2);
  });

  it('ignores non-anime sequels', () => {
    const edge = findSequelEdge({
      id: 1,
      relations: {
        edges: [{ relationType: 'SEQUEL', node: { id: 99, type: 'MANGA' } }],
      },
    });
    assert.equal(edge, undefined);
  });
});

describe('createCachedFetcher', () => {
  it('calls the underlying fetch once per id', async () => {
    const calls: number[] = [];
    const fetchMedia = async (id: number) => {
      calls.push(id);
      return media(id, null);
    };
    const cached = createCachedFetcher(fetchMedia);
    await cached(7);
    await cached(7);
    await cached(8);
    assert.deepEqual(calls, [7, 8]);
  });

  it('does not cache a failed fetch so a later caller can retry', async () => {
    const calls: number[] = [];
    const fetchMedia = async (id: number) => {
      calls.push(id);
      return calls.length === 1 ? null : media(id, null);
    };
    const cached = createCachedFetcher(fetchMedia);
    assert.equal(await cached(3), null);
    assert.equal((await cached(3))?.id, 3);
    assert.deepEqual(calls, [3, 3]);
  });
});

describe('expandLockedFranchiseSequels', () => {
  it('fetches each id once when walking every seed of a linear chain', async () => {
    const catalog: Record<number, AniListMedia> = {
      1: media(1, 2),
      2: media(2, 3),
      3: media(3, 4),
      4: media(4, null, 'NOT_YET_RELEASED'),
    };
    const calls: number[] = [];
    const fetchMedia = createCachedFetcher(async (id: number) => {
      calls.push(id);
      return catalog[id] ?? null;
    });

    const franchise = {
      franchiseName: 'Railgun',
      animes: [{ id: 1 }, { id: 2 }, { id: 3 }],
    };
    const lockedAnimeIds = new Set([1, 2, 3]);
    const added = await expandLockedFranchiseSequels(
      franchise,
      new Set(),
      lockedAnimeIds,
      fetchMedia,
    );

    assert.equal(added, 0);
    assert.deepEqual(calls, [1, 2, 3, 4]);
    assert.equal(franchise.animes.length, 3);
  });

  it('adds a released sequel that is not already in the franchise', async () => {
    const catalog: Record<number, AniListMedia> = {
      10: media(10, 11),
      11: media(11, null),
    };
    const fetchMedia = createCachedFetcher(async (id: number) => catalog[id] ?? null);
    const franchise = { franchiseName: 'New Show', animes: [{ id: 10 }] };
    const lockedAnimeIds = new Set([10]);

    const added = await expandLockedFranchiseSequels(
      franchise,
      new Set(),
      lockedAnimeIds,
      fetchMedia,
    );

    assert.equal(added, 1);
    assert.equal(franchise.animes.length, 2);
    assert.equal(franchise.animes[1].id, 11);
    assert.equal(lockedAnimeIds.has(11), true);
  });

  it('stops at an excluded sequel without fetching it', async () => {
    const calls: number[] = [];
    const fetchMedia = createCachedFetcher(async (id: number) => {
      calls.push(id);
      return media(id, 50);
    });
    const franchise = { franchiseName: 'Excluded', animes: [{ id: 1 }] };

    await expandLockedFranchiseSequels(
      franchise,
      new Set([50]),
      new Set([1]),
      fetchMedia,
    );

    assert.deepEqual(calls, [1]);
  });
});
