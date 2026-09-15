import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { ChatMessage, LobbyJoinedPayload, RoomListItem } from '@aniquizz/shared';
import { INVALID_SOCKET_PAYLOAD_MESSAGE } from '../core/parseSocketPayload';
import { normalizeRoomSettings } from '../modules/game/settings';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import {
  connectGuestSocket,
  connectSocket,
  onceEvent,
  type TestSocket,
} from '../test/socketHelpers';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Profile-less host so the signed-in admin is a first-time joiner, not a reconnect. */
const FOREIGN_HOST = '00000000-0000-4000-8000-000000000099';

describe.skipIf(!hasIntegrationEnv)('lobby handlers integration', () => {
  let bundle: ServerBundle;
  let socket: TestSocket;
  let roomId: string;

  const openForeignRoom = (settings: Record<string, unknown> = {}) => {
    const normalized = normalizeRoomSettings(
      { maxPlayers: 8, soundCount: 10, ...settings },
      { hostName: 'Other', hostAvatar: 'player1' },
    );
    return bundle.gameManager.createRoom(FOREIGN_HOST, normalized);
  };

  beforeAll(async () => {
    bundle = await createServerBundle();
    const token = await getTestAccessToken('admin');
    socket = await connectSocket(bundle.url, token, 'admin_dev');

    socket.emit('lobby:create', {
      username: 'admin_dev',
      avatar: 'player1',
      settings: { maxPlayers: 8, soundCount: 12 },
    });
    const joined = await onceEvent<LobbyJoinedPayload>(socket, 'lobby:joined');
    roomId = joined.roomId;
    expect(joined.settings?.soundCount).toBe(12);
    expect(joined.settings?.maxPlayers).toBe(8);
  });

  afterEach(() => {
    const room = bundle.gameManager.getRoom(roomId);
    if (room) room.status = 'waiting';
  });

  afterAll(async () => {
    socket.disconnect();
    await bundle.close();
  });

  it('rejects a malformed join with a generic invalid-payload error', async () => {
    const errorPromise = onceEvent<{ message: string }>(socket, 'error');
    socket.emit('lobby:join', {
      roomId: 'AB-12',
      username: 'admin_dev',
      avatar: 'player1',
    });
    const err = await errorPromise;
    expect(err.message).toBe(INVALID_SOCKET_PAYLOAD_MESSAGE);
  });

  it('lets the owner reconnect while the match is already playing', async () => {
    const room = bundle.gameManager.getRoom(roomId);
    expect(room).toBeTruthy();
    room!.status = 'playing';
    const joinedPromise = onceEvent<LobbyJoinedPayload>(socket, 'lobby:joined');
    socket.emit('lobby:join', {
      roomId,
      username: 'admin_dev',
      avatar: 'player1',
    });
    const joined = await joinedPromise;
    expect(joined.roomId).toBe(roomId);
  });

  it('kicks a bot only while the lobby is waiting', async () => {
    socket.emit('dev:add_bots', { roomId, count: 1 });
    await delay(200);
    const room = bundle.gameManager.getRoom(roomId);
    expect(room).toBeTruthy();
    const botId = [...room!.players.keys()].find((id) => id.startsWith('bot-'));
    expect(botId).toBeTruthy();

    socket.emit('lobby:kick', { roomId, targetId: botId });
    await delay(200);
    expect(room!.players.has(botId!)).toBe(false);

    socket.emit('dev:add_bots', { roomId, count: 1 });
    await delay(200);
    const nextBotId = [...room!.players.keys()].find((id) => id.startsWith('bot-'));
    expect(nextBotId).toBeTruthy();
    room!.status = 'playing';
    socket.emit('lobby:kick', { roomId, targetId: nextBotId });
    await delay(200);
    expect(room!.players.has(nextBotId!)).toBe(true);
  });

  it('still requires the password on a private room even with fromInvite', async () => {
    const foreign = openForeignRoom({ isPrivate: true, password: 'secret' });
    try {
      const requiredPromise = onceEvent<{ roomId: string }>(socket, 'password_required');
      socket.emit('lobby:join', {
        roomId: foreign.id,
        username: 'admin_dev',
        avatar: 'player1',
        fromInvite: true,
      });
      expect((await requiredPromise).roomId).toBe(foreign.id);

      const errorPromise = onceEvent<{ message: string }>(socket, 'error');
      socket.emit('lobby:join', {
        roomId: foreign.id,
        username: 'admin_dev',
        avatar: 'player1',
        password: 'nope',
        fromInvite: true,
      });
      expect((await errorPromise).message).toBe('Mot de passe incorrect.');
    } finally {
      bundle.gameManager.removeRoom(foreign.id);
    }
  });

  it('rejects a new player while a foreign match is already playing', async () => {
    const foreign = openForeignRoom();
    foreign.status = 'playing';
    try {
      const errorPromise = onceEvent<{ message: string }>(socket, 'error');
      socket.emit('lobby:join', {
        roomId: foreign.id,
        username: 'admin_dev',
        avatar: 'player1',
      });
      expect((await errorPromise).message).toBe('La partie est déjà en cours.');
    } finally {
      bundle.gameManager.removeRoom(foreign.id);
    }
  });

  it('requires auth to subscribe to the public room list', async () => {
    const guest = await connectGuestSocket(bundle.url);
    const subscribeError = onceEvent<{ message: string }>(guest, 'error');
    guest.emit('lobby:subscribe_list');
    expect((await subscribeError).message).toMatch(/connecté/i);

    const listError = onceEvent<{ message: string }>(guest, 'error');
    guest.emit('get_rooms');
    expect((await listError).message).toMatch(/connecté/i);
    guest.disconnect();
  });

  it('sends the room list to an authenticated subscriber', async () => {
    const roomsPromise = onceEvent<RoomListItem[]>(socket, 'rooms_update');
    socket.emit('lobby:subscribe_list');
    const rooms = await roomsPromise;
    expect(rooms.some((room) => room.id === roomId)).toBe(true);
  });

  it('echoes a chat message back to the sender', async () => {
    const messagePromise = onceEvent<ChatMessage>(socket, 'chat:message');
    socket.emit('chat:sendMessage', { roomId, content: 'ping salon' });
    const message = await messagePromise;
    expect(message).toMatchObject({
      senderId: TEST_USER_IDS.admin,
      content: 'ping salon',
      isSystem: false,
    });
    expect(message.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('rejects chat for a room the player is not in', async () => {
    const errorPromise = onceEvent<{ message: string }>(socket, 'error');
    socket.emit('chat:sendMessage', { roomId: 'ZZZZZZ', content: 'nope' });
    expect((await errorPromise).message).toBe("Vous n'êtes pas dans ce salon.");
  });
});
