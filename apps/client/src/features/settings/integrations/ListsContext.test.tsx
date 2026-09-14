import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ListOperationResult,
  ListsStatusPayload,
} from '@aniquizz/shared';

const socketMock = vi.hoisted(() => {
  const handlers = new Map<string, (payload: never) => void>();
  return {
    handlers,
    socket: {
      connected: true,
      on: vi.fn((event: string, cb: (payload: never) => void) => handlers.set(event, cb)),
      off: vi.fn((event: string) => handlers.delete(event)),
      emit: vi.fn(),
    },
  };
});

const authMock = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string } | null,
  profile: {
    id: 'user-1',
    anilistUsername: 'AniUser',
    malUsername: 'MalUser',
    activeListProvider: 'mal',
    anilistLastSync: null,
    malLastSync: null,
  },
  patchProfile: vi.fn(),
}));

vi.mock('@/lib/socket', () => ({ socket: socketMock.socket }));
vi.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => authMock,
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { ListsProvider } from './ListsContext';
import { useLists } from './listsContextValue';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ListsProvider>{children}</ListsProvider>
);

const serverStatus = (active: 'anilist' | 'mal'): ListsStatusPayload => ({
  active,
  anilist: {
    provider: 'anilist',
    username: 'AniUser',
    linked: true,
    active: active === 'anilist',
    lastSync: null,
    animeCount: active === 'anilist' ? 42 : null,
    state: 'ok',
  },
  mal: {
    provider: 'mal',
    username: 'MalUser',
    linked: true,
    active: active === 'mal',
    lastSync: null,
    animeCount: active === 'mal' ? 21 : null,
    state: 'ok',
  },
});

describe('ListsProvider', () => {
  beforeEach(() => {
    socketMock.handlers.clear();
    socketMock.socket.connected = true;
    socketMock.socket.on.mockClear();
    socketMock.socket.off.mockClear();
    socketMock.socket.emit.mockClear();
    authMock.patchProfile.mockClear();
  });

  it('seeds profile and settings from the same authenticated snapshot', () => {
    const { result } = renderHook(() => useLists(), { wrapper });

    expect(result.current.status).toMatchObject({
      active: 'mal',
      anilist: { linked: true, active: false },
      mal: { linked: true, active: true },
    });
    expect(socketMock.socket.emit).toHaveBeenCalledWith('lists:get_status');
  });

  it('replaces the fallback snapshot with the canonical socket status', () => {
    const { result } = renderHook(() => useLists(), { wrapper });

    act(() => {
      socketMock.handlers.get('lists:status')?.(serverStatus('anilist') as never);
    });

    expect(result.current.status.active).toBe('anilist');
    expect(result.current.status.anilist.animeCount).toBe(42);
  });

  it('correlates a switch result before clearing the pending action', () => {
    const { result } = renderHook(() => useLists(), { wrapper });
    let requestId: string | null = null;

    act(() => {
      requestId = result.current.setActive('anilist');
    });
    expect(requestId).toBeTruthy();
    expect(result.current.pending).toMatchObject({
      operation: 'set_active',
      provider: 'anilist',
    });

    const response: ListOperationResult = {
      requestId: requestId!,
      operation: 'set_active',
      provider: 'anilist',
      status: serverStatus('anilist'),
    };
    act(() => {
      socketMock.handlers.get('lists:result')?.(response as never);
    });

    expect(result.current.pending).toBeNull();
    expect(result.current.outcome).toEqual({ requestId, success: true });
    expect(result.current.status.active).toBe('anilist');
    expect(authMock.patchProfile).toHaveBeenCalledWith(
      expect.objectContaining({ activeListProvider: 'anilist' }),
      'user-1',
    );
  });
});
