import { io, Socket } from "socket.io-client";

// --- CONFIGURATION URL ---
// Production : L'URL définie, ou celle du site courant
// Développement : localhost:3001
const IS_PROD = import.meta.env.MODE === 'production';
const URL = IS_PROD 
  ? (import.meta.env.VITE_SERVER_URL || 'https://aniquizz-server.onrender.com') 
  : 'http://localhost:3001';

console.log(`🔌 Socket configuré sur : ${URL}`);

// --- INITIALISATION ---
// On garde autoConnect: false pour que ce soit le AuthContext qui décide QUAND se connecter
// On supprime l'option 'auth' ici, car elle sera injectée dynamiquement
export const socket: Socket = io(URL, {
  autoConnect: false, 
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket'], // Force WebSocket pour éviter le polling (plus rapide)
});

// --- DEBUG ---
if (!IS_PROD) {
  socket.on("connect_error", (err) => {
    console.error("❌ Socket Error:", err.message);
  });
}