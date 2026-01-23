import { io, Socket } from "socket.io-client";

// ✅ CORRECTION PORT : On se connecte au serveur Node (3001), pas au serveur Vite (3000)
// En PROD, undefined (pour utiliser le même domaine). En DEV, on force le port 3001.
const URL = import.meta.env.PROD ? undefined : "http://localhost:3001";

// --- NOUVEAU : Fonction pour récupérer le token Supabase ---
const getSupabaseToken = () => {
  try {
    // Supabase stocke le token dans le localStorage sous une clé spécifique
    // Le format est généralement : sb-<project-ref>-auth-token
    // On cherche n'importe quelle clé qui ressemble à ça
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const sessionStr = localStorage.getItem(key);
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          return session.access_token;
        }
      }
    }
  } catch (e) {
    console.error("Erreur récupération token socket:", e);
  }
  return null;
};

export const socket: Socket = io(URL || "http://localhost:3001", {
  autoConnect: false, // On connectera manuellement quand l'app se lance
  auth: (cb) => {
    // À chaque connexion/reconnexion, on envoie le token à jour
    const token = getSupabaseToken();
    cb({ token });
  }
});