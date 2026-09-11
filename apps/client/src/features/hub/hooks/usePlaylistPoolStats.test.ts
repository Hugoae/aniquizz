import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaylistPoolStats } from '@aniquizz/shared';
import {
  PLAYLIST_POOL_STATS_DEBOUNCE_MS,
  usePlaylistPoolStats,
} from './usePlaylistPoolStats';

const socketMock = vi.hoisted(() => {
  const handlers = new Map<string, (payload: PlaylistPoolStats) => void>();
  return {
    handlers,
    socket: {
      on: vi.fn((event: string, cb: (payload: PlaylistPoolStats) => void) => {
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

const packId = '11111111-1111-4111-8111-111111111111';
const decadeId = '22222222-2222-4222-8222-222222222222';

const baseRequest = {
  playlistId: packId,
  decadePlaylistId: decadeId as string | null,
  soundCount: 20,
  enabled: true,
};

const statsPayload = (requestId: number): PlaylistPoolStats => ({
  playlistId: packId,
  decadePlaylistId: decadeId,
  snapshotCount: 40,
  filteredCount: 30,
  playableSongs: 30,
  animeCount: 12,
  distinctNames: 12,
  soundCount: 20,
  insufficient: false,
  packInsufficient: false,
  staleDropped: 0,
  playlistWatched: false,
  requestId,
});

describe('usePlaylistPoolStats', () => {
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

  it('debounces emits and drops a stale requestId reply', () => {
    const { rerender, result } = renderHook(
      (props: typeof baseRequest) => usePlaylistPoolStats(props),
      { initialProps: baseRequest },
    );

    act(() => {
      vi.advanceTimersByTime(PLAYLIST_POOL_STATS_DEBOUNCE_MS - 1);
    });
    expect(socketMock.socket.emit).not.toHaveBeenCalled();

    rerender({ ...baseRequest, decadePlaylistId: null });

    act(() => {
      vi.advanceTimersByTime(PLAYLIST_POOL_STATS_DEBOUNCE_MS);
    });
    expect(socketMock.socket.emit).toHaveBeenCalledTimes(1);
    const emitted = socketMock.socket.emit.mock.calls[0]?.[1] as { requestId: number };
    expect(emitted.requestId).toEqual(expect.any(Number));

    act(() => {
      socketMock.handlers.get('playlist:pool_stats')?.(statsPayload(emitted.requestId - 1));
    });
    expect(result.current.stats).toBeNull();

    act(() => {
      socketMock.handlers.get('playlist:pool_stats')?.({
        ...statsPayload(emitted.requestId),
        decadePlaylistId: undefined,
      });
    });
    expect(result.current.stats?.requestId).toBe(emitted.requestId);
    expect(result.current.loading).toBe(false);
  });

  it('does not refetch when only soundCount changes', () => {
    const { rerender } = renderHook((props: typeof baseRequest) => usePlaylistPoolStats(props), {
      initialProps: baseRequest,
    });
    act(() => {
      vi.advanceTimersByTime(PLAYLIST_POOL_STATS_DEBOUNCE_MS);
    });
    expect(socketMock.socket.emit).toHaveBeenCalledTimes(1);

    rerender({ ...baseRequest, soundCount: 50 });
    act(() => {
      vi.advanceTimersByTime(PLAYLIST_POOL_STATS_DEBOUNCE_MS);
    });
    expect(socketMock.socket.emit).toHaveBeenCalledTimes(1);
  });
});
