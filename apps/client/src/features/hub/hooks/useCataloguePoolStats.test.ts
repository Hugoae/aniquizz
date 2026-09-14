import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CataloguePoolStats } from '@aniquizz/shared';
import { SOCKET_READY_SETTLE_MS } from '@/lib/socketReady';
import { useCataloguePoolStats } from './useCataloguePoolStats';

const socketMock = vi.hoisted(() => {
  const handlers = new Map<string, (payload: CataloguePoolStats) => void>();
  return {
    handlers,
    socket: {
      connected: true,
      on: vi.fn((event: string, cb: (payload: CataloguePoolStats) => void) => {
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

describe('useCataloguePoolStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    socketMock.handlers.clear();
    socketMock.socket.on.mockClear();
    socketMock.socket.off.mockClear();
    socketMock.socket.emit.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refetches when difficulty or types change, not when the array identity changes', () => {
    const { rerender } = renderHook(
      (props: { enabled: boolean; soundCount: number; difficulty: string[]; types: string[] }) =>
        useCataloguePoolStats(props),
      {
        initialProps: {
          enabled: true,
          soundCount: 10,
          difficulty: ['easy'],
          types: ['opening'],
        },
      },
    );
    act(() => {
      vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    });
    expect(socketMock.socket.emit).toHaveBeenCalledTimes(1);

    rerender({
      enabled: true,
      soundCount: 10,
      difficulty: ['easy'],
      types: ['opening'],
    });
    act(() => {
      vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    });
    expect(socketMock.socket.emit).toHaveBeenCalledTimes(1);

    rerender({
      enabled: true,
      soundCount: 10,
      difficulty: ['hard'],
      types: ['opening'],
    });
    act(() => {
      vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    });
    expect(socketMock.socket.emit).toHaveBeenCalledTimes(2);

    rerender({
      enabled: true,
      soundCount: 10,
      difficulty: ['hard'],
      types: ['ending'],
    });
    act(() => {
      vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    });
    expect(socketMock.socket.emit).toHaveBeenCalledTimes(3);
  });
});
