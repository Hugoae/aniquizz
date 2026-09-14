import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { env } from '../config/env';
import { configureTrustedProxy } from './httpClientIp';
import { securityConfig } from '../config/security';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@aniquizz/shared';

export const app = express();
configureTrustedProxy(app, env.NODE_ENV);

// CSP/COEP off: this process is a JSON + Socket.io API, not a document origin.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(cors(securityConfig));
app.use(express.json());

export const httpServer = createServer(app);

export const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: securityConfig,
  pingTimeout: 60000,
});
