import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@aniquizz/shared";
import { serverApiBase } from "./env";
import { captureClientError } from "./errorReporter";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// AuthContext owns connect timing; auth payload is injected before each connect.
export const socket: AppSocket = io(serverApiBase(), {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket'],
});

socket.on("connect_error", (err) => {
  captureClientError(err, { source: "socket_connect_error" });
});
