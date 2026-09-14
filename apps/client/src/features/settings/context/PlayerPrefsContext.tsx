import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  clampAudioVolume,
  hasAccountPlayerPrefs,
  mergePlayerPrefsPatch,
  normalizePlayerPrefs,
  playerPrefsEqual,
  resolveMotionReduced,
  resolvePlayerPrefs,
  type MotionMode,
  type PlayerPrefs,
  type PlayerPrefsInput,
} from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';
import { readPlayerPrefs, writePlayerPrefs } from '@/features/settings/lib/playerPrefsStorage';
import { applyMotionAttribute, readOsPrefersReduced, subscribeOsPrefersReduced } from '@/features/settings/lib/motionRuntime';

export const PLAYER_PREFS_SYNC_MS = 700;

interface PlayerPrefsContextValue extends PlayerPrefs {
  setAudioVolume: (volume: number) => void;
  setAudioMuted: (muted: boolean) => void;
  toggleMute: () => void;
  patchPrefs: (patch: PlayerPrefsInput) => void;
  setMotionMode: (mode: MotionMode) => void;
  /** Resolved reduced-motion flag (Auto follows OS; Full ignores it). */
  motionReduced: boolean;
  /** True when a signed-in session can sync prefs to the account. */
  accountSync: boolean;
}

const PlayerPrefsContext = createContext<PlayerPrefsContextValue | null>(null);

export function PlayerPrefsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [prefs, setPrefs] = useState<PlayerPrefs>(() =>
    normalizePlayerPrefs(readPlayerPrefs()),
  );
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [osReduced, setOsReduced] = useState(readOsPrefersReduced);

  const apply = useCallback((next: PlayerPrefs) => {
    prefsRef.current = next;
    setPrefs(next);
    writePlayerPrefs(next);
  }, []);

  const emitIfConnected = useCallback(() => {
    if (!user) {
      pendingRef.current = false;
      return;
    }
    if (!socket.connected) return;
    socket.emit('profile:update_prefs', prefsRef.current);
    pendingRef.current = false;
  }, [user]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current) emitIfConnected();
  }, [emitIfConnected]);

  const scheduleSync = useCallback(() => {
    if (!user) return;
    pendingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      emitIfConnected();
    }, PLAYER_PREFS_SYNC_MS);
  }, [user, emitIfConnected]);

  const commit = useCallback(
    (next: PlayerPrefs) => {
      if (playerPrefsEqual(next, prefsRef.current)) return;
      apply(next);
      scheduleSync();
    },
    [apply, scheduleSync],
  );

  useEffect(() => {
    if (!hasAccountPlayerPrefs(profile)) return;
    const resolved = resolvePlayerPrefs({
      local: prefsRef.current,
      account: profile,
      preferLocal: pendingRef.current,
    });
    if (playerPrefsEqual(resolved, prefsRef.current)) return;
    apply(resolved);
  }, [apply, profile]);

  useEffect(() => {
    applyMotionAttribute(prefs.motionMode, osReduced);
  }, [prefs.motionMode, osReduced]);

  useEffect(() => {
    if (prefs.motionMode !== 'auto') return;
    setOsReduced(readOsPrefersReduced());
    return subscribeOsPrefersReduced(setOsReduced);
  }, [prefs.motionMode]);

  useEffect(() => {
    const onPageHide = () => flush();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      flush();
    };
  }, [flush]);

  useEffect(() => {
    const onConnect = () => {
      if (pendingRef.current) emitIfConnected();
    };
    const onPrefs = (stored: PlayerPrefs) => {
      if (pendingRef.current) return;
      const next = normalizePlayerPrefs(stored);
      if (playerPrefsEqual(next, prefsRef.current)) return;
      apply(next);
    };
    socket.on('connect', onConnect);
    socket.on('profile:prefs', onPrefs);
    return () => {
      socket.off('connect', onConnect);
      socket.off('profile:prefs', onPrefs);
    };
  }, [apply, emitIfConnected]);

  const setAudioVolume = useCallback(
    (volume: number) => {
      commit(mergePlayerPrefsPatch(prefsRef.current, { audioVolume: clampAudioVolume(volume) }));
    },
    [commit],
  );

  const setAudioMuted = useCallback(
    (audioMuted: boolean) => {
      commit(mergePlayerPrefsPatch(prefsRef.current, { audioMuted }));
    },
    [commit],
  );

  const toggleMute = useCallback(() => {
    commit(
      mergePlayerPrefsPatch(prefsRef.current, { audioMuted: !prefsRef.current.audioMuted }),
    );
  }, [commit]);

  const patchPrefs = useCallback(
    (patch: PlayerPrefsInput) => {
      commit(mergePlayerPrefsPatch(prefsRef.current, patch));
    },
    [commit],
  );

  const setMotionMode = useCallback(
    (motionMode: MotionMode) => {
      commit(mergePlayerPrefsPatch(prefsRef.current, { motionMode }));
    },
    [commit],
  );

  const value = useMemo<PlayerPrefsContextValue>(
    () => ({
      ...prefs,
      setAudioVolume,
      setAudioMuted,
      toggleMute,
      patchPrefs,
      setMotionMode,
      motionReduced: resolveMotionReduced(prefs.motionMode, osReduced),
      accountSync: Boolean(user),
    }),
    [osReduced, prefs, setAudioMuted, setAudioVolume, setMotionMode, patchPrefs, toggleMute, user],
  );

  return <PlayerPrefsContext.Provider value={value}>{children}</PlayerPrefsContext.Provider>;
}

export function usePlayerPrefs(): PlayerPrefsContextValue {
  const ctx = useContext(PlayerPrefsContext);
  if (!ctx) {
    throw new Error('usePlayerPrefs must be used within a PlayerPrefsProvider');
  }
  return ctx;
}

export function useMotionReduced(): boolean {
  return usePlayerPrefs().motionReduced;
}
