import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { connectSocket, type TestSocket } from '../test/socketHelpers';
import { getTestAccessToken } from '../test/testJwt';

describe.skipIf(!hasIntegrationEnv)('rate limit integration', () => {
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

  it('rate-limits rapid lobby:create calls', async () => {
    const errors: string[] = [];
    socket.on('error', (p) => errors.push(p.message));

    for (let i = 0; i < 6; i++) {
      socket.emit('lobby:create', {
        username: 'admin_dev',
        avatar: 'player1',
        settings: { mode: 'solo', maxPlayers: 1, roomName: `Rate ${i}` },
      });
    }

    await new Promise((r) => setTimeout(r, 500));
    expect(errors.some((m) => /patienter|requêtes/i.test(m))).toBe(true);
  });
});
