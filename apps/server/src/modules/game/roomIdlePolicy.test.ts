import { describe, expect, it } from 'vitest';
import {
  FINISHED_IDLE_MS,
  LOBBY_IDLE_MS,
  MATCH_STALE_MS,
  MAX_IDLE_ROOM_LIFETIME_MS,
  PAUSE_MAX_MS,
  STARTING_STUCK_MS,
  evaluateRoomIdle,
  type RoomIdleSnapshot,
} from './roomIdlePolicy';

const NOW = Date.UTC(2026, 10, 7, 12, 0, 0);

const room = (over: Partial<RoomIdleSnapshot> & { idleMs?: number; ageMs?: number }) => {
  const { idleMs = 0, ageMs = 0, ...rest } = over;
  return {
    status: 'waiting',
    lastActivityAt: NOW - idleMs,
    createdAt: new Date(NOW - ageMs),
    pausedForMs: null,
    ...rest,
  } satisfies RoomIdleSnapshot;
};

describe('evaluateRoomIdle', () => {
  it('keeps a fresh lobby', () => {
    expect(evaluateRoomIdle(room({ idleMs: LOBBY_IDLE_MS }), NOW).action).toBe('keep');
  });

  it('closes an idle waiting lobby', () => {
    expect(evaluateRoomIdle(room({ idleMs: LOBBY_IDLE_MS + 1 }), NOW).action).toBe('close');
  });

  it('closes a finished room left on the game-over screen (regression: multi-day ghosts)', () => {
    expect(
      evaluateRoomIdle(room({ status: 'finished', idleMs: FINISHED_IDLE_MS + 1 }), NOW).action,
    ).toBe('close');
  });

  it('keeps a recently finished room', () => {
    expect(
      evaluateRoomIdle(room({ status: 'finished', idleMs: FINISHED_IDLE_MS - 1 }), NOW).action,
    ).toBe('keep');
  });

  it('closes a room past the hard lifetime even if activity keeps resetting', () => {
    const verdict = evaluateRoomIdle(
      room({ idleMs: 0, ageMs: MAX_IDLE_ROOM_LIFETIME_MS + 1 }),
      NOW,
    );
    expect(verdict.action).toBe('close');
    const finished = evaluateRoomIdle(
      room({ status: 'finished', idleMs: 0, ageMs: MAX_IDLE_ROOM_LIFETIME_MS + 1 }),
      NOW,
    );
    expect(finished.action).toBe('close');
  });

  it('never applies the lifetime cap to a running match', () => {
    expect(
      evaluateRoomIdle(room({ status: 'playing', ageMs: MAX_IDLE_ROOM_LIFETIME_MS * 2 }), NOW)
        .action,
    ).toBe('keep');
  });

  it('cancels a stalled match', () => {
    expect(
      evaluateRoomIdle(room({ status: 'playing', idleMs: MATCH_STALE_MS + 1 }), NOW).action,
    ).toBe('cancel');
    expect(evaluateRoomIdle(room({ status: 'playing', idleMs: MATCH_STALE_MS }), NOW).action).toBe(
      'keep',
    );
  });

  it('cancels a match paused for too long and ignores activity while paused', () => {
    expect(
      evaluateRoomIdle(room({ status: 'paused', pausedForMs: PAUSE_MAX_MS + 1, idleMs: 0 }), NOW)
        .action,
    ).toBe('cancel');
    expect(
      evaluateRoomIdle(room({ status: 'paused', pausedForMs: 1000, idleMs: 99 * 60_000 }), NOW)
        .action,
    ).toBe('keep');
  });

  it('cancels a stuck start', () => {
    expect(
      evaluateRoomIdle(room({ status: 'starting', idleMs: STARTING_STUCK_MS + 1 }), NOW).action,
    ).toBe('cancel');
    expect(evaluateRoomIdle(room({ status: 'starting', idleMs: 1000 }), NOW).action).toBe('keep');
  });
});
