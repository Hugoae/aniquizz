import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { securityConfig } from '../config/security'; // <-- Import modifié

const app = express();

app.use(cors(securityConfig)); // <-- Utilisation de la config
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

export const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: securityConfig, // <-- Utilisation de la config ici aussi
  pingTimeout: 60000,
});

io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);
});