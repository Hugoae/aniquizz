import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { LobbyJoinedPayload } from '@aniquizz/shared';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
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
    const token = await getTestAccessToken('playerOne');
    socket = await connectSocket(bundle.url, token, 'player_one');

    socket.emit('lobby:create', {
      username: 'player_one',
      avatar: 'player1',
      settings: { mode: 'solo', maxPlayers: 1 },
    });
    const joined = await onceEvent<LobbyJoinedPayload>(socket, 'lobby:joined');
    roomId = joined.roomId;
  });

  afterAll(async () => {
    await clearModeration(TEST_USER_IDS.playerOne);
    socket.disconnect();
    await bundle.close();
  });

  afterEach(async () => {
    await clearModeration(TEST_USER_IDS.playerOne);
  });

  it('delivers chat messages when the user is not muted', async () => {
    const messagePromise = onceEvent<{ content: string }>(socket, 'chat:message');
    socket.emit('chat:sendMessage', { roomId, content: 'hello integration test' });
    const message = await messagePromise;
    expect(message.content).toBe('hello integration test');
  });

  it('blocks chat when mutedUntil is active', async () => {
    await setModeration(TEST_USER_IDS.playerOne, {
      mutedUntil: new Date(Date.now() + 60 * 60_000),
    });

    // Reconnect so socket.data picks up the new mutedUntil from DB.
    socket.disconnect();
    const token = await getTestAccessToken('playerOne');
    socket = await connectSocket(bundle.url, token, 'player_one');
    socket.emit('lobby:join', {
      roomId,
      username: 'player_one',
      avatar: 'player1',
    });
    await onceEvent(socket, 'lobby:joined');

    const errorPromise = onceEvent<{ message: string }>(socket, 'error');
    socket.emit('chat:sendMessage', { roomId, content: 'should be blocked' });
    const err = await errorPromise;
    expect(err.message).toMatch(/silence|modération/i);
  });
});
