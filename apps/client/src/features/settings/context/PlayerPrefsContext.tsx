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
import { toast } from 'sonner';
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
import {
  applyMotionAttribute,
  readOsPrefersReduced,
  subscribeOsPrefersReduced,
} from '@/features/settings/lib/motionRuntime';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';

export const PLAYER_PREFS_SYNC_MS = 700;

const PREFS_SYNC_ERROR = 'Impossible de mettre à jour les préférences.';
const RATE_LIMIT_ERROR = 'Trop de requêtes, veuillez patienter un instant.';

function isPrefsSyncError(message: string | undefined): boolean {
  return message === PREFS_SYNC_ERROR || message === RATE_LIMIT_ERROR;
}

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
  const { user, profile, authReady } = useAuth();
  const [prefs, setPrefs] = useState<PlayerPrefs>(() => normalizePlayerPrefs(readPlayerPrefs()));
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const lastAckedRef = useRef(prefs);
  const pendingRef = useRef(false);
  const wasGuestRef = useRef(false);
  const keepLocalOnAccountRef = useRef(false);
  const skipAccountHydrateRef = useRef(false);
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
    // Keep pending until profile:prefs matches so a stale account snapshot cannot win.
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
    if (!authReady) return;
    if (!user) {
      wasGuestRef.current = true;
      keepLocalOnAccountRef.current = false;
      skipAccountHydrateRef.current = false;
      return;
    }
    // Guest → signed-in: keep this device's local comfort prefs and push them.
    if (wasGuestRef.current) {
      wasGuestRef.current = false;
      keepLocalOnAccountRef.current = true;
      skipAccountHydrateRef.current = true;
      pendingRef.current = true;
      scheduleSync();
    }
  }, [authReady, user, scheduleSync]);

  useEffect(() => {
    if (!user || !hasAccountPlayerPrefs(profile)) return;
    if (keepLocalOnAccountRef.current || skipAccountHydrateRef.current) {
      if (keepLocalOnAccountRef.current) {
        pendingRef.current = true;
        scheduleSync();
      }
      return;
    }
    const resolved = resolvePlayerPrefs({
      local: prefsRef.current,
      account: profile,
      preferLocal: pendingRef.current,
    });
    if (playerPrefsEqual(resolved, prefsRef.current)) return;
    lastAckedRef.current = resolved;
    apply(resolved);
  }, [apply, profile, scheduleSync, user]);

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
      const next = normalizePlayerPrefs(stored);
      if (pendingRef.current && !playerPrefsEqual(next, prefsRef.current)) return;
      pendingRef.current = false;
      keepLocalOnAccountRef.current = false;
      lastAckedRef.current = next;
      if (playerPrefsEqual(next, prefsRef.current)) return;
      apply(next);
    };
    const onError = (payload: { message?: string }) => {
      if (!pendingRef.current || !isPrefsSyncError(payload?.message)) return;
      pendingRef.current = false;
      toast.error(SETTINGS_COPY.prefsSyncError);
      if (keepLocalOnAccountRef.current) return;
      if (!playerPrefsEqual(lastAckedRef.current, prefsRef.current)) {
        apply(lastAckedRef.current);
      }
    };
    socket.on('connect', onConnect);
    socket.on('profile:prefs', onPrefs);
    socket.on('error', onError);
    return () => {
      socket.off('connect', onConnect);
      socket.off('profile:prefs', onPrefs);
      socket.off('error', onError);
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
    commit(mergePlayerPrefsPatch(prefsRef.current, { audioMuted: !prefsRef.current.audioMuted }));
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
