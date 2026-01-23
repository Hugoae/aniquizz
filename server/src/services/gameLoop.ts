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

async function waitForDuration(io: Server, rooms: Map<string, Room>, roomId: string, ms: number, allowSkip: boolean = false) {
    const POLL_RATE = 100;
    const steps = ms / POLL_RATE;

    for (let i = 0; i < steps; i++) {
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
        while (room && room.isPaused) {
            await new Promise(r => setTimeout(r, POLL_RATE));
            if (!rooms.has(roomId)) return;
        }

        await new Promise(r => setTimeout(r, POLL_RATE));
    }
}

export async function startGameLoop(io: Server, rooms: Map<string, Room>, roomId: string, gameId: string, onGameEnd: () => void) {
    const room = rooms.get(roomId);
    if (!room) return;

    const settings = room.settings || {};
    const precisionMode = settings.precision || 'franchise'; 
    const TOTAL_ROUNDS = parseInt(String(settings.soundCount), 10) || 10;
    const GUESS_TIME = parseInt(String(settings.guessDuration), 10) || 15;
    const REVEAL_TIME = 15;
    const TV_SIZE_DURATION = 89;

    console.log(`[GAME] 🏁 LOOP START | Room: ${roomId} | Rounds: ${TOTAL_ROUNDS} | Difficulty: ${settings.difficulty}`);

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
    console.log(`[GAME] 🔍 FETCH SONGS | Room: ${roomId} | Filters: ${JSON.stringify(gameFilters)}`);
    const gameSongs = await getRandomSongs(TOTAL_ROUNDS, gameFilters);

    if (gameSongs.length === 0) {
        console.error(`[GAME] ❌ ERROR NO SONGS | Room: ${roomId}`);
        io.to(roomId).emit('error', { message: "Aucun son trouvé avec ces critères !" });
        room.status = 'waiting';
        onGameEnd(); 
        return;
    }
    console.log(`[GAME] ✅ SONGS READY | Room: ${roomId} | Count: ${gameSongs.length}`);

    // ---------------- BOUCLE DES ROUNDS ----------------
    for (let i = 0; i < TOTAL_ROUNDS; i++) {
        let currentRoom = rooms.get(roomId);
        if (!currentRoom || currentRoom.currentGameId !== gameId) {
            console.log(`[GAME] 🛑 LOOP STOPPED | Room: ${roomId} (Room deleted or new game started)`);
            return;
        }

        if (currentRoom.status === 'finished') break;

        // Reset état du round
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

        console.log(`[GAME] 🎵 ROUND ${i+1} | Room: ${roomId} | Anime: ${correctTarget} | Title: ${currentDbSong.title}`);

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
            videoStartTime: randomStartTime,
            responseType,
            choices,
            duo,
            players: cleanPlayersData(currentRoom.players)
        });

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

        await waitForDuration(io, rooms, roomId, REVEAL_TIME * 1000, true);

        // ---------------- GESTION PAUSE PENDING ----------------
        if (currentRoom.isPausePending) {
            console.log(`[GAME] ⏸️ PAUSE TRIGGERED | Room: ${roomId}`);
            currentRoom.isPaused = true;
            io.to(roomId).emit('game_paused', { isPaused: true });
            
            while (currentRoom && currentRoom.isPaused) {
                await new Promise(r => setTimeout(r, 500));
                if (!rooms.has(roomId)) return;
            }
            
            io.to(roomId).emit('game_resuming', { duration: 3 });
            await new Promise(r => setTimeout(r, 3000));
            
            currentRoom.isPausePending = false;
            io.to(roomId).emit('vote_update', { type: 'pause', count: 0, required: Math.ceil(currentRoom.players.length / 2), isPending: false });
        }
    }

    // ---------------- FIN DE PARTIE ----------------
    const finalRoom = rooms.get(roomId);
    if (finalRoom && finalRoom.currentGameId === gameId) {
        console.log(`[GAME] 🏆 GAME OVER | Room: ${roomId} | Winner: ${finalRoom.players.sort((a,b) => b.score - a.score)[0]?.username}`);
        io.to(roomId).emit('game_over', { message: "Partie terminée !" });
        finalRoom.status = 'finished';
        finalRoom.players.forEach(p => {
            p.isInGame = false;
            p.isReady = false; 
        });
        io.to(roomId).emit('update_players', { players: cleanPlayersData(finalRoom.players) });
        
        onGameEnd();
    }
}