import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js'; 

// Import des Types centralisés
import { Room, ExtendedPlayer } from './types/shared';

// Import de la logique de jeu et utilitaires
import { startGameLoop, cleanPlayersData } from './services/gameLoop';
import { getAllAnimeNames } from './services/gameService';
import { GAME_CONSTANTS } from './config/constants';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// ==================================================================
// CONFIGURATION SUPABASE ADMIN
// ==================================================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ ERREUR CRITIQUE: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans le .env !");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Configuration CORS Express
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST"]
}));
app.use(express.json());

// Route Health Check (Vital pour Render)
app.get('/health', (req, res) => { res.status(200).send('OK'); });
app.get('/', (req, res) => { res.send('👋 Server AniQuizz V1 Clean & Secure'); });

// Création du serveur HTTP
const httpServer = createServer(app);

// ==================================================================
// FIX CRITIQUE POUR RENDER / LOAD BALANCERS
// ==================================================================
httpServer.keepAliveTimeout = 65000; 
httpServer.headersTimeout = 66000;   

const io = new Server(httpServer, {
    cors: { 
        origin: "*", 
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'] 
});

// Stockage en mémoire des salles actives
const rooms = new Map<string, Room>();

// ==================================================================
// UTILITAIRES SERVEUR
// ==================================================================

function broadcastRooms() {
    const roomList = Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        host: room.players.find(p => p.id === room.hostId)?.username || "Inconnu",
        mode: room.settings?.gameType || "Standard",
        players: room.players.length,
        maxPlayers: room.maxPlayers || 8,
        isPrivate: room.settings?.isPrivate || false,
        status: room.status
    }));
    io.emit('rooms_update', roomList.filter(r => r.status !== 'finished' && r.maxPlayers > 1));
}

// ==================================================================
// MIDDLEWARE D'AUTHENTIFICATION (SECURITÉ SOCKET)
// ==================================================================
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (token) {
        try {
            const { data, error } = await supabaseAdmin.auth.getUser(token);

            if (error || !data.user) {
                socket.data.user = { id: socket.id, isGuest: true, email: "Invité" };
                return next();
            }

            socket.data.user = { id: data.user.id, isGuest: false, email: data.user.email };
            next();

        } catch (err) {
            console.error("Erreur auth socket:", err);
            socket.data.user = { id: socket.id, isGuest: true, email: "ErreurAuth" };
            next();
        }
    } else {
        socket.data.user = { id: socket.id, isGuest: true, email: "Invité" };
        next();
    }
});

// ==================================================================
// GESTION DES ÉVÉNEMENTS SOCKET
// ==================================================================
io.on('connection', (socket: Socket) => {
    
    const userLogInfo = socket.data.user.isGuest ? "Invité" : `User (${socket.data.user.email})`;
    console.log(`[SOCKET] 🔌 Connexion: ${socket.id} | ${userLogInfo}`);

    const authenticatedUserId = socket.data.user.isGuest ? socket.id : socket.data.user.id;

    // --- PROFIL ---
    socket.on('get_profile', async () => {
        socket.emit('user_profile', { username: "Invité", avatar: "player1" });
    });

    // --- CRÉATION DE SALLE ---
    socket.on('create_room', (data) => {
        const roomId = uuidv4().substring(0, 6).toUpperCase();
        
        const settings = data.settings || {};
        if (!settings.precision) settings.precision = 'franchise';

        console.log(`[ROOM] 🏠 CRÉATION | ID: ${roomId} | Host: ${data.username} | Mode: ${settings.gameType} | MaxPlayers: ${settings.maxPlayers}`);

        const newRoom: Room = {
            id: roomId,
            name: data.roomName || `Salon ${roomId}`,
            hostId: socket.id, 
            players: [{
                id: socket.id,
                username: data.username || "Hôte",
                avatar: data.avatar || "player1",
                score: 0,
                isReady: false,
                isInGame: false,
                dbId: authenticatedUserId 
            }],
            status: 'waiting',
            maxPlayers: settings.maxPlayers || 8,
            pauseVotes: new Set(),
            skipVotes: new Set(),
            isPaused: false,
            isPausePending: false,
            settings: settings,
            lastActivity: Date.now(),
            chatHistory: []
        };

        rooms.set(roomId, newRoom);
        socket.join(roomId);
        socket.emit('room_created', { roomId, room: newRoom });
        broadcastRooms();
    });

    // --- REJOINDRE UNE SALLE ---
    socket.on('join_room', (data) => {
        const room = rooms.get(data.roomId?.toUpperCase());
        
        if (!room) {
            socket.emit('error', { message: "Salon introuvable" });
            return;
        }

        console.log(`[ROOM] ➕ JOIN REQUEST | Room: ${room.id} | User: ${data.username || 'Inconnu'}`);

        if (room.players.length >= room.maxPlayers) {
            const exists = room.players.find(p => p.id === socket.id);
            if (!exists) {
                socket.emit('error', { message: "Salon complet" });
                return;
            }
        }
        
        if (room.settings.isPrivate && room.settings.password !== data.password) {
            if (!data.password) {
                socket.emit('password_required', { roomId: room.id });
                return;
            }
            socket.emit('error', { message: "Mot de passe incorrect" });
            return;
        }

        const existingPlayerIndex = room.players.findIndex(p => p.id === socket.id);

        if (existingPlayerIndex !== -1) {
            console.log(`[ROOM] 🔄 RECONNEXION | User: ${room.players[existingPlayerIndex].username} dans ${room.id}`);
            room.players[existingPlayerIndex].isReady = false;
            room.players[existingPlayerIndex].isInGame = false;
            room.players[existingPlayerIndex].score = 0; 
        } else {
            const newPlayer: ExtendedPlayer = {
                id: socket.id,
                username: data.username || `Joueur ${room.players.length + 1}`,
                avatar: data.avatar || "player1",
                score: 0,
                isReady: false,
                isInGame: false,
                dbId: authenticatedUserId 
            };
            room.players.push(newPlayer);
            console.log(`[ROOM] ✅ JOIN SUCCESS | Room: ${room.id} | Total: ${room.players.length}/${room.maxPlayers}`);
        }

        socket.join(room.id);
        
        if (room.status === 'finished') {
            room.status = 'waiting';
        }

        io.to(room.id).emit('player_joined', { players: cleanPlayersData(room.players) });
        socket.emit('chat_history', { messages: room.chatHistory });

        socket.emit('room_joined', { 
            roomId: room.id, 
            players: cleanPlayersData(room.players), 
            hostId: room.hostId, 
            roomSettings: room.settings 
        });
        broadcastRooms();
    });

    // --- QUITTER SALLE ---
    socket.on('leave_room', (data) => {
        const roomId = data.roomId?.toUpperCase();
        const room = rooms.get(roomId);
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            console.log(`[ROOM] 🚪 LEAVE | User: ${player?.username} left ${roomId}`);

            room.players = room.players.filter(p => p.id !== socket.id);
            socket.leave(roomId);
            
            if (room.players.length === 0) {
                console.log(`[ROOM] 🗑️ DELETE | Room ${roomId} vide, suppression.`);
                rooms.delete(roomId);
            } else {
                if (room.hostId === socket.id) {
                    room.hostId = room.players[0].id;
                    console.log(`[ROOM] 👑 NEW HOST | ${room.players[0].username} est l'hôte de ${roomId}`);
                }
                io.to(roomId).emit('player_left', { players: cleanPlayersData(room.players), hostId: room.hostId });
            }
            broadcastRooms();
        }
    });

    // --- SETTINGS ---
    socket.on('update_room_settings', (data) => {
        const room = rooms.get(data.roomId?.toUpperCase());
        if (room && room.hostId === socket.id) {
            console.log(`[ROOM] ⚙️ SETTINGS UPDATE | Room: ${room.id}`);
            room.settings = { ...room.settings, ...data.settings };
            
            if (data.settings.roomName) room.name = data.settings.roomName;
            if (data.settings.maxPlayers) room.maxPlayers = data.settings.maxPlayers;

            io.to(room.id).emit('room_updated', { 
                roomSettings: room.settings,
                roomName: room.name,
                players: cleanPlayersData(room.players)
            });
            broadcastRooms();
        }
    });

    socket.on('send_message', (data) => {
        const room = rooms.get(data.roomId?.toUpperCase());
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                const newMessage = {
                    id: uuidv4(),
                    userId: socket.id,
                    username: player.username,
                    text: data.message,
                    timestamp: Date.now(),
                    isSystem: false
                };
                room.chatHistory.push(newMessage);
                if (room.chatHistory.length > 50) room.chatHistory.shift();
                io.to(room.id).emit('new_message', newMessage);
            }
        }
    });

    socket.on('get_rooms', () => { broadcastRooms(); });

    // --- JEU : DÉMARRAGE ---
    socket.on('start_game', (data) => {
        const room = rooms.get(data.roomId?.toUpperCase());
        if (room && room.hostId === socket.id) {
            console.log(`[GAME] 🚀 START REQUEST | Room: ${room.id}`);
            
            room.status = 'playing';
            const gameId = uuidv4();
            room.currentGameId = gameId;
            room.players.forEach(p => { p.score = 0; p.isInGame = true; });
            
            broadcastRooms();
            
            // CORRECTION ICI : On n'envoie PAS de timestamp absolu, mais la DURÉE
            io.to(room.id).emit('game_started', { 
                roomId: room.id, 
                settings: room.settings,
                introDuration: GAME_CONSTANTS.TIMERS.INTRO_DELAY, // <-- Envoi de la durée (3000ms)
                players: cleanPlayersData(room.players)
            });

            startGameLoop(io, rooms, room.id, gameId, broadcastRooms);
        }
    });

    // ... (Reste du code inchangé : toggle_ready, submit_answer, vote_pause, vote_skip...)
    socket.on('toggle_ready', (data) => {
        const room = rooms.get(data.roomId?.toUpperCase());
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.isReady = !player.isReady; 
                io.to(room.id).emit('update_players', { players: cleanPlayersData(room.players) });
            }
        }
    });

    socket.on('submit_answer', (data) => {
        const room = rooms.get(data.roomId?.toUpperCase());
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.currentAnswer = (data.answer || "").trim();
                player.answerMode = data.mode;
                io.to(room.id).emit('update_players', { players: cleanPlayersData(room.players) });
            }
        }
    });

    socket.on('vote_pause', (data) => {
        const room = rooms.get(data.roomId?.toUpperCase());
        if (room) {
            if (room.pauseVotes.has(socket.id)) room.pauseVotes.delete(socket.id);
            else room.pauseVotes.add(socket.id);

            const activePlayers = room.players.filter(p => p.isInGame !== false).length;
            const required = activePlayers > 0 ? Math.ceil(activePlayers / 2) : 1;
            
            if (room.isPaused) {
                if (room.pauseVotes.size >= required) {
                    room.isPaused = false;
                    room.pauseVotes.clear();
                    io.to(room.id).emit('game_paused', { isPaused: false });
                }
            } else {
                if (room.pauseVotes.size >= required) room.isPausePending = true;
                else room.isPausePending = false; 
            }
            io.to(room.id).emit('vote_update', { type: 'pause', count: room.pauseVotes.size, required, isPending: room.isPausePending });
        }
    });

    socket.on('vote_skip', (data) => {
        const room = rooms.get(data.roomId?.toUpperCase());
        if (room) {
            if (room.skipVotes.has(socket.id)) room.skipVotes.delete(socket.id);
            else room.skipVotes.add(socket.id);

            const activePlayers = room.players.filter(p => p.isInGame !== false).length;
            const required = activePlayers > 0 ? Math.ceil(activePlayers / 2) : 1;
            
            io.to(room.id).emit('vote_update', { type: 'skip', count: room.skipVotes.size, required });
        }
    });

    socket.on('get_anime_list', async () => {
        try {
            const list = await getAllAnimeNames();
            socket.emit('anime_list', list);
        } catch (error) {
            socket.emit('error', { message: "Erreur lors de la récupération de la liste" });
        }
    });

    socket.on('disconnect', () => {
        console.log(`[SOCKET] 🔌 Déconnexion: ${socket.id}`);
        rooms.forEach((room, roomId) => {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const player = room.players[playerIndex];
                console.log(`[ROOM] 🚪 DISCONNECT LEAVE | User: ${player.username} left ${roomId}`);
                
                room.players = room.players.filter(p => p.id !== socket.id);
                if (room.players.length === 0) {
                    console.log(`[ROOM] 🗑️ DELETE | Room ${roomId} vide après déconnexion.`);
                    rooms.delete(roomId);
                } else {
                    if (room.hostId === socket.id) room.hostId = room.players[0].id;
                    io.to(roomId).emit('player_left', { players: cleanPlayersData(room.players), hostId: room.hostId });
                }
            }
        });
        broadcastRooms();
    });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`\n===================================================`);
    console.log(`🚀 SERVER STARTED on port ${PORT}`);
    console.log(`ℹ️  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`===================================================\n`);
});

const gracefulShutdown = async () => {
    console.log('\n[SERVER] 🔄 Received kill signal, shutting down gracefully');
    io.close(() => { console.log('[SERVER] 🔌 Socket.io server closed'); });
    httpServer.close(async () => {
        console.log('[SERVER] 🛑 HTTP server closed');
        try {
            await prisma.$disconnect();
            console.log('[SERVER] 💾 Prisma disconnected');
            process.exit(0);
        } catch (e) {
            console.error('[SERVER] Error during cleanup', e);
            process.exit(1);
        }
    });
    setTimeout(() => {
        console.error('[SERVER] Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);