import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from "react";
import type { Session, User, SupabaseClient } from "@supabase/supabase-js";
import { captureClientError } from "@/lib/errorReporter";

const loadSupabase = () => import("@/lib/supabase").then((m) => m.supabase);

// ------------------------------------------------------------------
// TYPES
// ------------------------------------------------------------------

export type Profile = {
  id: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  role: "USER" | "ADMIN" | "MODERATOR";
  gamesPlayed: number;
  gamesWon: number;
  bannedUntil?: string | null;
  mutedUntil?: string | null;
  anilistUsername?: string | null;
  malUsername?: string | null;
  lastListSync?: string | null;
  totalGuesses?: number;
  correctGuesses?: number;
  history?: { count: number }[];
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
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const fetchProfile = useCallback(async (userId: string, client: SupabaseClient) => {
    setProfileLoading(true);
    try {
      const { data, error } = await client
        .from("Profile")
        .select("*, history:SongHistory(count)")
        .eq("id", userId)
        .single();

      if (error) {
        captureClientError(error, { source: 'auth_fetch_profile' });
      } else {
        setProfile(data);
      }
    } catch (err) {
      captureClientError(err, { source: 'auth_fetch_profile' });
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // --- INIT AUTH (Supabase chunk deferred — not on the critical path for `/`) ---
  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | undefined;

    const initAuth = async () => {
      try {
        const supabase = await loadSupabase();
        supabaseRef.current = supabase;
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (mounted) {
          setSession(initialSession);
          if (initialSession?.user) {
            void fetchProfile(initialSession.user.id, supabase);
          }
        }

        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (!mounted) return;

          setSession(newSession);

          if (newSession?.user) {
            setProfile((prev) => {
              if (prev && prev.id === newSession.user.id) return prev;
              void fetchProfile(newSession.user.id, supabase);
              return prev;
            });
          } else {
            setProfile(null);
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
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  // --- SOCKET LIFECYCLE (lazy chunk — only when a session exists) ---
  useEffect(() => {
    let cleanupLevelUp: (() => void) | undefined;
    let cleanupSanction: (() => void) | undefined;
    let disposed = false;

    void import('@/lib/socketLifecycle').then(({ syncSocketSession, registerLevelUpHandler, registerSanctionHandler }) => {
      if (disposed) return;
      syncSocketSession(session, profile?.username || 'Anonyme');
      if (!session?.user) return;
      cleanupLevelUp = registerLevelUpHandler(session, () => {
        if (session.user && supabaseRef.current) void fetchProfile(session.user.id, supabaseRef.current);
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
    });

    return () => {
      disposed = true;
      cleanupLevelUp?.();
      cleanupSanction?.();
    };
  }, [session, session?.user?.id, session?.access_token, profile?.username, fetchProfile]);

  // --- ACTIONS ---

  const signOut = useCallback(async () => {
    try {
      const supabase = supabaseRef.current ?? (await loadSupabase());
      supabaseRef.current = supabase;
      await supabase.auth.signOut();
      setProfile(null);
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

  const isAdmin = profile?.role === "ADMIN";

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    authReady,
    loading: !authReady,
    profileLoading,
    isAdmin,
    signOut,
    refreshProfile,
  }), [session, profile, authReady, profileLoading, isAdmin, signOut, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}