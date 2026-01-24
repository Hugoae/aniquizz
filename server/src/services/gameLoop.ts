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

// ... (shuffleArray et waitForTargetTime restent identiques) ...
function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

// NOUVELLE FONCTION D'ATTENTE (TIMESTAMP ABSOLU)
async function waitForTargetTime(io: Server, rooms: Map<string, Room>, roomId: string, targetTime: number, allowSkip: boolean = false) {
    const POLL_RATE = 100;

    // Boucle tant que l'heure actuelle est inférieure à l'heure cible
    while (Date.now() < targetTime) {
        const room = rooms.get(roomId);
        if (!room) return; 

        // 1. Gestion du SKIP
        if (allowSkip) {
            const activePlayers = room.players.filter(p => p.isInGame !== false).length;
            const requiredVotes = activePlayers > 0 ? Math.ceil(activePlayers / 2) : 1;
            
            if (room.skipVotes.size >= requiredVotes && activePlayers > 0) {
                console.log(`[GAME] ⏭️ SKIPPED | Room: ${roomId} (Votes: ${room.skipVotes.size}/${requiredVotes})`);
                return; 
            }
        }

        // 2. Gestion de la PAUSE
        if (room.isPaused) {
            const pauseStart = Date.now();
            while (room && room.isPaused) {
                await new Promise(r => setTimeout(r, POLL_RATE));
                if (!rooms.has(roomId)) return;
            }
            const pauseDuration = Date.now() - pauseStart;
            targetTime += pauseDuration;
        }

        await new Promise(r => setTimeout(r, POLL_RATE));
    }
}

// MISE À JOUR DE cleanPlayersData pour inclure sessionWins
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
        roundPoints: p.roundPoints,
        sessionWins: p.sessionWins || 0 // <-- NOUVEAU
    }));
}

export async function startGameLoop(io: Server, rooms: Map<string, Room>, roomId: string, gameId: string, onGameEnd: () => void) {
    // ... (Le début reste identique jusqu'à la boucle de rounds) ...
    const room = rooms.get(roomId);
    if (!room) return;

    const settings = room.settings || {};
    const precisionMode = settings.precision || 'franchise'; 
    const TOTAL_ROUNDS = parseInt(String(settings.soundCount), 10) || 10;
    const GUESS_TIME_SEC = parseInt(String(settings.guessDuration), 10) || 15;
    const REVEAL_TIME_SEC = 10; 
    const TV_SIZE_DURATION = 89;

    console.log(`[GAME] 🏁 LOOP START | Room: ${roomId} | Rounds: ${TOTAL_ROUNDS} | Difficulty: ${settings.difficulty}`);

    room.players.forEach(p => { p.score = 0; p.correctCount = 0; });

    await new Promise(r => setTimeout(r, GAME_CONSTANTS.TIMERS.INTRO_DELAY));

    const gameFilters = {
        difficulty: settings.difficulty,
        types: settings.soundTypes,
        playlist: settings.playlist,
        decade: settings.decade,
        watchedIds: settings.watchedIds
    };

    console.log(`[GAME] 🔍 FETCH SONGS | Room: ${roomId}`);
    const gameSongs = await getRandomSongs(TOTAL_ROUNDS, gameFilters);

    if (gameSongs.length === 0) {
        io.to(roomId).emit('error', { message: "Aucun son trouvé avec ces critères (Playlist vide ?)" });
        io.to(roomId).emit('game_over', { message: "Annulé : Pas de sons trouvés." });
        room.status = 'waiting';
        onGameEnd(); 
        return;
    }

    for (let i = 0; i < TOTAL_ROUNDS; i++) {
        let currentRoom = rooms.get(roomId);
        if (!currentRoom || currentRoom.currentGameId !== gameId) return;
        if (currentRoom.status === 'finished') break;

        currentRoom.skipVotes.clear();
        currentRoom.players.forEach(p => {
            p.currentAnswer = null;
            p.answerMode = undefined;
            p.isCorrect = null;
            p.roundPoints = 0;
        });

        io.to(roomId).emit('update_players', { players: cleanPlayersData(currentRoom.players) });
        io.to(roomId).emit('vote_update', { type: 'skip', count: 0, required: Math.ceil(currentRoom.players.length / 2) });

        const currentDbSong = gameSongs[i % gameSongs.length];
        const exactName = currentDbSong.anime.name;
        const franchiseName = currentDbSong.anime.franchise?.name || exactName; 
        const correctTarget = precisionMode === 'franchise' ? franchiseName : exactName;

        const responseType = settings.responseType || "typing";
        let canonicalChoices: string[] = [];
        let canonicalDuo: string[] = [];

        const choicesPromise = generateChoices(correctTarget, precisionMode, gameFilters);

        if (responseType === "qcm" || responseType === "mix") {
            canonicalChoices = await choicesPromise;
        } 
        if (responseType === "duo" || responseType === "mix") {
            canonicalDuo = await generateDuo(correctTarget, choicesPromise);
        }

        const maxStartTime = Math.max(0, TV_SIZE_DURATION - (GUESS_TIME_SEC + REVEAL_TIME_SEC + 5));
        const randomStartTime = Math.floor(Math.random() * maxStartTime);

        // --- GUESS PHASE ---
        const guessDurationMs = GUESS_TIME_SEC * 1000;
        const guessEndTime = Date.now() + guessDurationMs;

        const commonPayload = {
            round: i + 1,
            totalRounds: TOTAL_ROUNDS,
            startTime: Date.now(),
            endTime: guessEndTime,
            duration: GUESS_TIME_SEC,
            song: {
                id: currentDbSong.id,
                videoKey: currentDbSong.videoKey,
                difficulty: currentDbSong.difficulty,
                type: currentDbSong.type
            },
            videoStartTime: randomStartTime,
            responseType,
            players: cleanPlayersData(currentRoom.players)
        };

        currentRoom.players.forEach(player => {
            const playerChoices = canonicalChoices.length > 0 ? shuffleArray(canonicalChoices) : [];
            const playerDuo = canonicalDuo.length > 0 ? shuffleArray(canonicalDuo) : [];
            io.to(String(player.id)).emit('round_start', { ...commonPayload, choices: playerChoices, duo: playerDuo });
        });

        const isSolo = currentRoom.players.length === 1;
        await waitForTargetTime(io, rooms, roomId, guessEndTime + 500, isSolo);

        currentRoom = rooms.get(roomId); 
        if (!currentRoom) return;

        // SCORING
        currentRoom.players.forEach(p => {
            const userAnswer = p.currentAnswer || "";
            const correct = isAnswerCorrect(userAnswer, correctTarget); 
            p.isCorrect = correct;
            if (correct) p.correctCount = (p.correctCount || 0) + 1;
            const points = calculateScore({ mode: p.answerMode || 'typing', isCorrect: correct, streak: 0 });
            p.roundPoints = points;
            p.score = (p.score || 0) + points;
        });

        currentRoom.skipVotes.clear();
        io.to(roomId).emit('vote_update', { type: 'skip', count: 0, required: Math.ceil(currentRoom.players.length / 2) });

        // --- REVEAL PHASE ---
        const franchiseGenres = currentDbSong.anime.franchise?.genres || [];
        const animeTags = currentDbSong.anime.tags || [];
        const mergedTags = Array.from(new Set([...franchiseGenres, ...animeTags]));

        const revealDurationMs = REVEAL_TIME_SEC * 1000;
        const revealEndTime = Date.now() + revealDurationMs;

        io.to(roomId).emit('round_reveal', {
            startTime: Date.now(),
            endTime: revealEndTime,
            duration: REVEAL_TIME_SEC,
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
                year: currentDbSong.anime.seasonYear,
                tags: mergedTags
            },
            correctAnswer: correctTarget,
            players: cleanPlayersData(currentRoom.players)
        });

        await waitForTargetTime(io, rooms, roomId, revealEndTime, true);

        // PAUSE PENDING
        if (currentRoom.isPausePending) {
            currentRoom.isPaused = true;
            io.to(roomId).emit('game_paused', { isPaused: true });
            while (currentRoom && currentRoom.isPaused) {
                await new Promise(r => setTimeout(r, 500));
                if (!rooms.has(roomId)) return;
            }
            const resumeDuration = 3;
            const resumeEndTime = Date.now() + (resumeDuration * 1000);
            io.to(roomId).emit('game_resuming', { duration: resumeDuration, newEndTime: resumeEndTime });
            await new Promise(r => setTimeout(r, resumeDuration * 1000));
            currentRoom.isPausePending = false;
            io.to(roomId).emit('vote_update', { type: 'pause', count: 0, required: Math.ceil(currentRoom.players.length / 2), isPending: false });
        }
    }

    // ---------------- FIN DE PARTIE ----------------
    const finalRoom = rooms.get(roomId);
    if (finalRoom && finalRoom.currentGameId === gameId) {
        console.log(`[GAME] 🏆 GAME OVER | Room: ${roomId}`);
        
        // --- NOUVEAU : CALCUL DES VICTOIRES DE SESSION ---
        const maxScore = Math.max(...finalRoom.players.map(p => p.score));
        if (maxScore > 0) { // On ne compte la victoire que si score > 0
            finalRoom.players.forEach(p => {
                if (p.score === maxScore) {
                    p.sessionWins = (p.sessionWins || 0) + 1;
                }
            });
        }

        io.to(roomId).emit('game_over', { 
            message: "Partie terminée !",
            players: cleanPlayersData(finalRoom.players) // On envoie les joueurs mis à jour
        });
        
        finalRoom.status = 'finished';
        finalRoom.players.forEach(p => { 
            p.isInGame = false; 
            p.isReady = false; 
        });
        
        io.to(roomId).emit('update_players', { players: cleanPlayersData(finalRoom.players) });
        onGameEnd();
    }
}