import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { securityConfig } from '../config/security';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@aniquizz/shared';

export const app = express();

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
