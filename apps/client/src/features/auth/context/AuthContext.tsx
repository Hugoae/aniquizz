import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
  
  // --- AJOUT : Gestion de la Modale ---
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

  // --- AJOUT : État de la Modale ---
  const [showAuthModal, setShowAuthModal] = useState(false);

  // --- FETCH PROFILE ---
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("Profile")
        .select("*")
        .select("*, history:SongHistory(count)")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("❌ Erreur chargement profil:", error.message);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("❌ Erreur inattendue fetchProfile:", err);
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
        console.error("❌ Erreur Init Auth:", err);
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

  // --- ACTIONS ---

  const signOut = async () => {
    try {
        await supabase.auth.signOut();
        setProfile(null);
        setSession(null);
    } catch (err) {
        console.error("Erreur Logout:", err);
    }
  };

  const refreshProfile = async () => {
      if (session?.user) {
          await fetchProfile(session.user.id);
      }
  };

  const isAdmin = profile?.role === "ADMIN";

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isAdmin,
    signOut,
    refreshProfile,
    // --- AJOUT : Export des valeurs Modale ---
    showAuthModal,
    setShowAuthModal
  }), [session, profile, loading, isAdmin, fetchProfile, showAuthModal]); // Ajout dépendance showAuthModal

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