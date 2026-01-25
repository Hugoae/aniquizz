import { Server } from 'socket.io';
import { Room, ExtendedPlayer } from '../types/shared';
import { GAME_CONSTANTS } from '../config/constants';
import { calculateScore } from '../utils/scoring';
import { isAnswerCorrect } from '../utils/answerChecker';
import { 
    getRandomSongs, 
    generateChoices, 
    generateDuo,
    getAniListIds
} from './gameService';
import { PrismaClient } from '@prisma/client';
import { GAME_RULES } from '../config/gameRules';

const prisma = new PrismaClient();

function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

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
        roundPoints: p.roundPoints || 0, 
        sessionWins: p.sessionWins || 0,
        streak: p.streak || 0
    }));
}

async function waitForTargetTime(io: Server, rooms: Map<string, Room>, roomId: string, targetTime: number, allowSkip: boolean = false) {
    const POLL_RATE = 100;

    while (Date.now() < targetTime) {
        const room = rooms.get(roomId);
        if (!room) return; 

        if (allowSkip) {
            const activePlayers = room.players.filter(p => p.isInGame !== false).length;
            const requiredVotes = activePlayers > 0 ? Math.ceil(activePlayers / 2) : 1;
            
            if (room.skipVotes.size >= requiredVotes && activePlayers > 0) {
                return; 
            }
        }

        if (room.isPaused) {
            const pauseStart = Date.now();
            while (true) {
                const checkRoom = rooms.get(roomId);
                if (!checkRoom || !checkRoom.isPaused) break;
                await new Promise(r => setTimeout(r, POLL_RATE));
            }
            targetTime += (Date.now() - pauseStart);
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

    // Initialisation
    room.players.forEach(p => { 
        p.score = 0; 
        p.correctCount = 0; 
        p.streak = 0;       
        (p as any).sessionMaxStreak = 0;
        // 👇 INIT POKEDEX
        p.heardSongIds = []; 
    });

    console.log(`[GAME] 🏁 LOOP START | Room: ${roomId} | Rounds: ${TOTAL_ROUNDS}`);

    await new Promise(r => setTimeout(r, GAME_CONSTANTS.TIMERS.INTRO_DELAY));

    // ... (LOGIQUE ANILIST INCHANGÉE) ...
    // Je raccourcis ici pour la lisibilité, garde ton bloc existant
    let sessionWatchedIds: number[] = [];
    if (settings.playlist === 'watchlist' || settings.useUserLists) {
        // ... Ton code existant pour AniList ...
        const playerListsPromises = room.players.map(async (p) => {
            const targetUser = p.anilistUsername || p.username; 
            if (!targetUser) return [];
            return await getAniListIds(targetUser);
        });
        const results = await Promise.all(playerListsPromises);
        // ... logique intersection/union ...
        const allIds = results.flat();
        sessionWatchedIds = [...new Set(allIds)];
    }

    const gameFilters = {
        difficulty: settings.difficulty,
        types: settings.soundTypes,
        playlist: settings.playlist,
        decade: settings.decade,
        watchedIds: sessionWatchedIds.length > 0 ? sessionWatchedIds : settings.watchedIds
    };

    const gameSongs = await getRandomSongs(TOTAL_ROUNDS, gameFilters);

    if (gameSongs.length === 0) {
        io.to(roomId).emit('error', { message: "Aucun son trouvé." });
        io.to(roomId).emit('game_over', { message: "Annulé." });
        room.status = 'waiting';
        onGameEnd(); 
        return;
    }

    // ---------------- BOUCLE DES ROUNDS ----------------
    for (let i = 0; i < TOTAL_ROUNDS; i++) {
        let currentRoom = rooms.get(roomId);
        if (!currentRoom || currentRoom.currentGameId !== gameId || currentRoom.status === 'finished') break;

        // Reset Round
        currentRoom.skipVotes.clear();
        currentRoom.players.forEach(p => {
            p.currentAnswer = null;
            p.answerMode = undefined;
            p.isCorrect = null;
            p.roundPoints = 0;
        });

        io.to(roomId).emit('update_players', { players: cleanPlayersData(currentRoom.players), hostId: currentRoom.hostId });
        io.to(roomId).emit('vote_update', { type: 'skip', count: 0, required: Math.ceil(currentRoom.players.length / 2) });

        const currentDbSong = gameSongs[i % gameSongs.length];
        
        // ... (Logique génération choix INCHANGÉE) ...
        const exactName = currentDbSong.anime.name;
        const franchiseName = currentDbSong.anime.franchise?.name || exactName; 
        const correctTarget = precisionMode === 'franchise' ? franchiseName : exactName;
        const responseType = settings.responseType || "typing";
        let canonicalChoices: string[] = [];
        let canonicalDuo: string[] = [];
        const choicesPromise = generateChoices(correctTarget, precisionMode, gameFilters);
        if (responseType === "qcm" || responseType === "mix") canonicalChoices = await choicesPromise;
        if (responseType === "duo" || responseType === "mix") canonicalDuo = await generateDuo(correctTarget, choicesPromise);

        // Start Time
        const songDuration = currentDbSong.duration || 89; 
        const maxStartTime = Math.max(0, songDuration - (GUESS_TIME_SEC + REVEAL_TIME_SEC + 5));
        const randomStartTime = Math.floor(Math.random() * maxStartTime);

        // --- GUESS ---
        const guessEndTime = Date.now() + (GUESS_TIME_SEC * 1000); 
        currentRoom.players.forEach(player => {
            const playerChoices = canonicalChoices.length > 0 ? shuffleArray(canonicalChoices) : [];
            const playerDuo = canonicalDuo.length > 0 ? shuffleArray(canonicalDuo) : [];
            io.to(String(player.id)).emit('round_start', {
                round: i + 1, totalRounds: TOTAL_ROUNDS,
                startTime: Date.now(), endTime: guessEndTime, duration: GUESS_TIME_SEC,
                song: { id: currentDbSong.id, videoKey: currentDbSong.videoKey, difficulty: currentDbSong.difficulty, type: currentDbSong.type },
                videoStartTime: randomStartTime, responseType, choices: playerChoices, duo: playerDuo,
                players: cleanPlayersData(currentRoom!.players)
            });
        });

        await waitForTargetTime(io, rooms, roomId, guessEndTime + 500, currentRoom.players.length === 1); 
        currentRoom = rooms.get(roomId); if (!currentRoom) return;

        // --- SCORING & POKEDEX ---
        currentRoom.players.forEach(p => {
            const correct = isAnswerCorrect(p.currentAnswer || "", correctTarget); 
            p.isCorrect = correct;
            
            if (p.heardSongIds) {
                p.heardSongIds.push(currentDbSong.id);
            }

            if (correct) {
                p.correctCount = (p.correctCount || 0) + 1;
                p.streak = (p.streak || 0) + 1;
                
                const currentSessionMax = (p as any).sessionMaxStreak || 0;
                if (p.streak && p.streak > currentSessionMax) (p as any).sessionMaxStreak = p.streak;

            } else {
                p.streak = 0;
            }

            p.score = (p.score || 0) + calculateScore({ mode: p.answerMode || 'typing', isCorrect: correct, streak: p.streak || 0 });
            p.roundPoints = calculateScore({ mode: p.answerMode || 'typing', isCorrect: correct, streak: p.streak || 0 });
        });

        // Clear votes
        currentRoom.skipVotes.clear(); 
        io.to(roomId).emit('vote_update', { type: 'skip', count: 0, required: Math.ceil(currentRoom.players.length / 2) });

        // --- REVEAL ---
        const mergedTags = Array.from(new Set([...(currentDbSong.anime.franchise?.genres || []), ...(currentDbSong.anime.tags || [])]));
        const revealEndTime = Date.now() + (REVEAL_TIME_SEC * 1000);

        io.to(roomId).emit('round_reveal', {
            startTime: Date.now(), endTime: revealEndTime, duration: REVEAL_TIME_SEC,
            song: {
                id: currentDbSong.id, animeId: currentDbSong.animeId, anime: correctTarget, exactName: exactName,
                franchise: franchiseName, title: currentDbSong.title, artist: currentDbSong.artist, type: currentDbSong.type,
                videoKey: currentDbSong.videoKey, difficulty: currentDbSong.difficulty, cover: currentDbSong.anime.coverImage,
                siteUrl: currentDbSong.anime.siteUrl, year: currentDbSong.anime.seasonYear, tags: mergedTags
            },
            correctAnswer: correctTarget, 
            players: cleanPlayersData(currentRoom.players)
        });

        await waitForTargetTime(io, rooms, roomId, revealEndTime, true);

        // --- PAUSE ---
        if (currentRoom.isPausePending) {
            currentRoom.isPaused = true;
            io.to(roomId).emit('game_paused', { isPaused: true });
            while (true) {
                const check = rooms.get(roomId);
                if (!check || !check.isPaused) break;
                await new Promise(r => setTimeout(r, 500));
            }
            const resumeDuration = 3; 
            const resumeEndTime = Date.now() + (resumeDuration * 1000);
            io.to(roomId).emit('game_resuming', { duration: resumeDuration, newEndTime: resumeEndTime });
            await new Promise(r => setTimeout(r, resumeDuration * 1000));
            const refreshedRoom = rooms.get(roomId);
            if (refreshedRoom) {
                refreshedRoom.isPausePending = false;
                io.to(roomId).emit('vote_update', { type: 'pause', count: 0, required: Math.ceil(refreshedRoom.players.length / 2), isPending: false });
            }
        }
    }

    // ---------------- FIN DE PARTIE ----------------
    const finalRoom = rooms.get(roomId);
    if (finalRoom && finalRoom.currentGameId === gameId) {
        console.log(`[GAME] 🏆 GAME OVER | Room: ${roomId}`);
        
        // --- 1. CALCUL DES DONNÉES DE VICTOIRE ---
        const isSolo = finalRoom.players.length === 1;
        
        // A. Calcul du Score Max Dynamique
        const responseType = settings.responseType || 'mix';
        let pointsPerRound = GAME_RULES.POINTS.MIX; // Par défaut 5

        if (responseType === 'qcm') {
            pointsPerRound = GAME_RULES.POINTS.QCM; // 2 pts
        } else {
            // Typing ou Mix
            pointsPerRound = GAME_RULES.POINTS.TYPING; // 5 pts
        }

        const totalMaxScore = TOTAL_ROUNDS * pointsPerRound;
        
        // Variables de victoire
        let soloTargetScore = 0;
        let difficultyKey = 'medium';
        let thresholdUsed = 0; // Pour info debug/front

        let multiWinnerCount = 0;
        let sortedPlayers: ExtendedPlayer[] = [];

        if (isSolo) {
            // B. Logique Solo avec Exception "Exact"
            if (settings.precision === 'exact') {
                // Mode Hardcore : Seuil forcé à 50%
                thresholdUsed = GAME_RULES.SOLO.EXACT_PRECISION_THRESHOLD;
                difficultyKey = 'exact'; // Marqueur spécial pour l'UI
            } else {
                // Mode Classique : Seuil selon difficulté
                difficultyKey = (settings.difficulty && settings.difficulty[0]) ? settings.difficulty[0] : 'medium';
                thresholdUsed = GAME_RULES.SOLO.THRESHOLDS[difficultyKey] || GAME_RULES.SOLO.DEFAULT_THRESHOLD;
            }
            
            soloTargetScore = Math.ceil(totalMaxScore * thresholdUsed);
        } else {
            // C. Logique Multi (Classement)
            sortedPlayers = [...finalRoom.players].sort((a, b) => b.score - a.score);
            multiWinnerCount = finalRoom.players.length <= GAME_RULES.MULTIPLAYER.SMALL_LOBBY_LIMIT 
                ? GAME_RULES.MULTIPLAYER.WINNERS_SMALL 
                : GAME_RULES.MULTIPLAYER.WINNERS_LARGE;
        }

        // --- 2. SAUVEGARDE EN BDD ---
        await Promise.all(finalRoom.players.map(async (p) => {
            let isWinner = false;

            if (isSolo) {
                isWinner = p.score >= soloTargetScore;
            } else {
                const rankIndex = sortedPlayers.findIndex(sp => sp.id === p.id);
                isWinner = rankIndex < multiWinnerCount;
            }

            if (p.dbId && !String(p.id).startsWith('guest')) {
                try {
                    const sessionBestStreak = (p as any).sessionMaxStreak || 0;
                    const userProfile = await prisma.profile.findUnique({ where: { id: p.dbId } });
                    
                    if (userProfile) {
                        const currentMaxStreak = (userProfile as any).maxStreak || 0;
                        const newMaxStreak = sessionBestStreak > currentMaxStreak ? sessionBestStreak : undefined;

                        await prisma.profile.update({
                            where: { id: p.dbId },
                            data: {
                                gamesPlayed: { increment: 1 },
                                gamesWon: isWinner ? { increment: 1 } : undefined,
                                totalGuesses: { increment: TOTAL_ROUNDS },
                                correctGuesses: { increment: p.correctCount || 0 },
                                maxStreak: newMaxStreak 
                            } as any
                        });
                    }

                    // Update Pokédex
                    const foundSongs = p.heardSongIds || [];
                    if (foundSongs.length > 0) {
                        const historyEntries = foundSongs.map(songId => ({
                            profileId: p.dbId!, 
                            songId: songId
                        }));
                        await prisma.songHistory.createMany({
                            data: historyEntries,
                            skipDuplicates: true
                        });
                    }

                } catch (err) {
                    console.error(`[DB] ❌ Erreur sauvegarde stats pour ${p.username}:`, err);
                }
            }
        }));

        // --- 3. ENVOI DES RÉSULTATS ---
        io.to(roomId).emit('game_over', { 
            message: "Partie terminée !",
            players: cleanPlayersData(finalRoom.players),
            hostId: finalRoom.hostId,
            victoryData: {
                isSolo,
                totalMaxScore,      // Le max calculé dynamiquement (ex: 20 pour QCM 10 rounds)
                soloTargetScore: isSolo ? soloTargetScore : undefined,
                soloDifficulty: isSolo ? difficultyKey : undefined,
                multiWinnerCount: !isSolo ? multiWinnerCount : undefined
            }
        });
        
        finalRoom.status = 'finished';
        finalRoom.players.forEach(p => { p.isInGame = false; p.isReady = false; });
        io.to(roomId).emit('update_players', { players: cleanPlayersData(finalRoom.players), hostId: finalRoom.hostId });
        
        onGameEnd();
    }
}