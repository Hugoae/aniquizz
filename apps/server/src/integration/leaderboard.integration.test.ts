import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import type { LeaderboardResponse } from '@aniquizz/shared';
import { LEADERBOARD_ACCURACY_MIN_ROUNDS } from '@aniquizz/shared';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { env } from '../config/env';
import { signTestToken } from '../test/testJwt';
import {
  clearLeaderboardSnapshotCache,
  setLeaderboardCacheTtlMsForTests,
} from '../modules/profile/leaderboardCache';

const TEST_PREFIX = 'lb264-';
const TIE_XP = 1_234_567_890;

describe.skipIf(!hasIntegrationEnv)('leaderboard integration', () => {
  let bundle: ServerBundle;
  const createdIds: string[] = [];
  let throwawaySongId: number | null = null;

  const authHeaders = (userId: string, username: string) => {
    if (!env.SUPABASE_JWT_SECRET) return {};
    return {
      Authorization: `Bearer ${signTestToken(userId, username)}`,
      'Content-Type': 'application/json',
    };
  };

  const createProfile = async (suffix: string, data: Record<string, unknown>) => {
    const id = randomUUID();
    const username = `${TEST_PREFIX}${suffix}`;
    await prisma.profile.create({
      data: {
        id,
        username,
        email: `${username}@aniquizz.test`,
        avatar: 'default_avatar.png',
        ...data,
      },
    });
    createdIds.push(id);
    return { id, username };
  };

  const browse = async (query: string, headers: Record<string, string> = {}) => {
    const response = await fetch(`${bundle.url}/leaderboard${query}`, { headers });
    return response;
  };

  beforeAll(async () => {
    await prisma.profile.deleteMany({ where: { username: { startsWith: TEST_PREFIX } } });
    bundle = await createServerBundle();
  });

  beforeEach(async () => {
    setLeaderboardCacheTtlMsForTests(0);
    clearLeaderboardSnapshotCache();
    await prisma.httpRateLimitBucket.deleteMany();
    await prisma.profile.deleteMany({ where: { username: { startsWith: TEST_PREFIX } } });
    createdIds.length = 0;
  });

  afterAll(async () => {
    if (throwawaySongId) {
      await prisma.song.deleteMany({ where: { id: throwawaySongId } });
    }
    await prisma.profile.deleteMany({ where: { username: { startsWith: TEST_PREFIX } } });
    await prisma.httpRateLimitBucket.deleteMany();
    await bundle.close();
  });

  it('GET /leaderboard is publicly readable with the five-metric payload', async () => {
    const response = await browse('?metric=xp');
    expect(response.status).toBe(200);
    const body = (await response.json()) as LeaderboardResponse;
    expect(body.metric).toBe('xp');
    expect(body.pagination.page).toBe(1);
    expect(body.entries).toBeInstanceOf(Array);
    expect(body.podium).toBeInstanceOf(Array);
    expect(body.viewer).toBeNull();
  });

  it('rejects an unknown metric', async () => {
    const response = await browse('?metric=precision');
    expect(response.status).toBe(400);
  });

  it('rejects the retired streak metric', async () => {
    const response = await browse('?metric=streak');
    expect(response.status).toBe(400);
  });

  it('keeps rank 4 off the podium when ranks 2 and 3 are a tie', async () => {
    const firstXp = 2_147_000_000;
    const tiedXp = 2_146_000_000;
    const fourthXp = 2_145_000_000;
    const first = await createProfile('podium-1', { xp: firstXp, level: 50 });
    const tiedA = await createProfile('podium-2a', { xp: tiedXp, level: 40 });
    const tiedB = await createProfile('podium-2b', { xp: tiedXp, level: 40 });
    const fourth = await createProfile('podium-4', { xp: fourthXp, level: 30 });

    const response = await browse('?metric=xp&pageSize=50');
    expect(response.status).toBe(200);
    const body = (await response.json()) as LeaderboardResponse;
    const podiumIds = new Set(body.podium.flatMap((group) => group.entries.map((entry) => entry.id)));
    expect(podiumIds.has(first.id)).toBe(true);
    expect(podiumIds.has(tiedA.id)).toBe(true);
    expect(podiumIds.has(tiedB.id)).toBe(true);
    expect(podiumIds.has(fourth.id)).toBe(false);
    expect(body.podium.some((group) => group.rank === 4)).toBe(false);
    expect(body.entries.some((entry) => entry.id === fourth.id)).toBe(true);
  });

  it('does not split public rate-limit buckets on spoofed X-Forwarded-For', async () => {
    const first = await browse('?metric=games', { 'X-Forwarded-For': '198.51.100.10' });
    const second = await browse('?metric=games', { 'X-Forwarded-For': '198.51.100.11' });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const remainingFirst = Number(first.headers.get('RateLimit-Remaining'));
    const remainingSecond = Number(second.headers.get('RateLimit-Remaining'));
    expect(remainingSecond).toBe(remainingFirst - 1);
  });

  it('reuses a public snapshot within the cache window', async () => {
    setLeaderboardCacheTtlMsForTests(60_000);
    const player = await createProfile('cached', { xp: TIE_XP, level: 12 });
    const first = await browse('?metric=xp&pageSize=50');
    expect(first.status).toBe(200);
    await prisma.profile.update({ where: { id: player.id }, data: { xp: 1 } });
    const second = await browse('?metric=xp&pageSize=50');
    const body = (await second.json()) as LeaderboardResponse;
    const row = body.entries.find((entry) => entry.id === player.id);
    expect(row?.metric).toBe('xp');
    if (row?.metric === 'xp') expect(row.xp).toBe(TIE_XP);
  });

  it('attaches an off-page viewer on top of a cached public snapshot', async () => {
    if (!env.SUPABASE_JWT_SECRET) return;
    setLeaderboardCacheTtlMsForTests(60_000);
    const viewer = await createProfile('cache-viewer', { xp: 42, level: 3 });
    await createProfile('cache-top', { xp: TIE_XP, level: 40 });
    const primed = await browse('?metric=xp&page=1&pageSize=1');
    expect(primed.status).toBe(200);
    const response = await browse(
      '?metric=xp&page=1&pageSize=1',
      authHeaders(viewer.id, viewer.username),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as LeaderboardResponse;
    expect(body.viewer?.status).toBe('ranked');
    if (body.viewer?.status === 'ranked') {
      expect(body.viewer.entry.id).toBe(viewer.id);
      expect(body.viewer.page).toBeGreaterThan(1);
    }
  });

  it('ranks equal victories by win rate so they are not tied', async () => {
    const lowerRate = await createProfile('win-low', {
      xp: 10,
      gamesWon: 8_888,
      gamesPlayed: 90,
    });
    const higherRate = await createProfile('win-high', {
      xp: 10,
      gamesWon: 8_888,
      gamesPlayed: 12,
    });

    const response = await browse('?metric=victories&pageSize=50');
    expect(response.status).toBe(200);
    const body = (await response.json()) as LeaderboardResponse;
    const ranked = body.entries.filter(
      (entry) => entry.id === lowerRate.id || entry.id === higherRate.id,
    );
    expect(ranked).toHaveLength(2);
    expect(ranked[0]?.id).toBe(higherRate.id);
    expect(ranked[1]?.id).toBe(lowerRate.id);
    expect(ranked[0]?.rank).toBeLessThan(ranked[1]?.rank ?? Number.POSITIVE_INFINITY);
  });

  it('assigns the same global rank across a pagination boundary', async () => {
    await createProfile('aaa', { xp: TIE_XP, level: 40 });
    await createProfile('aab', { xp: TIE_XP, level: 40 });
    await createProfile('aac', { xp: TIE_XP, level: 40 });

    const first = await browse(`?metric=xp&page=1&pageSize=2`);
    const second = await browse(`?metric=xp&page=2&pageSize=2`);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const page1 = (await first.json()) as LeaderboardResponse;
    const page2 = (await second.json()) as LeaderboardResponse;
    const tied = [...page1.entries, ...page2.entries].filter((entry) =>
      entry.username.startsWith(TEST_PREFIX),
    );
    expect(tied.length).toBeGreaterThanOrEqual(3);
    const ranks = new Set(tied.map((entry) => entry.rank));
    expect(ranks.size).toBe(1);
    expect(page2.entries.some((entry) => entry.username === `${TEST_PREFIX}aac`)).toBe(true);
  });

  it('hides bots and currently banned players, then restores expired bans', async () => {
    const visible = await createProfile('visible', { xp: TIE_XP - 10, level: 10 });
    await prisma.profile.create({
      data: {
        id: `bot-${randomUUID()}`,
        username: `${TEST_PREFIX}bot`,
        email: `${TEST_PREFIX}bot@aniquizz.test`,
        xp: TIE_XP,
        level: 99,
      },
    });
    const banned = await createProfile('banned', {
      xp: TIE_XP,
      level: 20,
      bannedUntil: new Date(Date.now() + 86_400_000),
    });
    const expired = await createProfile('expired', {
      xp: TIE_XP - 11,
      level: 12,
      bannedUntil: new Date(Date.now() - 86_400_000),
    });

    const response = await browse('?metric=xp&pageSize=50');
    const body = (await response.json()) as LeaderboardResponse;
    const names = body.entries.map((entry) => entry.username);
    expect(names).toContain(visible.username);
    expect(names).toContain(expired.username);
    expect(names).not.toContain(`${TEST_PREFIX}bot`);
    expect(names).not.toContain(banned.username);
  });

  it('counts unique discoveries and ignores replays', async () => {
    const songs = await prisma.song.findMany({
      where: { downloadStatus: 'COMPLETED' },
      take: 2,
      select: { id: true },
    });
    expect(songs.length).toBeGreaterThanOrEqual(2);
    const explorer = await createProfile('pokedex', { xp: 1, gamesPlayed: 2 });
    await prisma.songHistory.create({
      data: { profileId: explorer.id, songId: songs[0]!.id, playCount: 4 },
    });
    await prisma.songHistory.create({
      data: { profileId: explorer.id, songId: songs[1]!.id, playCount: 1 },
    });

    const response = await browse('?metric=discoveries&pageSize=50');
    const body = (await response.json()) as LeaderboardResponse;
    const row = body.entries.find((entry) => entry.id === explorer.id);
    expect(row?.metric).toBe('discoveries');
    if (row?.metric === 'discoveries') {
      expect(row.discoveries).toBe(2);
    }
  });

  it('drops a discovery when the catalogue song is deleted', async () => {
    const anime = await prisma.anime.findFirst({ select: { id: true } });
    expect(anime).toBeTruthy();
    const explorer = await createProfile('cascade', { xp: 1, gamesPlayed: 1 });
    const song = await prisma.song.create({
      data: {
        title: `${TEST_PREFIX}temp`,
        artist: 'Test',
        songType: 'OP',
        sequence: 1,
        videoKey: `${TEST_PREFIX}${randomUUID()}`,
        animeId: anime!.id,
        downloadStatus: 'COMPLETED',
      },
    });
    throwawaySongId = song.id;
    await prisma.songHistory.create({
      data: { profileId: explorer.id, songId: song.id },
    });
    await prisma.song.delete({ where: { id: song.id } });
    throwawaySongId = null;

    const remaining = await prisma.songHistory.count({ where: { profileId: explorer.id } });
    expect(remaining).toBe(0);
  });

  it('keeps a 49-round player off the accuracy board and admits 50 rounds', async () => {
    const short = await createProfile('acc-short', {
      xp: 10,
      totalGuesses: LEADERBOARD_ACCURACY_MIN_ROUNDS - 1,
      correctGuesses: LEADERBOARD_ACCURACY_MIN_ROUNDS - 1,
    });
    const ready = await createProfile('acc-ready', {
      xp: 10,
      totalGuesses: LEADERBOARD_ACCURACY_MIN_ROUNDS,
      correctGuesses: 40,
    });

    const response = await browse('?metric=accuracy&pageSize=50');
    const body = (await response.json()) as LeaderboardResponse;
    const ids = body.entries.map((entry) => entry.id);
    expect(ids).not.toContain(short.id);
    expect(ids).toContain(ready.id);
    const row = body.entries.find((entry) => entry.id === ready.id);
    if (row?.metric === 'accuracy') {
      expect(row.accuracy).toBe(80);
      expect(row.totalGuesses).toBe(50);
    }
  });

  it('returns an authenticated viewer rank even off-page', async () => {
    if (!env.SUPABASE_JWT_SECRET) return;
    const viewer = await createProfile('viewer', { xp: 42, level: 3 });
    await createProfile('top-a', { xp: TIE_XP, level: 40 });
    await createProfile('top-b', { xp: TIE_XP, level: 40 });

    const response = await browse(
      '?metric=xp&page=1&pageSize=1',
      authHeaders(viewer.id, viewer.username),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as LeaderboardResponse;
    expect(body.viewer?.status).toBe('ranked');
    if (body.viewer?.status === 'ranked') {
      expect(body.viewer.entry.id).toBe(viewer.id);
      expect(body.viewer.page).toBeGreaterThan(1);
    }
  });

  it('explains the accuracy gate to an ineligible viewer', async () => {
    if (!env.SUPABASE_JWT_SECRET) return;
    const viewer = await createProfile('gate', {
      xp: 5,
      totalGuesses: 10,
      correctGuesses: 10,
    });
    const response = await browse(
      '?metric=accuracy',
      authHeaders(viewer.id, viewer.username),
    );
    const body = (await response.json()) as LeaderboardResponse;
    expect(body.viewer).toEqual({
      status: 'ineligible',
      totalGuesses: 10,
      requiredGuesses: LEADERBOARD_ACCURACY_MIN_ROUNDS,
    });
  });

  it('rate-limits public reads', async () => {
    let blocked = 0;
    for (let i = 0; i < 91; i += 1) {
      const response = await browse('?metric=games');
      if (response.status === 429) blocked += 1;
    }
    expect(blocked).toBeGreaterThan(0);
  });
});
