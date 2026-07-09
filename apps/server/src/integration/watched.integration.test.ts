import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import type { LobbyJoinedPayload } from '@aniquizz/shared';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { connectSocket, onceEvent, type TestSocket } from '../test/socketHelpers';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';

describe.skipIf(!hasIntegrationEnv)('watched mode integration', () => {
  let bundle: ServerBundle;
  let socket: TestSocket;
  let roomId: string;
  let previousAnilist: string | null = null;

  beforeAll(async () => {
    bundle = await createServerBundle();

    const profile = await prisma.profile.findUnique({
      where: { id: TEST_USER_IDS.admin },
      select: { anilistUsername: true },
    });
    previousAnilist = profile?.anilistUsername ?? null;
    await prisma.profile.update({
      where: { id: TEST_USER_IDS.admin },
      data: { anilistUsername: null },
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
      data: { anilistUsername: previousAnilist },
    });
    socket.disconnect();
    await bundle.close();
  });

  it('aborts start when watched mode has no linked AniList account', async () => {
    const errorPromise = onceEvent<{ message: string }>(socket, 'error', 60_000);
    socket.emit('start_game', { roomId });
    const err = await errorPromise;
    expect(err.message).toMatch(/AniList|liste|watched|compte/i);
  });
});
