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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ------------------------------------------------------------------
// PROVIDER
// ------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
        // Important: si erreur (ex: profil pas encore créé), on ne bloque pas tout
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
        // 1. Récup session initiale
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
        if (mounted) setLoading(false); // <--- ON GARANTIT LA FIN DU LOADING
      }
    };

    initAuth();

    // 2. Listeners
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      
      setSession(newSession);

      if (newSession?.user) {
        // On ne recharge que si l'ID a changé ou si on n'a pas de profil
        setProfile(prev => {
            if (prev && prev.id === newSession.user.id) return prev;
            fetchProfile(newSession.user.id); // On lance le fetch
            return prev; // On garde l'ancien en attendant (ou null)
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
  // On a retiré 'profile' des dépendances pour éviter la boucle infinie fetch <-> update

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
    refreshProfile
  }), [session, profile, loading, isAdmin, fetchProfile]);

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