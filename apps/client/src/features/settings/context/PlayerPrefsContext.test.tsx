import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { PLAYER_PREFS_DEFAULTS, PLAYER_PREFS_KEYS, type PlayerPrefs } from '@aniquizz/shared';
import {
  PLAYER_PREFS_LEGACY_STORAGE_KEY,
  PLAYER_PREFS_STORAGE_KEY,
} from '@/features/settings/lib/playerPrefsStorage';
import { SOCKET_READY_SETTLE_MS } from '@/lib/socketReady';

const socketMock = vi.hoisted(() => {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();
  return {
    handlers,
    emitAll(event: string, ...args: unknown[]) {
      handlers.get(event)?.forEach((cb) => {
        cb(...args);
      });
    },
    socket: {
      connected: true,
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        let set = handlers.get(event);
        if (!set) {
          set = new Set();
          handlers.set(event, set);
        }
        set.add(cb);
      }),
      off: vi.fn((event: string, cb?: (...args: unknown[]) => void) => {
        if (!cb) {
          handlers.delete(event);
          return;
        }
        handlers.get(event)?.delete(cb);
      }),
      emit: vi.fn(),
    },
  };
});

const authMock = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string } | null,
  authReady: true,
  profile: {
    id: 'user-1',
    audioVolume: 20,
    audioMuted: false,
  } as { id: string; audioVolume?: number; audioMuted?: boolean; motionMode?: string } | null,
  patchProfile: vi.fn(),
}));

vi.mock('@/lib/socket', () => ({ socket: socketMock.socket }));
vi.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => ({
    user: authMock.user,
    profile: authMock.profile,
    authReady: authMock.authReady,
    patchProfile: authMock.patchProfile,
  }),
}));

import { PLAYER_PREFS_SYNC_MS, PlayerPrefsProvider, usePlayerPrefs } from './PlayerPrefsContext';

const wrapper = ({ children }: { children: ReactNode }) => (
  <PlayerPrefsProvider>{children}</PlayerPrefsProvider>
);

function flushPrefsSync() {
  vi.advanceTimersByTime(PLAYER_PREFS_SYNC_MS + SOCKET_READY_SETTLE_MS);
}

describe('PlayerPrefsProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.removeItem(PLAYER_PREFS_STORAGE_KEY);
    localStorage.removeItem(PLAYER_PREFS_LEGACY_STORAGE_KEY);
    socketMock.handlers.clear();
    socketMock.socket.connected = true;
    socketMock.socket.on.mockClear();
    socketMock.socket.off.mockClear();
    socketMock.socket.emit.mockClear();
    authMock.user = { id: 'user-1' };
    authMock.authReady = true;
    authMock.profile = { id: 'user-1', audioVolume: 20, audioMuted: false };
    authMock.patchProfile.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem(PLAYER_PREFS_STORAGE_KEY);
    localStorage.removeItem(PLAYER_PREFS_LEGACY_STORAGE_KEY);
  });

  it('keeps guest-written prefs when the account snapshot loads and syncs them', () => {
    authMock.user = null;
    authMock.profile = null;
    localStorage.setItem(
      PLAYER_PREFS_STORAGE_KEY,
      JSON.stringify({ audioVolume: 70, audioMuted: true, motionMode: 'reduced' }),
    );
    const { result, rerender } = renderHook(() => usePlayerPrefs(), { wrapper });
    expect(result.current.audioVolume).toBe(70);

    act(() => {
      authMock.user = { id: 'user-1' };
      authMock.profile = { id: 'user-1', audioVolume: 20, audioMuted: false, motionMode: 'full' };
    });
    rerender();

    expect(result.current.audioVolume).toBe(70);
    expect(result.current.audioMuted).toBe(true);
    expect(result.current.motionMode).toBe('reduced');

    act(() => {
      flushPrefsSync();
    });
    expect(socketMock.socket.emit).toHaveBeenCalledWith('profile:update_prefs', {
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 70,
      audioMuted: true,
      motionMode: 'reduced',
    });

    act(() => {
      authMock.profile = {
        id: 'user-1',
        audioVolume: 20,
        audioMuted: false,
        motionMode: 'full',
      };
    });
    rerender();
    expect(result.current.audioVolume).toBe(70);
  });

  it('does not let a later account default overwrite a device snapshot on refresh', () => {
    localStorage.setItem(
      PLAYER_PREFS_STORAGE_KEY,
      JSON.stringify({ audioVolume: 50, audioMuted: false, motionMode: 'auto' }),
    );
    const { result, rerender } = renderHook(() => usePlayerPrefs(), { wrapper });
    expect(result.current.audioVolume).toBe(50);

    act(() => {
      authMock.profile = {
        id: 'user-1',
        audioVolume: 20,
        audioMuted: false,
        motionMode: 'full',
      };
    });
    rerender();

    expect(result.current.audioVolume).toBe(50);
    act(() => {
      flushPrefsSync();
    });
    expect(socketMock.socket.emit).toHaveBeenCalledWith('profile:update_prefs', {
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 50,
    });
  });

  it('hydrates account prefs after a guest with no device snapshot signs in', () => {
    authMock.user = null;
    authMock.profile = null;
    const { result, rerender } = renderHook(() => usePlayerPrefs(), { wrapper });
    expect(result.current.audioVolume).toBe(20);

    act(() => {
      authMock.user = { id: 'user-1' };
      authMock.profile = {
        id: 'user-1',
        audioVolume: 35,
        audioMuted: true,
        motionMode: 'full',
      };
    });
    rerender();

    expect(result.current.audioVolume).toBe(35);
    expect(result.current.audioMuted).toBe(true);
    expect(socketMock.socket.emit).not.toHaveBeenCalled();
  });

  it('applies a later account snapshot when this device has no stored prefs', () => {
    authMock.profile = { id: 'user-1' };
    const { result, rerender } = renderHook(() => usePlayerPrefs(), { wrapper });

    act(() => {
      authMock.profile = {
        id: 'user-1',
        audioVolume: 35,
        audioMuted: true,
        motionMode: 'full',
      };
    });
    rerender();

    expect(result.current.audioVolume).toBe(35);
    expect(result.current.audioMuted).toBe(true);
    expect(result.current.motionMode).toBe('full');
  });

  it('hydrates from localStorage before any account snapshot', () => {
    authMock.user = null;
    authMock.profile = null;
    localStorage.setItem(
      PLAYER_PREFS_STORAGE_KEY,
      JSON.stringify({ audioVolume: 70, audioMuted: true, motionMode: 'reduced' }),
    );
    const { result } = renderHook(() => usePlayerPrefs(), { wrapper });
    expect(result.current.audioVolume).toBe(70);
    expect(result.current.audioMuted).toBe(true);
    expect(result.current.motionMode).toBe('reduced');
  });

  it('migrates a v1 local snapshot on first read', () => {
    authMock.user = null;
    authMock.profile = null;
    localStorage.setItem(
      PLAYER_PREFS_LEGACY_STORAGE_KEY,
      JSON.stringify({ audioVolume: 44, audioMuted: true }),
    );
    const { result } = renderHook(() => usePlayerPrefs(), { wrapper });
    expect(result.current.audioVolume).toBe(44);
    expect(result.current.audioMuted).toBe(true);
    expect(result.current.autofocusAnswer).toBe(true);
    expect(localStorage.getItem(PLAYER_PREFS_LEGACY_STORAGE_KEY)).toBeNull();
  });

  it('debounces account sync and flushes the latest value', () => {
    const { result } = renderHook(() => usePlayerPrefs(), { wrapper });

    act(() => {
      result.current.setAudioVolume(40);
      result.current.setAudioVolume(55);
    });

    act(() => {
      vi.advanceTimersByTime(PLAYER_PREFS_SYNC_MS - 1);
    });
    expect(socketMock.socket.emit).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1 + SOCKET_READY_SETTLE_MS);
    });
    expect(socketMock.socket.emit).toHaveBeenCalledTimes(1);
    expect(socketMock.socket.emit).toHaveBeenCalledWith('profile:update_prefs', {
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 55,
    });
    expect(JSON.parse(localStorage.getItem(PLAYER_PREFS_STORAGE_KEY) ?? '{}')).toEqual({
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 55,
    });
  });

  it('re-emits a pending write when the socket reconnects', () => {
    socketMock.socket.connected = false;
    const { result } = renderHook(() => usePlayerPrefs(), { wrapper });

    act(() => {
      result.current.setAudioMuted(true);
      vi.advanceTimersByTime(PLAYER_PREFS_SYNC_MS);
    });
    expect(socketMock.socket.emit).not.toHaveBeenCalled();

    act(() => {
      socketMock.socket.connected = true;
      socketMock.emitAll('connect');
      vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    });
    expect(socketMock.socket.emit).toHaveBeenCalledWith('profile:update_prefs', {
      ...PLAYER_PREFS_DEFAULTS,
      audioMuted: true,
    });
  });

  it('ignores a server echo while a newer local write is pending', () => {
    const { result } = renderHook(() => usePlayerPrefs(), { wrapper });

    act(() => {
      result.current.setAudioVolume(80);
    });

    act(() => {
      socketMock.emitAll('profile:prefs', {
        ...PLAYER_PREFS_DEFAULTS,
        audioVolume: 20,
        audioMuted: false,
      } satisfies PlayerPrefs);
    });

    expect(result.current.audioVolume).toBe(80);
  });

  it('patches the auth profile from a matching prefs ACK', () => {
    const { result } = renderHook(() => usePlayerPrefs(), { wrapper });

    act(() => {
      result.current.setAudioVolume(55);
      flushPrefsSync();
    });

    const stored = {
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 55,
    };
    act(() => {
      socketMock.emitAll('profile:prefs', stored);
    });

    expect(authMock.patchProfile).toHaveBeenCalledWith(
      Object.fromEntries(PLAYER_PREFS_KEYS.map((key) => [key, stored[key]])),
      'user-1',
    );
  });

  it('syncs motion mode with the rest of the prefs payload', () => {
    const { result } = renderHook(() => usePlayerPrefs(), { wrapper });

    act(() => {
      result.current.setMotionMode('full');
      flushPrefsSync();
    });

    expect(socketMock.socket.emit).toHaveBeenCalledWith('profile:update_prefs', {
      ...PLAYER_PREFS_DEFAULTS,
      motionMode: 'full',
    });
  });
});
