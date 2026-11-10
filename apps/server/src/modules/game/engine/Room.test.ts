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

  it('blocks a Chrono start once more than 8 players are seated', () => {
    const { io } = createMockIo();
    const room = new Room(
      'room-1',
      io,
      'host',
      makeSettings({ gameType: 'timeAttack', mode: 'multiplayer', maxPlayers: 16 }),
    );
    room.addOrReconnect('host', 'Host', 'host', 's-host', { asHost: true });
    for (let i = 1; i <= 8; i++) {
      room.addOrReconnect(`guest-${i}`, `Guest ${i}`, 'guest', `s-${i}`);
      room.toggleReady(`guest-${i}`);
    }

    const check = room.canStartMatch('host');
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/8 joueurs maximum/);
  });

  it('blocks an Evolving start when the room is not solo', () => {
    const { io } = createMockIo();
    const room = new Room(
      'room-1',
      io,
      'host',
      makeSettings({ gameType: 'evolving', mode: 'multiplayer', maxPlayers: 4 }),
    );
    room.addOrReconnect('host', 'Host', 'host', 's-host', { asHost: true });
    room.addOrReconnect('guest', 'Guest', 'guest', 's-guest');
    room.toggleReady('guest');

    const check = room.canStartMatch('host');
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/solo/);
  });

  it('stops seating bots past the Chrono cap', () => {
    const { io } = createMockIo();
    const room = new Room(
      'room-1',
      io,
      'host',
      makeSettings({ gameType: 'timeAttack', mode: 'multiplayer', maxPlayers: 16 }),
    );
    room.addOrReconnect('host', 'Host', 'host', 's-host', { asHost: true });
    const bot = { accuracy: 0, minDelayMs: 60_000, maxDelayMs: 60_000 };
    while (room.addBot(bot)) {
      // fill until the race cap
    }
    expect(room.players.size).toBe(8);
    expect(room.addBot(bot)).toBeNull();
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
