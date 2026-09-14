import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { PLAYER_PREFS_DEFAULTS, type PlayerPrefs } from '@aniquizz/shared';
import {
  PLAYER_PREFS_LEGACY_STORAGE_KEY,
  PLAYER_PREFS_STORAGE_KEY,
} from '@/features/settings/lib/playerPrefsStorage';

const socketMock = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    handlers,
    socket: {
      connected: true,
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        handlers.set(event, cb);
      }),
      off: vi.fn((event: string) => {
        handlers.delete(event);
      }),
      emit: vi.fn(),
    },
  };
});

const authMock = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string } | null,
  profile: {
    id: 'user-1',
    audioVolume: 20,
    audioMuted: false,
  } as { id: string; audioVolume?: number; audioMuted?: boolean; motionMode?: string } | null,
}));

vi.mock('@/lib/socket', () => ({ socket: socketMock.socket }));
vi.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => ({ user: authMock.user, profile: authMock.profile }),
}));

import {
  PLAYER_PREFS_SYNC_MS,
  PlayerPrefsProvider,
  usePlayerPrefs,
} from './PlayerPrefsContext';

const wrapper = ({ children }: { children: ReactNode }) => (
  <PlayerPrefsProvider>{children}</PlayerPrefsProvider>
);

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
    authMock.profile = { id: 'user-1', audioVolume: 20, audioMuted: false };
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem(PLAYER_PREFS_STORAGE_KEY);
    localStorage.removeItem(PLAYER_PREFS_LEGACY_STORAGE_KEY);
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
      vi.advanceTimersByTime(1);
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
      socketMock.handlers.get('connect')?.();
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
      const onPrefs = socketMock.handlers.get('profile:prefs') as
        | ((payload: PlayerPrefs) => void)
        | undefined;
      onPrefs?.({ ...PLAYER_PREFS_DEFAULTS, audioVolume: 20, audioMuted: false });
    });

    expect(result.current.audioVolume).toBe(80);
  });

  it('syncs motion mode with the rest of the prefs payload', () => {
    const { result } = renderHook(() => usePlayerPrefs(), { wrapper });

    act(() => {
      result.current.setMotionMode('full');
      vi.advanceTimersByTime(PLAYER_PREFS_SYNC_MS);
    });

    expect(socketMock.socket.emit).toHaveBeenCalledWith('profile:update_prefs', {
      ...PLAYER_PREFS_DEFAULTS,
      motionMode: 'full',
    });
  });
});
