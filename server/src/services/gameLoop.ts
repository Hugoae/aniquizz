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
 * Fonction utilitaire pour mélanger un tableau (Fisher-Yates Shuffle).
 * Utilisée pour donner un ordre visuel différent à chaque joueur tout en gardant les mêmes items.
 */
function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

/**
 * Nettoie les données sensibles des joueurs avant envoi au client
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
        roundPoints: p.roundPoints,
        sessionWins: p.sessionWins || 0 
    }));
}

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
            
            // On attend tant que c'est en pause...
            while (room && room.isPaused) {
                await new Promise(r => setTimeout(r, POLL_RATE));
                if (!rooms.has(roomId)) return;
            }

            // Calcul du temps perdu pendant la pause
            const pauseDuration = Date.now() - pauseStart;
            // On repousse la fin du round d'autant
            targetTime += pauseDuration;
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
    const GUESS_TIME_SEC = parseInt(String(settings.guessDuration), 10) || 15;
    const REVEAL_TIME_SEC = 10; 
    const TV_SIZE_DURATION = 89;

    console.log(`[GAME] 🏁 LOOP START | Room: ${roomId} | Rounds: ${TOTAL_ROUNDS} | Difficulty: ${settings.difficulty}`);

    room.players.forEach(p => { p.score = 0; p.correctCount = 0; });

    // ---------------- PHASE 1 : INTRO ----------------
    await new Promise(r => setTimeout(r, GAME_CONSTANTS.TIMERS.INTRO_DELAY));

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
        io.to(roomId).emit('error', { message: "Aucun son trouvé avec ces critères (Playlist vide ?)" });
        io.to(roomId).emit('game_over', { message: "Annulé : Pas de sons trouvés." });
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

        // Mise à jour des joueurs (Score, Reset Ready, etc.)
        // CORRECTION ICI : Ajout de hostId pour que le client sache toujours qui est le chef
        io.to(roomId).emit('update_players', { 
            players: cleanPlayersData(currentRoom.players),
            hostId: currentRoom.hostId 
        });
        io.to(roomId).emit('vote_update', { type: 'skip', count: 0, required: Math.ceil(currentRoom.players.length / 2) });

        const currentDbSong = gameSongs[i % gameSongs.length];
        
        const exactName = currentDbSong.anime.name;
        const franchiseName = currentDbSong.anime.franchise?.name || exactName; 
        const correctTarget = precisionMode === 'franchise' ? franchiseName : exactName;

        console.log(`[GAME] 🎵 ROUND ${i+1} | Room: ${roomId} | Anime: ${correctTarget} | Title: ${currentDbSong.title}`);

        // Génération des choix QCM/Duo (CANONIQUES = Mêmes pour tout le monde)
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

        const totalPlayTimeNeeded = GUESS_TIME_SEC + REVEAL_TIME_SEC + 5;
        const maxStartTime = Math.max(0, TV_SIZE_DURATION - totalPlayTimeNeeded);
        const randomStartTime = Math.floor(Math.random() * maxStartTime);

        // ---------------- PHASE 2 : GUESS (DEVINETTE) ----------------
        
        // CALCUL DU TIMESTAMP ABSOLU DE FIN
        const guessDurationMs = GUESS_TIME_SEC * 1000;
        const guessEndTime = Date.now() + guessDurationMs; // C'est l'heure officielle de fin

        const commonPayload = {
            round: i + 1,
            totalRounds: TOTAL_ROUNDS,
            startTime: Date.now(),
            endTime: guessEndTime, // On envoie l'heure de fin précise au client
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

        // Envoi INDIVIDUEL (Unicast) pour mélanger les choix
        currentRoom.players.forEach(player => {
            // Mélange unique pour ce joueur
            const playerChoices = canonicalChoices.length > 0 ? shuffleArray(canonicalChoices) : [];
            const playerDuo = canonicalDuo.length > 0 ? shuffleArray(canonicalDuo) : [];

            io.to(String(player.id)).emit('round_start', {
                ...commonPayload,
                choices: playerChoices,
                duo: playerDuo
            });
        });

        // ATTENTE BASÉE SUR LE TIMESTAMP (Plus précis)
        const isSolo = currentRoom.players.length === 1;
        await waitForTargetTime(io, rooms, roomId, guessEndTime + 500, isSolo); // +500ms de marge de sécurité réseau

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
        
        const franchiseGenres = currentDbSong.anime.franchise?.genres || [];
        const animeTags = currentDbSong.anime.tags || [];
        const mergedTags = Array.from(new Set([...franchiseGenres, ...animeTags]));

        // CALCUL DU TIMESTAMP POUR LE REVEAL
        const revealDurationMs = REVEAL_TIME_SEC * 1000;
        const revealEndTime = Date.now() + revealDurationMs;

        io.to(roomId).emit('round_reveal', {
            startTime: Date.now(),
            endTime: revealEndTime, // Synchro absolue
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

        // ---------------- GESTION PAUSE PENDING ----------------
        if (currentRoom.isPausePending) {
            console.log(`[GAME] ⏸️ PAUSE TRIGGERED | Room: ${roomId}`);
            currentRoom.isPaused = true;
            io.to(roomId).emit('game_paused', { isPaused: true });
            
            while (currentRoom && currentRoom.isPaused) {
                await new Promise(r => setTimeout(r, 500));
                if (!rooms.has(roomId)) return;
            }
            
            // Reprise
            const resumeDuration = 3; // 3s de compte à rebours
            const resumeEndTime = Date.now() + (resumeDuration * 1000);
            
            io.to(roomId).emit('game_resuming', { 
                duration: resumeDuration,
                newEndTime: resumeEndTime // Pour synchro client si besoin
            });
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
            players: cleanPlayersData(finalRoom.players),
            hostId: finalRoom.hostId // <-- IMPORTANT : On renvoie qui est l'hôte à la fin
        });
        
        finalRoom.status = 'finished';
        finalRoom.players.forEach(p => { 
            p.isInGame = false; 
            p.isReady = false; 
        });
        
        io.to(roomId).emit('update_players', { 
            players: cleanPlayersData(finalRoom.players),
            hostId: finalRoom.hostId // <-- IMPORTANT
        });
        
        onGameEnd();
    }
}