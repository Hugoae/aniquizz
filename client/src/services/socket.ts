import { io, Socket } from "socket.io-client";

// ✅ CONFIGURATION DE L'URL
// 1. On regarde si une URL serveur est définie dans l'environnement (Vercel)
// 2. Sinon, en DEV, on utilise localhost:3001
// 3. Sinon (fallback), on tente le domaine courant (undefined)
const URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? undefined : "http://localhost:3001");

console.log("🔌 Tentative de connexion Socket vers :", URL || "Domaine courant");

// --- Fonction pour récupérer le token Supabase ---
const getSupabaseToken = () => {
  try {
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
  autoConnect: false,
  reconnection: true,        // Essayer de se reconnecter
  reconnectionAttempts: 5,   // 5 essais max
  transports: ['websocket'], // Force websocket pour éviter les erreurs CORS
  auth: (cb) => {
    const token = getSupabaseToken();
    cb({ token });
  }
});