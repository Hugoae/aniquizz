import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ThematicPlaylistSummary } from '@aniquizz/shared';
import { playlistApi, resetPublishedPlaylistsCache } from './playlistApi';

const sample: ThematicPlaylistSummary[] = [
  {
    id: 'p1',
    slug: 'shonen',
    name: 'Shonen',
    description: '',
    category: 'tag',
    snapshotCount: 10,
    snapshotAt: null,
    sortOrder: 0,
    chips: ['Shounen'],
  },
];

describe('playlistApi.listPublished', () => {
  beforeEach(() => {
    resetPublishedPlaylistsCache();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ playlists: sample }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetPublishedPlaylistsCache();
  });

  it('reuses the in-memory cache within 60s', async () => {
    const first = await playlistApi.listPublished();
    const second = await playlistApi.listPublished();
    expect(first).toEqual(sample);
    expect(second).toEqual(sample);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://localhost:3001/playlists', { cache: 'no-store' });
  });

  it('bypasses the cache when force is true', async () => {
    await playlistApi.listPublished();
    await playlistApi.listPublished({ force: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
