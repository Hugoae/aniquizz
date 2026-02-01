import { io, Socket } from "socket.io-client";

// --- CONFIGURATION URL ---
// Production : L'URL définie, ou celle du site courant
// Développement : localhost:3001
const IS_PROD = import.meta.env.MODE === 'production';
const URL = IS_PROD 
  ? (import.meta.env.VITE_SERVER_URL || 'https://aniquizz-server.onrender.com') 
  : 'http://localhost:3001';

console.log(`🔌 Socket configuré sur : ${URL}`);

// --- RÉCUPÉRATION TOKEN SUPABASE ---
// Cherche le token d'authentification dans le localStorage pour reconnexion auto
const getSupabaseToken = (): string | null => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Les tokens Supabase sont stockés sous la forme 'sb-<id>-auth-token'
      if (key?.startsWith('sb-') && key?.endsWith('-auth-token')) {
        const sessionStr = localStorage.getItem(key);
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          return session.access_token;
        }
      }
    }
  } catch (e) {
    console.warn("Socket: Impossible de lire le token local", e);
  }
  return null;
};

// --- INITIALISATION ---
export const socket: Socket = io(URL, {
  autoConnect: false, // On connecte manuellement quand l'app est prête (dans AuthContext ou App)
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket'], // Force WebSocket pour éviter le polling (plus rapide)
  auth: (cb) => {
    // On passe le token à chaque tentative de connexion
    const token = getSupabaseToken();
    cb({ token });
  }
});

// --- DEBUG ---
if (!IS_PROD) {
  socket.on("connect_error", (err) => {
    console.error("❌ Socket Error:", err.message);
  });
}