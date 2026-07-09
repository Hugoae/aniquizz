import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { LobbyJoinedPayload, SanctionUpdatePayload } from '@aniquizz/shared';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { adminMute } from '../test/adminHttpHelpers';
import { clearModeration, setModeration } from '../test/dbHelpers';
import { hasIntegrationEnv } from '../test/env';
import { connectSocket, onceEvent, type TestSocket } from '../test/socketHelpers';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';

describe.skipIf(!hasIntegrationEnv)('mute at chat integration', () => {
  let bundle: ServerBundle;
  let socket: TestSocket;
  let roomId: string;

  beforeAll(async () => {
    bundle = await createServerBundle();
    const token = await getTestAccessToken('admin');
    socket = await connectSocket(bundle.url, token, 'admin_dev');

    socket.emit('lobby:create', {
      username: 'admin_dev',
      avatar: 'player1',
      settings: { mode: 'solo', maxPlayers: 1 },
    });
    const joined = await onceEvent<LobbyJoinedPayload>(socket, 'lobby:joined');
    roomId = joined.roomId;
  });

  afterAll(async () => {
    await clearModeration(TEST_USER_IDS.admin);
    socket.disconnect();
    await bundle.close();
  });

  afterEach(async () => {
    await clearModeration(TEST_USER_IDS.admin);
  });

  it('delivers chat messages when the user is not muted', async () => {
    const messagePromise = onceEvent<{ content: string }>(socket, 'chat:message');
    socket.emit('chat:sendMessage', { roomId, content: 'hello integration test' });
    const message = await messagePromise;
    expect(message.content).toBe('hello integration test');
  });

  it('blocks chat when mutedUntil is active', async () => {
    await setModeration(TEST_USER_IDS.admin, {
      mutedUntil: new Date(Date.now() + 60 * 60_000),
    });

    // Reconnect so socket.data picks up the new mutedUntil from DB.
    socket.disconnect();
    const token = await getTestAccessToken('admin');
    socket = await connectSocket(bundle.url, token, 'admin_dev');
    socket.emit('lobby:join', {
      roomId,
      username: 'admin_dev',
      avatar: 'player1',
    });
    await onceEvent(socket, 'lobby:joined');

    const errorPromise = onceEvent<{ message: string }>(socket, 'error');
    socket.emit('chat:sendMessage', { roomId, content: 'should be blocked' });
    const err = await errorPromise;
    expect(err.message).toMatch(/silence|modération/i);
  });

  it('blocks chat immediately when muted via admin API (no reconnect)', async () => {
    const token = await getTestAccessToken('admin');
    await adminMute(bundle.url, token, TEST_USER_IDS.admin, 60);

    const errorPromise = onceEvent<{ message: string }>(socket, 'error');
    socket.emit('chat:sendMessage', { roomId, content: 'blocked via admin api' });
    const err = await errorPromise;
    expect(err.message).toMatch(/silence|modération/i);
  });

  it('unblocks chat immediately when mute is lifted via admin API', async () => {
    const token = await getTestAccessToken('admin');
    await adminMute(bundle.url, token, TEST_USER_IDS.admin, 60);
    await adminMute(bundle.url, token, TEST_USER_IDS.admin, null);

    const messagePromise = onceEvent<{ content: string }>(socket, 'chat:message');
    socket.emit('chat:sendMessage', { roomId, content: 'unblocked via admin api' });
    const message = await messagePromise;
    expect(message.content).toBe('unblocked via admin api');
  });

  it('emits profile:sanction_updated when muted via admin API', async () => {
    const token = await getTestAccessToken('admin');
    const payloadPromise = onceEvent<SanctionUpdatePayload>(socket, 'profile:sanction_updated');
    await adminMute(bundle.url, token, TEST_USER_IDS.admin, 60);
    const payload = await payloadPromise;
    expect(payload.mutedUntil).toBeTruthy();
    await adminMute(bundle.url, token, TEST_USER_IDS.admin, null);
  });
});
