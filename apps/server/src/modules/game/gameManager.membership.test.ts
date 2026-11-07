import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TypedServer } from '../../core/socketTypes';
import { GameManager } from './gameManager';
import { makeSettings } from './engine/matchEngineTestHarness';

function createIo() {
  const left: string[] = [];
  const io = {
    to: () => ({ emit: () => undefined }),
    in: (socketId: string) => ({
      socketsLeave: (roomId: string) => {
        left.push(`${socketId}:${roomId}`);
      },
    }),
  } as unknown as TypedServer;
  return { io, left };
}

describe('GameManager single-room membership', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('drops the user from every other room when they join a new one', () => {
    const { io, left } = createIo();
    const manager = new GameManager(io);
    const first = manager.createRoom('user-1', makeSettings({ maxPlayers: 8 }));
    const second = manager.createRoom('user-2', makeSettings({ maxPlayers: 8 }));
    first.addOrReconnect('user-1', 'A', 'player1', 'sock-a', { asHost: true });
    second.addOrReconnect('user-2', 'B', 'player1', 'sock-b', { asHost: true });
    second.addOrReconnect('user-1', 'A', 'player1', 'sock-a');

    manager.leaveOtherRooms('user-1', second.id);

    expect(first.players.has('user-1')).toBe(false);
    expect(second.players.has('user-1')).toBe(true);
    expect(left).toContain(`sock-a:${first.id}`);
    expect(manager.getUserPresence('user-1').roomId).toBe(second.id);
    expect(manager.getUserRoomMap().get('user-1')?.id).toBe(second.id);
  });

  it('treats a mid-match departure as a leave, including the last human', () => {
    const { io } = createIo();
    const manager = new GameManager(io);
    const live = manager.createRoom('user-1', makeSettings({ maxPlayers: 8 }));
    live.addOrReconnect('user-1', 'A', 'player1', 'sock-a', { asHost: true });
    live.status = 'playing';
    const next = manager.createRoom('user-2', makeSettings({ maxPlayers: 8 }));

    manager.leaveOtherRooms('user-1', next.id);

    expect(manager.getRoom(live.id)).toBeUndefined();
    expect(manager.getUserPresence('user-1').status).toBe('online');
  });
});
