import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@aniquizz/shared";
import { env } from "./env";
import { captureClientError } from "./errorReporter";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const IS_PROD = import.meta.env.MODE === 'production';
const URL = IS_PROD
  ? (env.VITE_SERVER_URL || 'https://aniquizz-server.onrender.com')
  : 'http://localhost:3001';

// AuthContext owns connect timing; auth payload is injected before each connect.
export const socket: AppSocket = io(URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket'],
});

socket.on("connect_error", (err) => {
  captureClientError(err, { source: "socket_connect_error" });
});
