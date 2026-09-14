import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SOCKET_READY_SETTLE_MS } from '@/lib/socketReady';
import { useWatchedPoolStats } from './useWatchedPoolStats';

const socketMock = vi.hoisted(() => {
  const handlers = new Map<string, (...args: never[]) => void>();
  return {
    handlers,
    socket: {
      connected: true,
      active: true,
      on: vi.fn((event: string, cb: (...args: never[]) => void) => {
        handlers.set(event, cb);
      }),
      off: vi.fn((event: string) => {
        handlers.delete(event);
      }),
      emit: vi.fn(),
    },
  };
});

vi.mock('@/lib/socket', () => ({ socket: socketMock.socket }));

describe('useWatchedPoolStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    socketMock.handlers.clear();
    socketMock.socket.emit.mockClear();
    socketMock.socket.on.mockClear();
    socketMock.socket.off.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('re-resolves the preview when a room list source changes', () => {
    renderHook(() =>
      useWatchedPoolStats({
        roomId: 'ROOM1',
        soundCount: 20,
        enabled: true,
      }),
    );
    act(() => {
      vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    });
    expect(socketMock.socket.emit).toHaveBeenCalledTimes(1);

    act(() => {
      socketMock.handlers.get('watched:list_changed')?.();
    });

    expect(socketMock.socket.emit).toHaveBeenCalledTimes(2);
    expect(socketMock.socket.emit).toHaveBeenLastCalledWith(
      'watched:get_pool_stats',
      expect.objectContaining({ roomId: 'ROOM1' }),
    );
  });

  it('refetches when difficulty changes, not when the array identity changes', () => {
    const { rerender } = renderHook(
      (props: { roomId: string; soundCount: number; enabled: boolean; difficulty: string[] }) =>
        useWatchedPoolStats(props),
      {
        initialProps: {
          roomId: 'ROOM1',
          soundCount: 20,
          enabled: true,
          difficulty: ['easy'],
        },
      },
    );
    act(() => {
      vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    });
    expect(socketMock.socket.emit).toHaveBeenCalledTimes(1);

    rerender({
      roomId: 'ROOM1',
      soundCount: 20,
      enabled: true,
      difficulty: ['easy'],
    });
    act(() => {
      vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    });
    expect(socketMock.socket.emit).toHaveBeenCalledTimes(1);

    rerender({
      roomId: 'ROOM1',
      soundCount: 20,
      enabled: true,
      difficulty: ['hard'],
    });
    act(() => {
      vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    });
    expect(socketMock.socket.emit).toHaveBeenCalledTimes(2);
  });
});
