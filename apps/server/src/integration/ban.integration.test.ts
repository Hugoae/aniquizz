import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { clearModeration, setModeration } from '../test/dbHelpers';
import { hasIntegrationEnv } from '../test/env';
import { connectSocket, connectSocketExpectFail } from '../test/socketHelpers';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';

describe.skipIf(!hasIntegrationEnv)('ban at connect integration', () => {
  let bundle: ServerBundle;

  beforeAll(async () => {
    bundle = await createServerBundle();
  });

  afterAll(async () => {
    await clearModeration(TEST_USER_IDS.admin);
    await bundle.close();
  });

  afterEach(async () => {
    await clearModeration(TEST_USER_IDS.admin);
  });

  it('rejects a banned user during the socket handshake', async () => {
    const bannedUntil = new Date(Date.now() + 60 * 60_000);
    await setModeration(TEST_USER_IDS.admin, { bannedUntil });

    const token = await getTestAccessToken('admin');
    const err = await connectSocketExpectFail(bundle.url, token, 'admin_dev');
    expect(err.message).toMatch(/BANNED|banned/i);
  });

  it('allows the user again after the ban expires in DB', async () => {
    await setModeration(TEST_USER_IDS.admin, {
      bannedUntil: new Date(Date.now() - 60_000),
    });

    const token = await getTestAccessToken('admin');
    const socket = await connectSocket(bundle.url, token, 'admin_dev');
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });
});
