import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GameSyncState, LobbyJoinedPayload } from '@aniquizz/shared';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { connectSocket, onceEvent, type TestSocket } from '../test/socketHelpers';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe.skipIf(!hasIntegrationEnv)('match resync after refresh', () => {
  let bundle: ServerBundle;
  let roomId: string;
  let first: TestSocket;

  beforeAll(async () => {
    bundle = await createServerBundle();
    const token = await getTestAccessToken('admin');
    first = await connectSocket(bundle.url, token, 'admin_dev');

    first.emit('lobby:create', {
      username: 'admin_dev',
      avatar: 'player1',
      settings: { mode: 'solo', maxPlayers: 1, soundCount: 5 },
    });
    const joined = await onceEvent<LobbyJoinedPayload>(first, 'lobby:joined');
    roomId = joined.roomId;
  });

  afterAll(async () => {
    first?.disconnect();
    await bundle?.close();
  });

  it('rejoins the Socket.io room on get_game_state after a new handshake', async () => {
    first.disconnect();
    await delay(80);

    const token = await getTestAccessToken('admin');
    const second = await connectSocket(bundle.url, token, 'admin_dev');

    try {
      const syncPromise = onceEvent<GameSyncState>(second, 'game_state_sync');
      second.emit('get_game_state', { roomId });
      const sync = await syncPromise;

      const me = sync.players.find((p) => p.id === TEST_USER_IDS.admin);
      expect(me?.isConnected).toBe(true);

      const sockets = await bundle.io.in(roomId).fetchSockets();
      expect(sockets.some((s) => s.id === second.id)).toBe(true);

      const room = bundle.gameManager.getRoom(roomId);
      expect(room?.returnedPlayers.has(TEST_USER_IDS.admin)).toBe(false);
      expect(room?.players.get(TEST_USER_IDS.admin)?.socketId).toBe(second.id);
    } finally {
      second.disconnect();
    }
  });
});
