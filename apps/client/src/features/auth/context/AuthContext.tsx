import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import type { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { captureClientError } from '@/lib/errorReporter';
import { createProfileFetchGate } from '@/features/auth/lib/profileFetchGate';

const loadSupabase = () => import('@/lib/supabase').then((m) => m.supabase);

// ------------------------------------------------------------------
// TYPES
// ------------------------------------------------------------------

export type Profile = {
  id: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  gamesPlayed: number;
  gamesWon: number;
  bannedUntil?: string | null;
  mutedUntil?: string | null;
  anilistUsername?: string | null;
  malUsername?: string | null;
  lastListSync?: string | null;
  activeListProvider?: 'anilist' | 'mal' | null;
  anilistLastSync?: string | null;
  malLastSync?: string | null;
  showFavoriteSongs?: boolean;
  allowFriendRequests?: boolean;
  onlineStatusAudience?: 'everyone' | 'friends' | 'nobody';
  matchHistoryAudience?: 'everyone' | 'friends' | 'nobody';
  lobbyInviteAudience?: 'friends' | 'nobody';
  audioVolume?: number;
  audioMuted?: boolean;
  motionMode?: 'auto' | 'reduced' | 'full';
  autofocusAnswer?: boolean;
  submitOnEnter?: boolean;
  soloAutoReveal?: boolean;
  showShortcutReminder?: boolean;
  friendRequestVisual?: boolean;
  friendRequestSound?: boolean;
  lobbyInviteVisual?: boolean;
  lobbyInviteSound?: boolean;
  totalGuesses?: number;
  correctGuesses?: number;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Session resolved from Supabase (no longer blocked on profile fetch). */
  authReady: boolean;
  /** @deprecated Use `authReady` — kept for callers that still gate on `!loading`. */
  loading: boolean;
  profileLoading: boolean;
  /** True after the Profile SELECT failed for the current session (Header degraded chip). */
  profileFailed: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  patchProfile: (patch: Partial<Profile>, expectedUserId?: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ------------------------------------------------------------------
// PROVIDER
// ------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileFailed, setProfileFailed] = useState(false);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const fetchGateRef = useRef(createProfileFetchGate());

  const fetchProfile = useCallback(async (userId: string, client: SupabaseClient) => {
    const started = fetchGateRef.current.begin(userId);
    if (started.skipped) return;

    setProfileLoading(true);
    setProfileFailed(false);
    try {
      const { data, error } = await client.from('Profile').select('*').eq('id', userId).single();

      if (!fetchGateRef.current.isCurrent(started.generation)) return;

      if (error || !data) {
        captureClientError(error ?? new Error('empty profile'), { source: 'auth_fetch_profile' });
        let keptCurrent = false;
        setProfile((prev) => {
          if (prev?.id === userId) {
            keptCurrent = true;
            return prev;
          }
          return null;
        });
        if (!keptCurrent) setProfileFailed(true);
        return;
      }

      setProfile(data);
      setProfileFailed(false);
    } catch (err) {
      captureClientError(err, { source: 'auth_fetch_profile' });
      if (!fetchGateRef.current.isCurrent(started.generation)) return;
      let keptCurrent = false;
      setProfile((prev) => {
        if (prev?.id === userId) {
          keptCurrent = true;
          return prev;
        }
        return null;
      });
      if (!keptCurrent) setProfileFailed(true);
    } finally {
      fetchGateRef.current.finish(started.generation);
      if (fetchGateRef.current.isCurrent(started.generation)) {
        setProfileLoading(false);
      }
    }
  }, []);

  // --- INIT AUTH (Supabase chunk deferred — not on the critical path for `/`) ---
  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | undefined;
    const fetchGate = fetchGateRef.current;

    const initAuth = async () => {
      try {
        const supabase = await loadSupabase();
        supabaseRef.current = supabase;
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(initialSession);
          if (initialSession?.user) {
            void fetchProfile(initialSession.user.id, supabase);
          }
        }

        const {
          data: { subscription: sub },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!mounted) return;

          setSession(newSession);

          if (newSession?.user) {
            setProfile((prev) => {
              if (prev?.id === newSession.user.id) return prev;
              // TOKEN_REFRESHED must not start a second SELECT (getSession / INITIAL_SESSION
              // already did) and must not retry a failed load on every refresh.
              if (event === 'TOKEN_REFRESHED') return prev;
              void fetchProfile(newSession.user.id, supabase);
              return null;
            });
          } else {
            fetchGate.invalidate();
            setProfile(null);
            setProfileFailed(false);
            setProfileLoading(false);
          }

          setAuthReady(true);
        });
        subscription = sub;
      } catch (err) {
        captureClientError(err, { source: 'auth_init' });
      } finally {
        if (mounted) setAuthReady(true);
      }
    };

    void initAuth();

    return () => {
      mounted = false;
      fetchGate.invalidate();
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  // --- SOCKET LIFECYCLE (lazy chunk — only when a session exists) ---
  useEffect(() => {
    let cleanupLevelUp: (() => void) | undefined;
    let cleanupSanction: (() => void) | undefined;
    let cleanupSessionReplace: (() => void) | undefined;
    let disposed = false;

    void import('@/lib/socketLifecycle').then(
      ({
        syncSocketSession,
        registerLevelUpHandler,
        registerSanctionHandler,
        registerSessionReplacementReconnect,
      }) => {
        if (disposed) return;
        syncSocketSession(session, profile?.username || 'Anonyme');
        if (!session?.user) return;
        cleanupLevelUp = registerLevelUpHandler(session, () => {
          if (session.user && supabaseRef.current)
            void fetchProfile(session.user.id, supabaseRef.current);
        });
        cleanupSanction = registerSanctionHandler((payload) => {
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  bannedUntil: payload.bannedUntil,
                  mutedUntil: payload.mutedUntil,
                }
              : prev,
          );
        });
        cleanupSessionReplace = registerSessionReplacementReconnect();
      },
    );

    return () => {
      disposed = true;
      cleanupLevelUp?.();
      cleanupSanction?.();
      cleanupSessionReplace?.();
    };
  }, [session, session?.user?.id, session?.access_token, profile?.username, fetchProfile]);

  // --- ACTIONS ---

  const signOut = useCallback(async () => {
    try {
      fetchGateRef.current.invalidate();
      setProfile(null);
      setProfileFailed(false);
      setProfileLoading(false);
      const supabase = supabaseRef.current ?? (await loadSupabase());
      supabaseRef.current = supabase;
      await supabase.auth.signOut();
      setSession(null);
    } catch (err) {
      captureClientError(err, { source: 'auth_sign_out' });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      const supabase = supabaseRef.current ?? (await loadSupabase());
      supabaseRef.current = supabase;
      await fetchProfile(session.user.id, supabase);
    }
  }, [session?.user, fetchProfile]);

  const patchProfile = useCallback((patch: Partial<Profile>, expectedUserId?: string) => {
    setProfile((current) =>
      current && (!expectedUserId || current.id === expectedUserId)
        ? { ...current, ...patch }
        : current,
    );
  }, []);

  const isAdmin = profile?.role === 'ADMIN';

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      authReady,
      loading: !authReady,
      profileLoading,
      profileFailed,
      isAdmin,
      signOut,
      refreshProfile,
      patchProfile,
    }),
    [
      session,
      profile,
      authReady,
      profileLoading,
      profileFailed,
      isAdmin,
      signOut,
      refreshProfile,
      patchProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
