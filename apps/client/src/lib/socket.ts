import { io, Socket } from "socket.io-client";
import { env } from "./env";
import { captureClientError } from "./errorReporter";

// --- CONFIGURATION URL ---
// Production : L'URL définie, ou celle du site courant
// Développement : localhost:3001
const IS_PROD = import.meta.env.MODE === 'production';
const URL = IS_PROD 
  ? (env.VITE_SERVER_URL || 'https://aniquizz-server.onrender.com') 
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

// --- DEBUG / ERROR REPORTING ---
socket.on("connect_error", (err) => {
  captureClientError(err, { source: "socket_connect_error" });
});