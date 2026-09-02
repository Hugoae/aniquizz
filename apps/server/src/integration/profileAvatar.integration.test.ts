import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { connectSocket, onceEvent, type TestSocket } from '../test/socketHelpers';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';

describe.skipIf(!hasIntegrationEnv)('profile avatar URL trust', () => {
  let bundle: ServerBundle;
  let socket: TestSocket;

  beforeAll(async () => {
    bundle = await createServerBundle();
    const token = await getTestAccessToken('admin');
    socket = await connectSocket(bundle.url, token, 'admin_dev');
  });

  afterAll(async () => {
    socket.disconnect();
    await bundle.close();
  });

  it('rejects an avatar URL outside the caller\'s avatars object', async () => {
    const before = await prisma.profile.findUnique({
      where: { id: TEST_USER_IDS.admin },
      select: { avatar: true },
    });
    expect(before).toBeTruthy();

    const errPromise = onceEvent<{ message: string }>(socket, 'error', 8_000);
    socket.emit('update_profile_data', { avatarUrl: 'https://evil.example/pwn.png' });
    const err = await errPromise;
    expect(err.message).toMatch(/avatar/i);

    const after = await prisma.profile.findUnique({
      where: { id: TEST_USER_IDS.admin },
      select: { avatar: true },
    });
    expect(after?.avatar).toBe(before?.avatar);
  });
});
