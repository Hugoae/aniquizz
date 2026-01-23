import { Server } from 'socket.io';
import { Room, ExtendedPlayer } from '../types/shared';
import { GAME_CONSTANTS } from '../config/constants';
import { calculateScore } from '../utils/scoring';
import { isAnswerCorrect } from '../utils/answerChecker';
import { 
    getRandomSongs, 
    generateChoices, 
    generateDuo 
} from './gameService';

/**
 * Nettoie les données des joueurs avant l'envoi au client.
 * Retire les informations sensibles ou internes (dbId, etc.)
 */
export function cleanPlayersData(players: ExtendedPlayer[]) {
    return players.map(p => ({
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        score: p.score,
        isReady: p.isReady,
        isInGame: p.isInGame,
        isCorrect: p.isCorrect,
        currentAnswer: p.currentAnswer,
        roundPoints: p.roundPoints
    }));
}

/**
 * Fonction d'attente intelligente.
 * Attend 'ms' millisecondes, mais vérifie régulièrement les votes de PAUSE ou SKIP.
 */
async function waitForDuration(io: Server, rooms: Map<string, Room>, roomId: string, ms: number, allowSkip: boolean = false) {
    const POLL_RATE = 100;
    const steps = ms / POLL_RATE;

    for (let i = 0; i < steps; i++) {
        const room = rooms.get(roomId);
        if (!room) return; // La room a été détruite

        // 1. Gestion du SKIP (Majorité absolue requise)
        if (allowSkip) {
            const activePlayers = room.players.filter(p => p.isInGame !== false).length;
            const requiredVotes = activePlayers > 0 ? Math.ceil(activePlayers / 2) : 1;
            
            if (room.skipVotes.size >= requiredVotes && activePlayers > 0) {
                return; // On coupe l'attente immédiatement
            }
        }

        // 2. Gestion de la PAUSE (Boucle bloquante)
        while (room && room.isPaused) {
            await new Promise(r => setTimeout(r, POLL_RATE));
            if (!rooms.has(roomId)) return;
        }

        await new Promise(r => setTimeout(r, POLL_RATE));
    }
}

/**
 * BOUCLE DE JEU PRINCIPALE
 * Gère l'intégralité d'une partie du début à la fin.
 */
export async function startGameLoop(io: Server, rooms: Map<string, Room>, roomId: string, gameId: string, onGameEnd: () => void) {
    const room = rooms.get(roomId);
    if (!room) return;

    // Récupération des paramètres
    const settings = room.settings || {};
    const precisionMode = settings.precision || 'franchise'; 
    const TOTAL_ROUNDS = parseInt(String(settings.soundCount), 10) || 10;
    const GUESS_TIME = parseInt(String(settings.guessDuration), 10) || 15;
    const REVEAL_TIME = 15;
    
    const TV_SIZE_DURATION = 89; // Durée standard d'un Opening TV Size (1m29)

    // Reset des scores
    room.players.forEach(p => { p.score = 0; p.correctCount = 0; });

    // ---------------- PHASE 1 : INTRO ----------------
    await waitForDuration(io, rooms, roomId, GAME_CONSTANTS.TIMERS.INTRO_DELAY);

    // Préparation des filtres
    const gameFilters = {
        difficulty: settings.difficulty,
        types: settings.soundTypes,
        playlist: settings.playlist,
        decade: settings.decade,
        watchedIds: settings.watchedIds
    };

    // Sélection des sons
    const gameSongs = await getRandomSongs(TOTAL_ROUNDS, gameFilters);

    if (gameSongs.length === 0) {
        io.to(roomId).emit('error', { message: "Aucun son trouvé avec ces critères !" });
        room.status = 'waiting';
        onGameEnd(); 
        return;
    }

    // ---------------- BOUCLE DES ROUNDS ----------------
    for (let i = 0; i < TOTAL_ROUNDS; i++) {
        let currentRoom = rooms.get(roomId);
        if (!currentRoom || currentRoom.currentGameId !== gameId) return; // Partie arrêtée ou nouvelle partie lancée

        if (currentRoom.status === 'finished') break;

        // Reset état du round
        currentRoom.skipVotes.clear();
        currentRoom.players.forEach(p => {
            p.currentAnswer = null;
            p.answerMode = undefined;
            p.isCorrect = null;
            p.roundPoints = 0;
        });

        // Mise à jour client : "Nouveau Round"
        io.to(roomId).emit('update_players', { players: cleanPlayersData(currentRoom.players) });
        io.to(roomId).emit('vote_update', { type: 'skip', count: 0, required: Math.ceil(currentRoom.players.length / 2) });

        const currentDbSong = gameSongs[i % gameSongs.length];
        
        const exactName = currentDbSong.anime.name;
        const franchiseName = currentDbSong.anime.franchise?.name || exactName; 
        const correctTarget = precisionMode === 'franchise' ? franchiseName : exactName;

        // Génération des choix QCM/Duo
        const responseType = settings.responseType || "typing";
        let choices: string[] = [];
        let duo: string[] = [];

        const choicesPromise = generateChoices(correctTarget, precisionMode, gameFilters);

        if (responseType === "qcm" || responseType === "mix") {
            choices = await choicesPromise;
        } 
        if (responseType === "duo" || responseType === "mix") {
            duo = await generateDuo(correctTarget, choicesPromise);
        }

        // Calcul du Start Time Aléatoire
        // Formule : Durée max = (Durée Vidéo) - (Temps Guess + Temps Reveal + Marge 5s)
        const totalPlayTimeNeeded = GUESS_TIME + REVEAL_TIME + 5;
        const maxStartTime = Math.max(0, TV_SIZE_DURATION - totalPlayTimeNeeded);
        const randomStartTime = Math.floor(Math.random() * maxStartTime);

        // ---------------- PHASE 2 : GUESS (DEVINETTE) ----------------
        io.to(roomId).emit('round_start', {
            round: i + 1,
            totalRounds: TOTAL_ROUNDS,
            startTime: Date.now(),
            duration: GUESS_TIME,
            song: {
                id: currentDbSong.id,
                videoKey: currentDbSong.videoKey,
                difficulty: currentDbSong.difficulty,
                type: currentDbSong.type
            },
            videoStartTime: randomStartTime, // Offset vidéo envoyé au client
            responseType,
            choices,
            duo,
            players: cleanPlayersData(currentRoom.players)
        });

        // Attente (+500ms de tolérance réseau)
        await waitForDuration(io, rooms, roomId, (GUESS_TIME * 1000) + 500, false);

        currentRoom = rooms.get(roomId); 
        if (!currentRoom) return;

        // ---------------- CALCUL DES POINTS ----------------
        currentRoom.players.forEach(p => {
            const userAnswer = p.currentAnswer || "";
            const correct = isAnswerCorrect(userAnswer, correctTarget); 
            
            p.isCorrect = correct;
            if (correct) p.correctCount = (p.correctCount || 0) + 1;

            const points = calculateScore({
                mode: p.answerMode || 'typing',
                isCorrect: correct,
                streak: 0 
            });

            p.roundPoints = points;
            p.score = (p.score || 0) + points;
        });

        currentRoom.skipVotes.clear();
        io.to(roomId).emit('vote_update', { type: 'skip', count: 0, required: Math.ceil(currentRoom.players.length / 2) });

        // ---------------- PHASE 3 : REVEAL (RÉPONSE) ----------------
        io.to(roomId).emit('round_reveal', {
            startTime: Date.now(),
            duration: REVEAL_TIME,
            song: {
                id: currentDbSong.id,
                anime: correctTarget,
                title: currentDbSong.title,
                artist: currentDbSong.artist,
                type: currentDbSong.type,
                videoKey: currentDbSong.videoKey,
                difficulty: currentDbSong.difficulty,
                cover: currentDbSong.anime.coverImage,
                siteUrl: currentDbSong.anime.siteUrl,
                year: currentDbSong.anime.seasonYear 
            },
            correctAnswer: correctTarget,
            players: cleanPlayersData(currentRoom.players)
        });

        // Attente Reveal (Skip autorisé ici)
        await waitForDuration(io, rooms, roomId, REVEAL_TIME * 1000, true);

        // ---------------- GESTION PAUSE ----------------
        // Si une pause a été demandée pendant le round, on l'active maintenant
        if (currentRoom.isPausePending) {
            currentRoom.isPaused = true;
            io.to(roomId).emit('game_paused', { isPaused: true });
            
            // On boucle tant que c'est en pause
            while (currentRoom && currentRoom.isPaused) {
                await new Promise(r => setTimeout(r, 500));
                if (!rooms.has(roomId)) return;
            }
            
            // Reprise avec compte à rebours
            io.to(roomId).emit('game_resuming', { duration: 3 });
            await new Promise(r => setTimeout(r, 3000));
            
            currentRoom.isPausePending = false;
            io.to(roomId).emit('vote_update', { type: 'pause', count: 0, required: Math.ceil(currentRoom.players.length / 2), isPending: false });
        }
    }

    // ---------------- FIN DE PARTIE ----------------
    const finalRoom = rooms.get(roomId);
    if (finalRoom && finalRoom.currentGameId === gameId) {
        io.to(roomId).emit('game_over', { message: "Partie terminée !" });
        finalRoom.status = 'finished';
        finalRoom.players.forEach(p => {
            p.isInGame = false;
            p.isReady = false; 
        });
        io.to(roomId).emit('update_players', { players: cleanPlayersData(finalRoom.players) });
        
        // Callback pour dire à index.ts de mettre à jour le lobby
        onGameEnd();
    }
}