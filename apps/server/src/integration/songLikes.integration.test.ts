import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { clearLibraryMetaCache } from '../modules/catalogue/libraryMeta';
import { clearLibrarySearchCache } from '../modules/catalogue/librarySearch';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';

describe.skipIf(!hasIntegrationEnv)('song likes integration', () => {
  let bundle: ServerBundle;
  let token: string;
  let songId: number;

  const authHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  const unlikeSong = async () => {
    await fetch(`${bundle.url}/library/songs/${songId}/like`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  };

  beforeAll(async () => {
    clearLibraryMetaCache();
    clearLibrarySearchCache();
    bundle = await createServerBundle();
    token = await getTestAccessToken('admin');

    const treeRes = await fetch(`${bundle.url}/library/tree?pageSize=1`);
    const tree = (await treeRes.json()) as {
      groups: Array<{ animes: Array<{ songs: Array<{ id: number }> }> }>;
    };
    songId = tree.groups[0]?.animes[0]?.songs[0]?.id;
    expect(songId).toBeTruthy();

    await unlikeSong();
  });

  afterAll(async () => {
    await unlikeSong();
    await bundle.close();
  });

  it('PUT /library/songs/:id/like then GET song returns liked: true', async () => {
    const baseline = await prisma.song.findUnique({
      where: { id: songId },
      select: { likeCount: true },
    });

    const putRes = await fetch(`${bundle.url}/library/songs/${songId}/like`, {
      method: 'PUT',
      headers: authHeaders(),
    });
    expect(putRes.status).toBe(200);
    const putBody = (await putRes.json()) as { songId: number; liked: boolean };
    expect(putBody).toEqual({ songId, liked: true });

    const afterLike = await prisma.song.findUnique({
      where: { id: songId },
      select: { likeCount: true },
    });
    expect(afterLike?.likeCount).toBe((baseline?.likeCount ?? 0) + 1);

    const songRes = await fetch(`${bundle.url}/library/song/${songId}`, {
      headers: authHeaders(),
    });
    expect(songRes.status).toBe(200);
    const song = (await songRes.json()) as { id: number; liked?: boolean; likeCount: number };
    expect(song.liked).toBe(true);
    expect(song.likeCount).toBe((baseline?.likeCount ?? 0) + 1);
  });

  it('GET /library/likes/ids includes the liked song', async () => {
    const res = await fetch(`${bundle.url}/library/likes/ids`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { songIds: number[]; total: number };
    expect(body.songIds).toContain(songId);
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /library/tree?liked=liked returns only liked songs for the user', async () => {
    const res = await fetch(`${bundle.url}/library/tree?liked=liked&pageSize=48`, {
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      groups: Array<{ animes: Array<{ songs: Array<{ id: number; liked?: boolean }> }> }>;
      totalSongs: number;
    };
    expect(body.totalSongs).toBeGreaterThanOrEqual(1);
    const ids = body.groups.flatMap((g) => g.animes.flatMap((a) => a.songs.map((s) => s.id)));
    expect(ids).toContain(songId);
    for (const id of ids) {
      const song = body.groups
        .flatMap((g) => g.animes.flatMap((a) => a.songs))
        .find((s) => s.id === id);
      expect(song?.liked).toBe(true);
    }
  });

  it('DELETE /library/songs/:id/like removes the like', async () => {
    await fetch(`${bundle.url}/library/songs/${songId}/like`, {
      method: 'PUT',
      headers: authHeaders(),
    });

    const beforeDelete = await prisma.song.findUnique({
      where: { id: songId },
      select: { likeCount: true },
    });
    expect(beforeDelete?.likeCount).toBeGreaterThanOrEqual(1);

    const delRes = await fetch(`${bundle.url}/library/songs/${songId}/like`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(delRes.status).toBe(200);
    const delBody = (await delRes.json()) as { songId: number; liked: boolean };
    expect(delBody).toEqual({ songId, liked: false });

    const afterUnlike = await prisma.song.findUnique({
      where: { id: songId },
      select: { likeCount: true },
    });
    expect(afterUnlike?.likeCount).toBe((beforeDelete?.likeCount ?? 1) - 1);

    const songRes = await fetch(`${bundle.url}/library/song/${songId}`, {
      headers: authHeaders(),
    });
    const song = (await songRes.json()) as { liked?: boolean; likeCount: number };
    expect(song.liked).toBeUndefined();
    expect(song.likeCount).toBe((beforeDelete?.likeCount ?? 1) - 1);
  });

  it('GET /library/users/:userId/favorites returns liked songs for a profile', async () => {
    await fetch(`${bundle.url}/library/songs/${songId}/like`, {
      method: 'PUT',
      headers: authHeaders(),
    });

    const meRes = await fetch(`${bundle.url}/library/likes/ids`, { headers: authHeaders() });
    const me = (await meRes.json()) as { songIds: number[] };
    expect(me.songIds.length).toBeGreaterThanOrEqual(1);

    const userId = TEST_USER_IDS.admin;

    const favRes = await fetch(`${bundle.url}/library/users/${userId}/favorites`);
    expect(favRes.status).toBe(200);
    const favBody = (await favRes.json()) as {
      songs: Array<{ id: number }>;
      pagination: { totalItems: number };
    };
    expect(favBody.pagination.totalItems).toBeGreaterThanOrEqual(1);
    expect(favBody.songs.map((s) => s.id)).toContain(songId);

    await unlikeSong();
  });

  it('GET /library/meta returns likedCount when authenticated', async () => {
    await fetch(`${bundle.url}/library/songs/${songId}/like`, {
      method: 'PUT',
      headers: authHeaders(),
    });

    const res = await fetch(`${bundle.url}/library/meta`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const meta = (await res.json()) as { likedCount?: number };
    expect(meta.likedCount).toBeGreaterThanOrEqual(1);

    await unlikeSong();
  });

  it('PUT /library/likes/pinned curates public profile favorites', async () => {
    await fetch(`${bundle.url}/library/songs/${songId}/like`, {
      method: 'PUT',
      headers: authHeaders(),
    });

    const pinRes = await fetch(`${bundle.url}/library/likes/pinned`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ songIds: [songId] }),
    });
    expect(pinRes.status).toBe(200);
    const pinned = (await pinRes.json()) as { songIds: number[] };
    expect(pinned.songIds).toEqual([songId]);

    const userId = TEST_USER_IDS.admin;
    const favRes = await fetch(`${bundle.url}/library/users/${userId}/favorites`);
    expect(favRes.status).toBe(200);
    const favBody = (await favRes.json()) as {
      songs: Array<{ id: number }>;
      curated?: boolean;
    };
    expect(favBody.curated).toBe(true);
    expect(favBody.songs.map((s) => s.id)).toEqual([songId]);

    await fetch(`${bundle.url}/library/likes/pinned`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ songIds: [] }),
    });
    await unlikeSong();
  });

  it('hides favorites from public profile when showFavoriteSongs is false', async () => {
    await fetch(`${bundle.url}/library/songs/${songId}/like`, {
      method: 'PUT',
      headers: authHeaders(),
    });

    const userId = TEST_USER_IDS.admin;
    await prisma.profile.update({
      where: { id: userId },
      data: { showFavoriteSongs: false },
    });

    const favRes = await fetch(`${bundle.url}/library/users/${userId}/favorites`);
    expect(favRes.status).toBe(200);
    const favBody = (await favRes.json()) as {
      songs: unknown[];
      visible?: boolean;
    };
    expect(favBody.visible).toBe(false);
    expect(favBody.songs).toHaveLength(0);

    await prisma.profile.update({
      where: { id: userId },
      data: { showFavoriteSongs: true },
    });
    await unlikeSong();
  });
});
