import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ------------------------------------------------------------------
// TYPES
// ------------------------------------------------------------------

// Structure du Profil (Doit matcher ta table "Profile" dans Supabase)
export type Profile = {
  id: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  role: "USER" | "ADMIN" | "MODERATOR";
  gamesPlayed: number;
  gamesWon: number;
  anilistUsername?: string | null; // Pour l'intégration AniList
  lastListSync?: string | null;
};

// Ce que le contexte met à disposition dans toute l'app
type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>; // NOUVEAU : Pour mettre à jour l'XP/Niveau sans F5
};

// Création du contexte
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ------------------------------------------------------------------
// PROVIDER
// ------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // --- FONCTION : Récupérer le profil depuis la BDD ---
  // Utilisation de useCallback pour éviter les boucles infinies
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("Profile") // "Profile" avec majuscule car défini ainsi dans Prisma/SQL
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("❌ Erreur chargement profil:", error.message);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("❌ Erreur inattendue:", err);
    }
  }, []);

  // --- EFFET : Gestion du cycle de vie Auth ---
  useEffect(() => {
    // 1. Vérification initiale au chargement de la page
    const initAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        if (session?.user) {
            await fetchProfile(session.user.id);
        }
        setLoading(false);
    };

    initAuth();

    // 2. Écouteur d'événements (Connexion, Déconnexion, Refresh Token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        // Si l'utilisateur vient de se connecter, on charge son profil
        if (!profile) await fetchProfile(session.user.id);
      } else {
        // Si déconnexion, on vide tout
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, profile]); // Ajout des dépendances pour la stabilité

  // --- ACTIONS ---

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setLoading(false);
  };

  // Permet de forcer la mise à jour du profil (ex: après une fin de partie)
  const refreshProfile = async () => {
      if (session?.user) {
          await fetchProfile(session.user.id);
      }
  };

  const isAdmin = profile?.role === "ADMIN";

  // --- MEMOIZATION ---
  // Optimisation : On ne recrée l'objet que si une valeur change
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

// ------------------------------------------------------------------
// HOOK PERSONNALISÉ
// ------------------------------------------------------------------

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}