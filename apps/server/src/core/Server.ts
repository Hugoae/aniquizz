import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { securityConfig } from '../config/security';

const app = express();

app.use(cors(securityConfig));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

export const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: securityConfig,
  pingTimeout: 60000,
});
