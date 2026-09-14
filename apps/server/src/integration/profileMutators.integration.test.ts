import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '@aniquizz/shared';
import { prisma } from '@aniquizz/database';
import { INVALID_SOCKET_PAYLOAD_MESSAGE } from '../core/parseSocketPayload';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { connectSocket, onceEvent, type TestSocket } from '../test/socketHelpers';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';

describe.skipIf(!hasIntegrationEnv)('profile mutating payloads', () => {
  let bundle: ServerBundle;
  let socket: TestSocket;
  let previousUsername: string | null = null;

  beforeAll(async () => {
    bundle = await createServerBundle();
    const token = await getTestAccessToken('admin');
    socket = await connectSocket(bundle.url, token, 'admin_dev');
    const row = await prisma.profile.findUnique({
      where: { id: TEST_USER_IDS.admin },
      select: { username: true },
    });
    previousUsername = row?.username ?? null;
  });

  afterAll(async () => {
    socket.disconnect();
    await bundle.close();
  });

  it('rejects a missing update_profile_data payload', async () => {
    const errPromise = onceEvent<{ message: string }>(socket, 'error', 8_000);
    socket.emit('update_profile_data', undefined as unknown as { username: string });
    const err = await errPromise;
    expect(err.message).toBe(INVALID_SOCKET_PAYLOAD_MESSAGE);
  });

  it('rejects an oversized username without writing it', async () => {
    const before = previousUsername;
    expect(before).toBeTruthy();

    const errPromise = onceEvent<{ message: string }>(socket, 'error', 8_000);
    socket.emit('update_profile_data', {
      username: 'x'.repeat(GAME_CONFIG.LIMITS.MAX_USERNAME_LENGTH + 1),
    });
    const err = await errPromise;
    expect(err.message).toBe(INVALID_SOCKET_PAYLOAD_MESSAGE);

    const after = await prisma.profile.findUnique({
      where: { id: TEST_USER_IDS.admin },
      select: { username: true },
    });
    expect(after?.username).toBe(before);
  });

  it('emits profile:error (not friends:error) when the public profile is missing', async () => {
    const profileErr = onceEvent<{ message: string }>(socket, 'profile:error', 8_000);
    const friendsErrors: string[] = [];
    const onFriends = (p: { message: string }) => friendsErrors.push(p.message);
    socket.on('friends:error', onFriends);
    socket.emit('profile:get_public', { userId: 'bot-not-a-real-player' });
    const err = await profileErr;
    socket.off('friends:error', onFriends);
    expect(err.message).toMatch(/introuvable/i);
    expect(friendsErrors).toEqual([]);
  });
});
