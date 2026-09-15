import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import type { ListOperationResult, ListsStatusPayload, LobbyJoinedPayload } from '@aniquizz/shared';
import { INVALID_SOCKET_PAYLOAD_MESSAGE } from '../core/parseSocketPayload';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { connectSocket, onceEvent, type TestSocket } from '../test/socketHelpers';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';

const LIST_SELECT = {
  anilistUsername: true,
  malUsername: true,
  activeListProvider: true,
  lastListSync: true,
  anilistLastSync: true,
  malLastSync: true,
} as const;

describe.skipIf(!hasIntegrationEnv)('list handlers integration', () => {
  let bundle: ServerBundle;
  let socket: TestSocket;

  const loadRow = () =>
    prisma.profile.findUniqueOrThrow({
      where: { id: TEST_USER_IDS.admin },
      select: LIST_SELECT,
    });
  let previous: Awaited<ReturnType<typeof loadRow>>;

  beforeAll(async () => {
    bundle = await createServerBundle();
    previous = await loadRow();
    await prisma.profile.update({
      where: { id: TEST_USER_IDS.admin },
      data: {
        anilistUsername: 'integration_anilist',
        malUsername: 'integration_mal',
        activeListProvider: 'anilist',
      },
    });
    socket = await connectSocket(bundle.url, await getTestAccessToken('admin'), 'admin_dev');
  });

  afterAll(async () => {
    await prisma.profile.update({
      where: { id: TEST_USER_IDS.admin },
      data: previous,
    });
    socket.disconnect();
    await bundle.close();
  });

  it('returns persisted links immediately without fetching either provider', async () => {
    const statusPromise = onceEvent<ListsStatusPayload>(socket, 'lists:status');
    socket.emit('lists:get_status');
    const status = await statusPromise;

    expect(status).toMatchObject({
      active: 'anilist',
      anilist: { username: 'integration_anilist', linked: true, active: true },
      mal: { username: 'integration_mal', linked: true, active: false },
    });
  });

  it('switches the active provider and returns a correlated result', async () => {
    const requestId = 'switch-to-mal';
    const resultPromise = onceEvent<ListOperationResult>(socket, 'lists:result');
    socket.emit('lists:set_active', { requestId, provider: 'mal' });
    const result = await resultPromise;

    expect(result).toMatchObject({
      requestId,
      operation: 'set_active',
      provider: 'mal',
      status: { active: 'mal' },
    });
    expect((await loadRow()).activeListProvider).toBe('mal');
  });

  it('notifies the watched pool after set_active while the player is in a lobby', async () => {
    socket.emit('lobby:create', {
      username: 'admin_dev',
      avatar: 'player1',
      settings: { soundSelection: 'watched', maxPlayers: 1, mode: 'solo' },
    });
    await onceEvent<LobbyJoinedPayload>(socket, 'lobby:joined');
    const changed = onceEvent<void>(socket, 'watched:list_changed');
    const resultPromise = onceEvent<ListOperationResult>(socket, 'lists:result');
    socket.emit('lists:set_active', { requestId: 'pool-keep-mal', provider: 'mal' });
    await changed;
    expect((await resultPromise).status.active).toBe('mal');
  });

  it('atomically unlinks the active provider and falls back to the remaining link', async () => {
    const requestId = 'unlink-mal';
    const resultPromise = onceEvent<ListOperationResult>(socket, 'lists:result');
    socket.emit('lists:unlink', { requestId, provider: 'mal' });
    const result = await resultPromise;

    expect(result).toMatchObject({
      requestId,
      operation: 'unlink',
      provider: 'mal',
      status: {
        active: 'anilist',
        anilist: { linked: true, active: true },
        mal: { linked: false, active: false },
      },
    });
    expect(await loadRow()).toMatchObject({
      anilistUsername: 'integration_anilist',
      malUsername: null,
      activeListProvider: 'anilist',
    });
  });

  it('rejects an invalid lists:set_active payload without writing', async () => {
    const before = await loadRow();
    const errPromise = onceEvent<{ message: string }>(socket, 'error', 8_000);
    socket.emit('lists:set_active', { requestId: 'bad' } as never);
    const err = await errPromise;
    expect(err.message).toBe(INVALID_SOCKET_PAYLOAD_MESSAGE);
    expect(await loadRow()).toEqual(before);
  });
});
