import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { connectSocket, type TestSocket } from '../test/socketHelpers';
import { getTestAccessToken } from '../test/testJwt';

describe.skipIf(!hasIntegrationEnv)('delete account integration', () => {
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

  it('rejects deletion when confirmUsername does not match', async () => {
    const errPromise = onceProfileError(socket);
    socket.emit('profile:delete_account', { confirmUsername: 'definitely_not_admin_dev' });
    const err = await errPromise;
    expect(err.message).toMatch(/pseudo/i);

    const admin = await prisma.profile.findFirst({ where: { username: 'admin_dev' } });
    expect(admin).not.toBeNull();
  });
});

function onceProfileError(socket: TestSocket): Promise<{ message: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for profile:error')), 10_000);
    socket.once('profile:error', (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}
