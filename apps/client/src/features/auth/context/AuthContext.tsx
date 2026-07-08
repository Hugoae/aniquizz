import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { socket } from "@/lib/socket";
import { captureClientError } from "@/lib/errorReporter";

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
  lastListSync?: string | null;
  totalGuesses?: number;
  correctGuesses?: number;
  history?: { count: number }[];
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  showAuthModal: boolean;
  setShowAuthModal: (open: boolean) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ------------------------------------------------------------------
// PROVIDER
// ------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAuthModal, setShowAuthModal] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("Profile")
        .select("*")
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
    }
  }, []);

  // --- INIT AUTH ---
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
            setSession(initialSession);
            if (initialSession?.user) {
                await fetchProfile(initialSession.user.id);
            }
        }
      } catch (err) {
        captureClientError(err, { source: 'auth_init' });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      
      setSession(newSession);

      if (newSession?.user) {
        setProfile(prev => {
            if (prev && prev.id === newSession.user.id) return prev;
            fetchProfile(newSession.user.id);
            return prev;
        });
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]); 

  // --- SOCKET LIFECYCLE ---
  // Connect as soon as the auth token is known, independent of the profile
  // fetch, so presence (friends, online count) loads immediately instead of
  // waiting on the (slower) profile query. Identity is token-based server-side;
  // the display username is best-effort and refreshed on the next (re)connect
  // without forcing one. We (re)connect ONLY when the trusted identity (userId)
  // changes — login / logout / account switch — never on a mere token refresh
  // or when the profile username arrives (which previously caused a needless
  // disconnect/reconnect cycle).
  const connectedUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const token = session?.access_token;
    const userId = session?.user?.id ?? null;
    const username = profile?.username || "Anonyme";

    // Keep the auth payload current for the next (re)connect.
    socket.auth = { username, token };

    if (connectedUserId.current !== userId) {
      connectedUserId.current = userId;
      if (socket.connected) socket.disconnect();
      socket.connect();
    }
  }, [session?.user?.id, session?.access_token, profile?.username]);

  // --- LEVEL-UP (Phase 7) ---
  // Pushed to the player's own socket when a finished match levels them up.
  useEffect(() => {
    const onLevelUp = (payload: { oldLevel: number; newLevel: number; xp: number }) => {
      toast.success(`Niveau ${payload.newLevel} atteint !`, {
        description: "Continue comme ça pour grimper les niveaux.",
      });
      if (session?.user) fetchProfile(session.user.id);
    };
    socket.on("level_up", onLevelUp);
    return () => {
      socket.off("level_up", onLevelUp);
    };
  }, [session, fetchProfile]);

  // --- ACTIONS ---

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setSession(null);
    } catch (err) {
      captureClientError(err, { source: 'auth_sign_out' });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  }, [session?.user, fetchProfile]);

  const isAdmin = profile?.role === "ADMIN";

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isAdmin,
    signOut,
    refreshProfile,
    showAuthModal,
    setShowAuthModal,
  }), [session, profile, loading, isAdmin, signOut, refreshProfile, showAuthModal]);

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