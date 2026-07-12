import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import type { LobbyJoinedPayload, WatchedPoolStats } from '@aniquizz/shared';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { connectSocket, onceEvent, type TestSocket } from '../test/socketHelpers';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';

const hasMalEnv = Boolean(process.env.MAL_CLIENT_ID?.trim());
const TEST_MAL_USERNAME = process.env.TEST_MAL_USERNAME?.trim() || 'Hugo_ae';

describe.skipIf(!hasIntegrationEnv)('watched mode integration', () => {
  let bundle: ServerBundle;
  let socket: TestSocket;
  let roomId: string;
  let previousAnilist: string | null = null;
  let previousMal: string | null = null;

  beforeAll(async () => {
    bundle = await createServerBundle();

    const profile = await prisma.profile.findUnique({
      where: { id: TEST_USER_IDS.admin },
      select: { anilistUsername: true, malUsername: true },
    });
    previousAnilist = profile?.anilistUsername ?? null;
    previousMal = profile?.malUsername ?? null;
    await prisma.profile.update({
      where: { id: TEST_USER_IDS.admin },
      data: { anilistUsername: null, malUsername: null },
    });

    const token = await getTestAccessToken('admin');
    socket = await connectSocket(bundle.url, token, 'admin_dev');

    socket.emit('lobby:create', {
      username: 'admin_dev',
      avatar: 'player1',
      settings: {
        mode: 'solo',
        maxPlayers: 1,
        soundSelection: 'watched',
        watchedMode: 'union',
        soundCount: 5,
      },
    });
    const joined = await onceEvent<LobbyJoinedPayload>(socket, 'lobby:joined');
    roomId = joined.roomId;
  });

  afterAll(async () => {
    await prisma.profile.update({
      where: { id: TEST_USER_IDS.admin },
      data: { anilistUsername: previousAnilist, malUsername: previousMal },
    });
    socket.disconnect();
    await bundle.close();
  });

  it('aborts start when watched mode has no linked list account', async () => {
    const errorPromise = onceEvent<{ message: string }>(socket, 'error', 60_000);
    socket.emit('start_game', { roomId });
    const err = await errorPromise;
    expect(err.message).toMatch(/AniList|MyAnimeList|liste|watched|compte/i);
  });

  it.skipIf(!hasMalEnv)(
    'returns positive pool stats when a MAL account is linked',
    async () => {
      await prisma.profile.update({
        where: { id: TEST_USER_IDS.admin },
        data: { malUsername: TEST_MAL_USERNAME, anilistUsername: null },
      });

      try {
        const statsPromise = onceEvent<WatchedPoolStats>(socket, 'watched:pool_stats', 60_000);
        socket.emit('watched:get_pool_stats', {
          soundCount: 5,
          difficulty: ['easy', 'medium', 'hard'],
          types: ['opening', 'ending'],
        });
        const stats = await statsPromise;
        expect(stats.animeCount).toBeGreaterThan(0);
        expect(stats.playableSongs).toBeGreaterThan(0);
      } finally {
        await prisma.profile.update({
          where: { id: TEST_USER_IDS.admin },
          data: { malUsername: null },
        });
      }
    },
    90_000,
  );
});
