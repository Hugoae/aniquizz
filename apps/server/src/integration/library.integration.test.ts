import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MAX_NESTED_SONGS_PER_ANIME } from '@aniquizz/shared';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { clearLibraryMetaCache } from '../modules/catalogue/libraryMeta';
import { clearLibrarySearchCache } from '../modules/catalogue/librarySearch';

describe.skipIf(!hasIntegrationEnv)('library integration', () => {
  let bundle: ServerBundle;

  beforeAll(async () => {
    clearLibraryMetaCache();
    clearLibrarySearchCache();
    bundle = await createServerBundle();
  });

  afterAll(async () => {
    await bundle.close();
  });

  it('GET /library/meta returns playable catalogue counts', async () => {
    const res = await fetch(`${bundle.url}/library/meta`);
    expect(res.status).toBe(200);
    const meta = (await res.json()) as { totalSongs: number };
    expect(meta.totalSongs).toBeGreaterThan(0);
  });

  it('GET /library/tree returns franchise groups with songs', async () => {
    const res = await fetch(`${bundle.url}/library/tree?pageSize=5`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      groups: Array<{ name: string; animes: Array<{ songs: Array<{ videoKey: string }> }> }>;
      totalSongs: number;
      view?: string;
    };
    expect(body.totalSongs).toBeGreaterThan(0);
    expect(body.groups.length).toBeGreaterThan(0);
    expect(body.groups[0]?.animes[0]?.songs[0]?.videoKey).toBeTruthy();
    expect(body.view).toBe('tree');
  });

  it('GET /library/tree?sort=popularity returns groups ordered by franchise popularity', async () => {
    const res = await fetch(`${bundle.url}/library/tree?sort=popularity&pageSize=5`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      groups: Array<{ name: string }>;
    };
    expect(body.groups.length).toBeGreaterThan(0);
  });

  it('GET /library/tree?sort=franchise_desc returns descending franchise names', async () => {
    const res = await fetch(`${bundle.url}/library/tree?sort=franchise_desc&pageSize=10`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { groups: Array<{ name: string }> };
    const names = body.groups.map((g) => g.name);
    const sorted = [...names].sort((a, b) => b.localeCompare(a, 'fr'));
    expect(names).toEqual(sorted);
  });

  it('GET /library/tree?q=naruto switches to search pagination mode', async () => {
    const res = await fetch(`${bundle.url}/library/tree?q=naruto&pageSize=5`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      view?: string;
      pagination: { totalItems: number; pageSize: number };
      totalSongs: number;
    };
    expect(body.view).toBe('search');
    expect(body.pagination.totalItems).toBe(body.totalSongs);
    expect(body.pagination.pageSize).toBe(5);
  });

  it('GET /library/tree?songType=OP,ED accepts multiple song types', async () => {
    const res = await fetch(`${bundle.url}/library/tree?songType=OP,ED&pageSize=3`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      groups: Array<{ animes: Array<{ songs: Array<{ songType: string }> }> }>;
    };
    const types = new Set(
      body.groups.flatMap((g) => g.animes.flatMap((a) => a.songs.map((s) => s.songType))),
    );
    for (const t of types) {
      expect(['OP', 'ED']).toContain(t);
    }
  });

  it('GET /library/tree?difficulty=EASY,MEDIUM accepts multiple difficulties', async () => {
    const res = await fetch(`${bundle.url}/library/tree?difficulty=EASY,MEDIUM&pageSize=3`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      groups: Array<{ animes: Array<{ songs: Array<{ difficulty: string }> }> }>;
    };
    const diffs = new Set(
      body.groups.flatMap((g) => g.animes.flatMap((a) => a.songs.map((s) => s.difficulty))),
    );
    for (const d of diffs) {
      expect(['EASY', 'MEDIUM']).toContain(d);
    }
  });

  it('GET /library/song/:id returns a playable song or 404', async () => {
    const treeRes = await fetch(`${bundle.url}/library/tree?pageSize=1`);
    const tree = (await treeRes.json()) as {
      groups: Array<{ animes: Array<{ songs: Array<{ id: number }> }> }>;
    };
    const songId = tree.groups[0]?.animes[0]?.songs[0]?.id;
    expect(songId).toBeTruthy();

    const res = await fetch(`${bundle.url}/library/song/${songId}`);
    expect(res.status).toBe(200);
    const song = (await res.json()) as {
      id: number;
      videoKey: string;
      likeCount: number;
      anime: { popularity: number };
    };
    expect(song.id).toBe(songId);
    expect(song.videoKey).toBeTruthy();
    expect(typeof song.likeCount).toBe('number');
    expect(typeof song.anime.popularity).toBe('number');

    const missing = await fetch(`${bundle.url}/library/song/999999999`);
    expect(missing.status).toBe(404);
  });

  it('GET /library/songs?sort=likes returns songs ordered by likeCount desc', async () => {
    const res = await fetch(`${bundle.url}/library/songs?sort=likes&pageSize=10`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      songs: Array<{ likeCount: number; anime: { popularity: number } }>;
      pagination: { totalItems: number };
    };
    expect(body.songs.length).toBeGreaterThan(0);
    expect(typeof body.songs[0]?.anime.popularity).toBe('number');
    for (let i = 1; i < body.songs.length; i += 1) {
      expect(body.songs[i - 1]!.likeCount).toBeGreaterThanOrEqual(body.songs[i]!.likeCount);
    }
  });

  it('GET /library/animes paginates by anime with nested songs and popularity', async () => {
    const res = await fetch(`${bundle.url}/library/animes?pageSize=5`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      animes: Array<{
        name: string;
        popularity: number;
        songs: Array<{ id: number; likeCount: number }>;
      }>;
      pagination: { totalItems: number; pageSize: number };
      totalSongs: number;
    };
    expect(body.animes.length).toBeGreaterThan(0);
    expect(body.animes.length).toBeLessThanOrEqual(5);
    expect(typeof body.animes[0]?.popularity).toBe('number');
    expect(body.animes[0]?.songs.length).toBeGreaterThan(0);
    expect(body.totalSongs).toBeGreaterThan(0);
  });

  it('GET /library/songs?liked=liked without auth returns empty, not the catalogue', async () => {
    const res = await fetch(`${bundle.url}/library/songs?liked=liked&pageSize=24`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      songs: unknown[];
      pagination: { totalItems: number };
    };
    expect(body.songs).toEqual([]);
    expect(body.pagination.totalItems).toBe(0);
  });

  it('GET /library/likes/ids without a token is 401 in French', async () => {
    const res = await fetch(`${bundle.url}/library/likes/ids`);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Jeton/);
  });

  it('GET /library/tree caps nested songs per anime', async () => {
    const res = await fetch(`${bundle.url}/library/tree?pageSize=20`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      groups: Array<{
        animes: Array<{ songs: unknown[]; songCount: number }>;
      }>;
    };
    expect(body.groups.length).toBeGreaterThan(0);
    for (const group of body.groups) {
      for (const anime of group.animes) {
        expect(anime.songs.length).toBeLessThanOrEqual(MAX_NESTED_SONGS_PER_ANIME);
        expect(anime.songCount).toBeGreaterThanOrEqual(anime.songs.length);
      }
    }
  });

  it('GET /library/songs?animeId= returns only that anime', async () => {
    const treeRes = await fetch(`${bundle.url}/library/animes?pageSize=5`);
    expect(treeRes.status).toBe(200);
    const tree = (await treeRes.json()) as {
      animes: Array<{ id: number }>;
    };
    const animeId = tree.animes[0]?.id;
    expect(animeId).toBeGreaterThan(0);
    const res = await fetch(`${bundle.url}/library/songs?animeId=${animeId}&pageSize=96`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      songs: Array<{ anime: { id: number } }>;
      pagination: { totalItems: number };
    };
    expect(body.songs.length).toBeGreaterThan(0);
    expect(body.songs.every((song) => song.anime.id === animeId)).toBe(true);
  });
});
