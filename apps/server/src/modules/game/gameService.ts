import { Difficulty, SongType } from '@prisma/client';
import { prisma } from '@aniquizz/database';
import { getUserAnimeIds } from '../anilist/anilistService';
import { logger } from '../../utils/logger';
import { GAME_CONFIG, formatSongTypeLabel } from '@aniquizz/shared';

const toDifficultyEnum = (value: string): Difficulty => {
  switch (value.toLowerCase()) {
    case 'easy':
      return Difficulty.EASY;
    case 'hard':
      return Difficulty.HARD;
    default:
      return Difficulty.MEDIUM;
  }
};

/**
 * Critères de filtrage pour la sélection des musiques.
 */
export interface SongFilters {
    /** Difficultés acceptées (easy, medium, hard) */
    difficulty?: string[];
    /** Types de sons acceptés (opening, ending, insert) */
    types?: string[];
    /** Identifiant d'une playlist spécifique (top-50, decades, genres...) */
    playlist?: string | null;
    /** Décennie de départ (ex: "2010" pour 2010-2019) */
    decade?: string;
    /** Liste des IDs d'animes vus par les joueurs (Mode Watched) */
    watchedIds?: number[];
}

// ---------------------------------------------------------------------------
// ALGORITHMES DE SÉLECTION & TRI (INTERNES)
// ---------------------------------------------------------------------------

/**
 * Sélectionne les candidats en maximisant la diversité des franchises.
 */
const pickBestCandidates = (candidates: any[], count: number) => {
    // Mélange initial pour éviter le biais d'ID
    const pool = [...candidates].sort(() => 0.5 - Math.random());
    
    const selected: any[] = [];
    const usedKeys = new Set<string>();
    const leftovers: any[] = [];

    // Passe 1 : Priorité à la diversité (1 par franchise)
    for (const c of pool) {
        const key = c.anime?.franchiseId ? `f-${c.anime.franchiseId}` : `a-${c.anime.name}`;
        
        if (!usedKeys.has(key)) {
            selected.push(c);
            usedKeys.add(key);
        } else {
            leftovers.push(c);
        }
        
        if (selected.length >= count) break;
    }

    // Passe 2 : Remplissage avec les doublons si nécessaire
    if (selected.length < count) {
        const needed = count - selected.length;
        leftovers.sort(() => 0.5 - Math.random()); // Mélange des restes
        selected.push(...leftovers.slice(0, needed));
    }

    return selected.slice(0, count);
};

/**
 * Trie la playlist finale pour espacer les répétitions.
 */
const smartShuffle = (songs: any[]) => {
    if (!songs || songs.length === 0) return [];

    // 1. Groupement
    const groups: Record<string, any[]> = {};
    for (const song of songs) {
        const key = song.anime.franchise?.name || song.anime.name || "Unknown";
        if (!groups[key]) groups[key] = [];
        groups[key].push(song);
    }

    // 2. Mélange interne (varier l'ordre des OP/ED d'une même série)
    Object.keys(groups).forEach(key => {
        groups[key].sort(() => 0.5 - Math.random());
    });

    // 3. Tri des groupes (Les plus gros d'abord)
    const sortedGroups = Object.values(groups).sort((a, b) => {
        const diff = b.length - a.length;
        return diff !== 0 ? diff : 0.5 - Math.random();
    });

    // 4. Entrelacement
    const result: any[] = [];
    const maxLen = sortedGroups[0].length;

    for (let i = 0; i < maxLen; i++) {
        for (const group of sortedGroups) {
            if (group[i]) {
                result.push(group[i]);
            }
        }
    }

    return result;
};

// Difficulty cascade (hardest → easiest)
const DIFFICULTY_ORDER: Difficulty[] = [Difficulty.HARD, Difficulty.MEDIUM, Difficulty.EASY];

/**
 * Exécute la stratégie de récupération en cascade (Waterfall).
 */
const fetchWithFallback = async (
    count: number, 
    baseWhere: any, 
    watchedIds?: number[], 
    targetDifficulties: string[] = []
) => {
    let finalSongs: any[] = [];
    let excludedIds: number[] = [];
    let fallbackUsed = false;
    
    const isWatchedMode = Array.isArray(watchedIds) && watchedIds.length > 0;

    const getCandidates = async (where: any) => {
        return await prisma.song.findMany({ 
            where, 
            select: { 
                id: true, 
                anime: { select: { name: true, franchiseId: true } }
            } 
        });
    };

    let cascade: Difficulty[][] = [];
    
    if (!targetDifficulties || targetDifficulties.length === 0) {
        cascade = [[]];
    } else {
        const mapped = [...new Set(targetDifficulties.map(toDifficultyEnum))];
        cascade.push(mapped);

        let lowestIndex = -1;
        mapped.forEach((d) => {
            const idx = DIFFICULTY_ORDER.indexOf(d);
            if (idx > lowestIndex) lowestIndex = idx;
        });

        if (lowestIndex !== -1) {
            for (let i = lowestIndex + 1; i < DIFFICULTY_ORDER.length; i++) {
                cascade.push([DIFFICULTY_ORDER[i]]);
            }
        }
    }

    logger.debug(`[GameService] Démarrage Cascade. Demande: ${count} sons. Étapes: ${cascade.map(c => c.join('|')).join(' -> ')}`, 'Service');

    // 2. Boucle Principale de Remplissage
    for (const difficulties of cascade) {
        // Si on a assez de sons, on arrête tout
        if (finalSongs.length >= count) break;

        const diffFilter = difficulties.length === 0 ? undefined : { in: difficulties };

        // --- SOUS-ÉTAPE A : Watched List (Priorité) ---
        if (isWatchedMode) {
            const remaining = count - finalSongs.length;
            const watchedWhere = { 
                ...baseWhere, 
                animeId: { in: watchedIds },
                id: { notIn: excludedIds }
            };
            if (diffFilter) watchedWhere.difficulty = diffFilter;

            try {
                const candidates = await getCandidates(watchedWhere);
                if (candidates.length > 0) {
                    const selected = pickBestCandidates(candidates, remaining);
                    const picked = await prisma.song.findMany({ 
                        where: { id: { in: selected.map(s => s.id) } }, 
                        include: { anime: { include: { franchise: true } } } 
                    });
                    
                    finalSongs.push(...picked);
                    excludedIds.push(...picked.map(s => s.id));
                    logger.info(`[GameService] Cascade (${difficulties}) [WATCHED]: Trouvé ${candidates.length}, Ajouté ${picked.length} sons.`, 'Service');
                }
            } catch (e) {
                logger.error("[GameService] Erreur Fetch Cascade Watched", 'Service', e);
            }
        }

        // --- SOUS-ÉTAPE B : Aléatoire Global (Complétion) ---
        // On ne passe ici que si la Watched List n'a pas suffi pour cette difficulté
        if (finalSongs.length < count) {
            const remaining = count - finalSongs.length;
            const globalWhere = { 
                ...baseWhere, 
                id: { notIn: excludedIds }
            };
            if (diffFilter) globalWhere.difficulty = diffFilter;

            // Si on est en mode Watched et qu'on tape dans le global, c'est un fallback
            if (isWatchedMode) fallbackUsed = true;

            try {
                const candidates = await getCandidates(globalWhere);
                if (candidates.length > 0) {
                    const selected = pickBestCandidates(candidates, remaining);
                    const picked = await prisma.song.findMany({ 
                        where: { id: { in: selected.map(s => s.id) } }, 
                        include: { anime: { include: { franchise: true } } } 
                    });
                    
                    finalSongs.push(...picked);
                    excludedIds.push(...picked.map(s => s.id));
                    logger.info(`[GameService] Cascade (${difficulties}) [RANDOM]: Trouvé ${candidates.length}, Ajouté ${picked.length} sons.`, 'Service');
                }
            } catch (e) {
                logger.error("[GameService] Erreur Fetch Cascade Random", 'Service', e);
            }
        }
    }

    if (finalSongs.length < count) {
        logger.warn(`[GameService] Impossible de remplir totalement la playlist. Demandé: ${count}, Obtenu: ${finalSongs.length}`, 'Service');
    }

    // Application du tri intelligent final sur la liste complète
    return { 
        songs: smartShuffle(finalSongs), 
        fallbackUsed 
    };
};

// ---------------------------------------------------------------------------
// FONCTIONS EXPORTÉES (API PUBLIQUE)
// ---------------------------------------------------------------------------

export const getRandomSongs = async (count: number, filters?: SongFilters) => {
    // Filtre de base : uniquement les sons valides
    const whereClause: any = { downloadStatus: 'COMPLETED' };
    
    // NOTE : On ne met PAS 'difficulty' dans whereClause ici.
    // C'est fetchWithFallback qui va l'appliquer étape par étape pour gérer la cascade.
    
    if (filters?.types?.length) {
        const songTypes: SongType[] = [];
        if (filters.types.includes('opening')) songTypes.push(SongType.OP);
        if (filters.types.includes('ending')) songTypes.push(SongType.ED);
        if (filters.types.includes('ost')) songTypes.push(SongType.INSERT);
        if (songTypes.length > 0) whereClause.songType = { in: songTypes };
    }
    
    // Filtre : Playlists Spéciales
    if (filters?.playlist) {
        if (filters.playlist === 'top-50') {
            whereClause.anime = { popularity: { gte: 80 } };
        } 
        else if (filters.playlist === 'decades' && filters.decade) {
            const s = parseInt(filters.decade); 
            if (!isNaN(s)) {
                whereClause.anime = { seasonYear: { gte: s, lt: s + 10 } };
            }
        }
        else {
            // ✅ NOUVELLE LOGIQUE : Utilise la config centralisée
            const targetPlaylist = GAME_CONFIG.PLAYLISTS.find(p => p.id === filters.playlist);
            if (targetPlaylist && targetPlaylist.dbValues && targetPlaylist.dbValues.length > 0) {
                whereClause.anime = {
                    franchise: {
                        genres: { hasSome: targetPlaylist.dbValues }
                    }
                };
            }
        }
    }
    
    return await fetchWithFallback(count, whereClause, filters?.watchedIds, filters?.difficulty);
};

export const generateChoices = async (correctTarget: string, precisionMode: string, filters?: SongFilters): Promise<string[]> => {
    const whereClause: any = { name: { not: correctTarget } };
    
    // On essaie de garder les choix dans la même décennie pour plus de cohérence/difficulté
    if (filters?.playlist === 'decades' && filters.decade) {
        const s = parseInt(filters.decade);
        if(!isNaN(s)) whereClause.seasonYear = { gte: s, lt: s + 10 };
    }

    // Récupération d'un pool large pour l'aléatoire
    let randomAnimes = await prisma.anime.findMany({
        where: whereClause,
        select: { name: true, franchise: { select: { name: true } } },
        take: 60
    });

    // Fallback si pas assez d'animes dans le filtre (ex: décennie vide)
    if (randomAnimes.length < 3) {
        randomAnimes = await prisma.anime.findMany({
            where: { name: { not: correctTarget } },
            select: { name: true, franchise: { select: { name: true } } },
            take: 20
        });
    }

    const candidates = randomAnimes.map(a => 
        precisionMode === 'franchise' ? (a.franchise?.name || a.name) : a.name
    );

    // Déduplication et nettoyage
    const unique = [...new Set(candidates)]
        .filter(c => c && c.trim().toLowerCase() !== correctTarget.trim().toLowerCase());

    // Sélection de 3 mauvais choix
    const wrongChoices = unique.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    // Sécurité ultime
    while (wrongChoices.length < 3) wrongChoices.push("Autre Anime");

    // Mélange final avec la bonne réponse
    const finalChoices = [...wrongChoices, correctTarget];
    return finalChoices.sort(() => 0.5 - Math.random());
};

export const generateDuo = async (correctItem: string, choicesPromise: Promise<string[]>): Promise<string[]> => {
    const choices = await choicesPromise;
    const wrongChoices = choices.filter(c => c.trim().toLowerCase() !== correctItem.trim().toLowerCase());
    
    let randomWrong = wrongChoices.length > 0 ? wrongChoices[0] : "Unknown Anime";
    return [correctItem, randomWrong].sort(() => 0.5 - Math.random());
};

export const getAllAnimeNames = async () => {
    const animes = await prisma.anime.findMany({
        select: { name: true, altNames: true, franchise: { select: { name: true } } }
    });
    return animes.map(a => ({
        name: a.name,
        franchise: a.franchise?.name || null,
        altNames: a.altNames
    }));
};

// ✅ MISE A JOUR : Gestion des gagnants multiples (tableau d'IDs)
export const saveGameHistory = async (players: any[], playlist: any[], winnerIds: string[] = []) => {
    logger.info(`[GameService] Début sauvegarde stats pour ${players.length} joueurs...`, 'Scoring');
    
    const songIds = playlist.map((s: any) => s.id);
    let successCount = 0;

    for (const player of players) {
        try {
            const user = await prisma.profile.findUnique({ where: { username: player.username } });
            
            if (user) {
                // ✅ Vérifie si l'ID du joueur est dans la liste des gagnants
                const isWinner = winnerIds.includes(String(player.id));
                
                // ✅ CORRECTIF STATS : Utilisation des compteurs précis calculés dans StandardGame
                const roundsPlayed = player.matchTotalCount || playlist.length || 0; 
                const roundsWon = player.matchCorrectCount || 0;

                // 1. Stats Globales Joueur
                await prisma.profile.update({
                    where: { id: user.id },
                    data: {
                        gamesPlayed: { increment: 1 },
                        gamesWon: isWinner ? { increment: 1 } : undefined,
                        // ✅ On utilise les vraies valeurs ici
                        totalGuesses: { increment: roundsPlayed }, 
                        correctGuesses: { increment: roundsWon },
                        maxStreak: Math.max(user.maxStreak || 0, player.streak || 0)
                    }
                });

                // 2. Aggregate song history (Pokedex)
                for (const songId of songIds) {
                    await prisma.songHistory.upsert({
                        where: {
                            profileId_songId: { profileId: user.id, songId },
                        },
                        create: {
                            profileId: user.id,
                            songId,
                            playCount: 1,
                            correctCount: 0,
                            lastPlayedAt: new Date(),
                        },
                        update: {
                            playCount: { increment: 1 },
                            lastPlayedAt: new Date(),
                        },
                    }).catch((err: unknown) => {
                        const message = err instanceof Error ? err.message : String(err);
                        logger.warn(`[GameService] SongHistory upsert failed for ${user.username}: ${message}`, 'Scoring');
                    });
                }
                successCount++;
            }
        } catch (error) {
            logger.error(`[GameService] Erreur critique sauvegarde stats pour ${player.username}`, 'Scoring', error);
        }
    }
    logger.info(`[GameService] Sauvegarde terminée. Succès: ${successCount}/${players.length}`, 'Scoring');
};