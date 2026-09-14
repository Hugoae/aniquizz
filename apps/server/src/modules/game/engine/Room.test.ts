import { describe, expect, it } from 'vitest';
import { Room } from './Room';
import { createMockIo, makeSettings } from './matchEngineTestHarness';

describe('Room.canStartMatch', () => {
  it('blocks a multiplayer start while a connected guest is not ready', () => {
    const { io } = createMockIo();
    const room = new Room('room-1', io, 'host', makeSettings());
    room.addOrReconnect('host', 'Host', 'host', 's-host', { asHost: true });
    room.addOrReconnect('guest', 'Guest', 'guest', 's-guest');

    const check = room.canStartMatch('host');
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/prêts/i);
  });

  it('allows a multiplayer start when every connected human is ready', () => {
    const { io } = createMockIo();
    const room = new Room('room-1', io, 'host', makeSettings());
    room.addOrReconnect('host', 'Host', 'host', 's-host', { asHost: true });
    room.addOrReconnect('guest', 'Guest', 'guest', 's-guest');
    room.toggleReady('guest');

    expect(room.canStartMatch('host').ok).toBe(true);
  });

  it('does not require ready in solo', () => {
    const { io } = createMockIo();
    const room = new Room('room-1', io, 'host', makeSettings({ maxPlayers: 1 }));
    room.addOrReconnect('host', 'Host', 'host', 's-host', { asHost: true });

    expect(room.canStartMatch('host').ok).toBe(true);
  });
});

describe('Room.playerReturnToLobby', () => {
  it('ignores a user who is not in the room', () => {
    const { io } = createMockIo();
    const room = new Room('room-1', io, 'host', makeSettings());
    room.addOrReconnect('host', 'Host', 'host', 's-host', { asHost: true });

    room.playerReturnToLobby('outsider');

    expect(room.returnedPlayers.has('outsider')).toBe(false);
  });

  it('marks a member as returned', () => {
    const { io } = createMockIo();
    const room = new Room('room-1', io, 'host', makeSettings());
    room.addOrReconnect('host', 'Host', 'host', 's-host', { asHost: true });
    room.addOrReconnect('guest', 'Guest', 'guest', 's-guest');

    room.playerReturnToLobby('guest');

    expect(room.returnedPlayers.has('guest')).toBe(true);
    expect(room.returnedPlayers.has('host')).toBe(false);
  });
});

describe('Room.reattachMatchSocket', () => {
  it('reconnects a disconnected member without marking them in the lobby', () => {
    const { io } = createMockIo();
    const room = new Room('room-1', io, 'host', makeSettings());
    room.addOrReconnect('host', 'Host', 'host', 's-host', { asHost: true });
    room.addOrReconnect('guest', 'Guest', 'guest', 's-guest');
    room.status = 'playing';

    room.markDisconnected('s-guest');
    expect(room.players.get('guest')?.isConnected).toBe(false);

    expect(room.reattachMatchSocket('guest', 's-guest-2')).toBe(true);

    const guest = room.players.get('guest');
    expect(guest?.isConnected).toBe(true);
    expect(guest?.socketId).toBe('s-guest-2');
    expect(room.returnedPlayers.has('guest')).toBe(false);
  });

  it('returns false when the user is not in the room', () => {
    const { io } = createMockIo();
    const room = new Room('room-1', io, 'host', makeSettings());
    room.addOrReconnect('host', 'Host', 'host', 's-host', { asHost: true });

    expect(room.reattachMatchSocket('outsider', 's-new')).toBe(false);
  });
});

describe('Room.applySettings', () => {
  it('applies host settings while the room is waiting', () => {
    const { io } = createMockIo();
    const room = new Room('room-1', io, 'host', makeSettings());
    const next = makeSettings({ soundCount: 15 });

    expect(room.applySettings('host', next)).toBe(true);
    expect(room.settings).toBe(next);
  });

  it('freezes settings once match start has begun', () => {
    const { io } = createMockIo();
    const initial = makeSettings();
    const room = new Room('room-1', io, 'host', initial);
    room.status = 'starting';
    const next = makeSettings({ soundCount: 15 });

    expect(room.applySettings('host', next)).toBe(false);
    expect(room.settings).toBe(initial);
  });
});
