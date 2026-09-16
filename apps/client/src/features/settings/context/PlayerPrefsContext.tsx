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
import { subscribeWhenSocketReady } from '@/lib/socketReady';
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
  const { user, profile, authReady, patchProfile } = useAuth();
  const storedAtBoot = useRef(readPlayerPrefs());
  const hadLocalSnapshotRef = useRef(storedAtBoot.current != null);
  const [prefs, setPrefs] = useState<PlayerPrefs>(() => normalizePlayerPrefs(storedAtBoot.current));
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const lastAckedRef = useRef(prefs);
  const pendingRef = useRef(false);
  const wasGuestRef = useRef(false);
  const keepLocalOnAccountRef = useRef(false);
  const skipAccountHydrateRef = useRef(false);
  const accountHydratedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopReadyRef = useRef<(() => void) | null>(null);
  const [osReduced, setOsReduced] = useState(readOsPrefersReduced);
  const userId = user?.id ?? null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const patchProfileRef = useRef(patchProfile);
  patchProfileRef.current = patchProfile;

  const apply = useCallback((next: PlayerPrefs) => {
    prefsRef.current = next;
    setPrefs(next);
    writePlayerPrefs(next);
    hadLocalSnapshotRef.current = true;
  }, []);

  const emitNow = useCallback(() => {
    if (!userIdRef.current) {
      pendingRef.current = false;
      return;
    }
    if (!socket.connected) return;
    socket.emit('profile:update_prefs', prefsRef.current);
  }, []);

  const armReadyEmit = useCallback(() => {
    stopReadyRef.current?.();
    stopReadyRef.current = subscribeWhenSocketReady(socket, () => {
      if (!pendingRef.current) return;
      emitNow();
    });
  }, [emitNow]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stopReadyRef.current?.();
    stopReadyRef.current = null;
    if (pendingRef.current) emitNow();
  }, [emitNow]);

  const scheduleSync = useCallback(() => {
    if (!userIdRef.current) return;
    pendingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      armReadyEmit();
    }, PLAYER_PREFS_SYNC_MS);
  }, [armReadyEmit]);

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
    if (!userId) {
      wasGuestRef.current = true;
      keepLocalOnAccountRef.current = false;
      skipAccountHydrateRef.current = false;
      accountHydratedRef.current = false;
      return;
    }
    // Guest → signed-in, or a returning session with device prefs: push local, never pull.
    // A guest who never stored prefs must still hydrate from the account (do not push 20%).
    if (wasGuestRef.current) {
      wasGuestRef.current = false;
      if (hadLocalSnapshotRef.current) {
        keepLocalOnAccountRef.current = true;
        skipAccountHydrateRef.current = true;
        pendingRef.current = true;
        scheduleSync();
        return;
      }
    } else if (hadLocalSnapshotRef.current) {
      skipAccountHydrateRef.current = true;
      pendingRef.current = true;
      scheduleSync();
    }
  }, [authReady, userId, scheduleSync]);

  useEffect(() => {
    if (!userId || !hasAccountPlayerPrefs(profile)) return;
    if (
      keepLocalOnAccountRef.current ||
      skipAccountHydrateRef.current ||
      pendingRef.current ||
      hadLocalSnapshotRef.current ||
      accountHydratedRef.current
    ) {
      if (keepLocalOnAccountRef.current) {
        pendingRef.current = true;
        scheduleSync();
      }
      return;
    }
    const resolved = resolvePlayerPrefs({
      local: prefsRef.current,
      account: profile,
      preferLocal: false,
      hasLocalSnapshot: hadLocalSnapshotRef.current,
    });
    accountHydratedRef.current = true;
    if (playerPrefsEqual(resolved, prefsRef.current)) return;
    lastAckedRef.current = resolved;
    apply(resolved);
  }, [apply, profile, scheduleSync, userId]);

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
    const onPrefs = (stored: PlayerPrefs) => {
      const next = normalizePlayerPrefs(stored);
      if (pendingRef.current && !playerPrefsEqual(next, prefsRef.current)) return;
      pendingRef.current = false;
      keepLocalOnAccountRef.current = false;
      stopReadyRef.current?.();
      stopReadyRef.current = null;
      lastAckedRef.current = next;
      const id = userIdRef.current;
      if (id) patchProfileRef.current({ ...next }, id);
      if (playerPrefsEqual(next, prefsRef.current)) return;
      apply(next);
    };
    const onError = (payload: { message?: string }) => {
      if (!pendingRef.current || !isPrefsSyncError(payload?.message)) return;
      pendingRef.current = false;
      toast.error(SETTINGS_COPY.prefsSyncError);
      if (keepLocalOnAccountRef.current || hadLocalSnapshotRef.current) return;
      if (!playerPrefsEqual(lastAckedRef.current, prefsRef.current)) {
        apply(lastAckedRef.current);
      }
    };
    socket.on('profile:prefs', onPrefs);
    socket.on('error', onError);
    return () => {
      socket.off('profile:prefs', onPrefs);
      socket.off('error', onError);
    };
  }, [apply]);

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
