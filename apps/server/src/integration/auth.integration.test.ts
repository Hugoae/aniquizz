import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import {
  connectSocket,
  connectSocketExpectFail,
  type TestSocket,
} from '../test/socketHelpers';
import { getTestAccessToken } from '../test/testJwt';

describe.skipIf(!hasIntegrationEnv)('socket auth integration', () => {
  let bundle: ServerBundle;

  beforeAll(async () => {
    bundle = await createServerBundle();
  });

  afterAll(async () => {
    await bundle.close();
  });

  it('accepts a valid authenticated test token', async () => {
    const token = await getTestAccessToken('admin');
    const socket = await connectSocket(bundle.url, token, 'admin_dev');
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });

  it('rejects an invalid token at connect time', async () => {
    const err = await connectSocketExpectFail(bundle.url, 'not-a-valid-jwt', 'guest');
    expect(err.message).toMatch(/INVALID_TOKEN|invalid|Unauthorized|jwt/i);
  });

  it('allows guest sockets without a token (read-only)', async () => {
    const socket = await connectSocket(bundle.url, '', 'Guest');
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });
});

describe.skipIf(!hasIntegrationEnv)('lobby auth guard integration', () => {
  let bundle: ServerBundle;
  let guestSocket: TestSocket;

  beforeAll(async () => {
    bundle = await createServerBundle();
    guestSocket = await connectSocket(bundle.url, '', 'Guest');
  });

  afterAll(async () => {
    guestSocket.disconnect();
    await bundle.close();
  });

  it('blocks unauthenticated lobby:create', async () => {
    const errorPromise = onceError(guestSocket);
    guestSocket.emit('lobby:create', {
      username: 'Guest',
      avatar: 'player1',
      settings: { mode: 'solo', maxPlayers: 1 },
    });
    const err = await errorPromise;
    expect(err.message).toMatch(/connecté/i);
  });
});

function onceError(socket: TestSocket): Promise<{ message: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for error event')), 10_000);
    socket.once('error', (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}
