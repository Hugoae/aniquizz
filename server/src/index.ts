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

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => { res.send('👋 Server AniQuizz V1 Clean & Secure'); });

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Stockage en mémoire des salles actives
const rooms = new Map<string, Room>();

// ==================================================================
// UTILITAIRES SERVEUR
// ==================================================================

/**
 * Diffuse la liste des salles publiques à tout le monde.
 * (Filtrage des rooms privées ou finies)
 */
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
            // Vérification du token via Supabase Admin
            const { data, error } = await supabaseAdmin.auth.getUser(token);

            if (error || !data.user) {
                console.log("⚠️ Token invalide, connexion en Invité.");
                socket.data.user = { id: socket.id, isGuest: true };
                return next();
            }

            // Token valide : on attache le VRAI ID utilisateur
            socket.data.user = { id: data.user.id, isGuest: false };
            console.log(`✅ Auth success: ${data.user.email}`);
            next();

        } catch (err) {
            console.error("Erreur auth socket:", err);
            socket.data.user = { id: socket.id, isGuest: true };
            next();
        }
    } else {
        // Pas de token = Invité
        socket.data.user = { id: socket.id, isGuest: true };
        next();
    }
});

// ==================================================================
// GESTION DES ÉVÉNEMENTS SOCKET
// ==================================================================
io.on('connection', (socket: Socket) => {
    
    // Identité sécurisée récupérée du middleware
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

        const newRoom: Room = {
            id: roomId,
            name: data.roomName || `Salon ${roomId}`,
            hostId: socket.id, // L'hôte est celui qui ouvre le socket
            players: [{
                id: socket.id,
                username: data.username || "Hôte",
                avatar: data.avatar || "player1",
                score: 0,
                isReady: false,
                isInGame: false,
                dbId: authenticatedUserId // ID Sécurisé
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
        if (room.players.length >= room.maxPlayers) {
            const exists = room.players.find(p => p.id === socket.id);
            if (!exists) {
                socket.emit('error', { message: "Salon complet" });
                return;
            }
        }
        // Vérification Mot de passe
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
            // Joueur déjà présent (reconnexion)
            room.players[existingPlayerIndex].isReady = false;
            room.players[existingPlayerIndex].isInGame = false;
            room.players[existingPlayerIndex].score = 0; 
        } else {
            // Nouveau joueur
            const newPlayer: ExtendedPlayer = {
                id: socket.id,
                username: data.username || `Joueur ${room.players.length + 1}`,
                avatar: data.avatar || "player1",
                score: 0,
                isReady: false,
                isInGame: false,
                dbId: authenticatedUserId // ID Sécurisé
            };
            room.players.push(newPlayer);
        }

        socket.join(room.id);
        
        if (room.status === 'finished') {
            room.status = 'waiting';
        }

        io.to(room.id).emit('player_joined', { players: cleanPlayersData(room.players) });
        
        // Envoi de l'historique de chat au nouvel arrivant
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
            room.players = room.players.filter(p => p.id !== socket.id);
            socket.leave(roomId);
            
            if (room.players.length === 0) {
                rooms.delete(roomId);
            } else {
                if (room.hostId === socket.id) {
                    room.hostId = room.players[0].id; // Transfert host
                }
                io.to(roomId).emit('player_left', { players: cleanPlayersData(room.players), hostId: room.hostId });
            }
            broadcastRooms();
        }
    });

    // --- SETTINGS ---
    socket.on('update_room_settings', (data) => {
        const room = rooms.get(data.roomId?.toUpperCase());
        
        // Seul l'hôte peut modifier
        if (room && room.hostId === socket.id) {
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

    // --- CHAT ---
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

    socket.on('get_rooms', () => {
        broadcastRooms();
    });

    // --- JEU : DÉMARRAGE ---
    socket.on('start_game', (data) => {
        const room = rooms.get(data.roomId?.toUpperCase());
        if (room && room.hostId === socket.id) {
            room.status = 'playing';
            const gameId = uuidv4();
            room.currentGameId = gameId;
            room.players.forEach(p => { p.score = 0; p.isInGame = true; });
            
            broadcastRooms();
            io.to(room.id).emit('game_started', { 
                roomId: room.id, 
                settings: room.settings,
                gameStartTime: Date.now() + GAME_CONSTANTS.TIMERS.INTRO_DELAY,
                players: cleanPlayersData(room.players)
            });

            // Lancement de la boucle de jeu importée (service/gameLoop.ts)
            startGameLoop(io, rooms, room.id, gameId, broadcastRooms);
        }
    });

    // --- JEU : ACTIONS ---
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
                // Si en pause, on reprend
                if (room.pauseVotes.size >= required) {
                    room.isPaused = false;
                    room.pauseVotes.clear();
                    io.to(room.id).emit('game_paused', { isPaused: false });
                }
            } else {
                // Sinon, on planifie la pause
                if (room.pauseVotes.size >= required) {
                    room.isPausePending = true;
                } else {
                    room.isPausePending = false; 
                }
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
        const list = await getAllAnimeNames();
        socket.emit('anime_list', list);
    });

    socket.on('disconnect', () => {
        rooms.forEach((room, roomId) => {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players = room.players.filter(p => p.id !== socket.id);
                if (room.players.length === 0) {
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

httpServer.listen(process.env.PORT || 3001, () => {
    console.log(`🚀 Server ready on port ${process.env.PORT || 3001}`);
});