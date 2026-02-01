import { prisma } from '@aniquizz/database'; 
import { getUserAnimeIds } from '../anilist/anilistService'; 
import { logger } from '../../utils/logger'; 
import { TAG_DEFINITIONS } from '../../config/tagConfig'; 

export interface SongFilters {
    difficulty?: string[];
    types?: string[];
    playlist?: string | null;
    decade?: string;
    watchedIds?: number[]; 
}

const fetchWithFallback = async (count: number, whereClause: any, watchedIds?: number[]) => {
    let finalSongs: any[] = [];
    let excludedIds: number[] = [];
    let fallbackUsed = false;
    
    const isWatchedMode = Array.isArray(watchedIds);

    // =========================================================
    // ÉTAPE 1 : Watched List (Stricte - Respecte la difficulté)
    // =========================================================
    if (isWatchedMode && watchedIds && watchedIds.length > 0) {
        const strictWatchedWhere = { 
            ...whereClause, 
            animeId: { in: watchedIds } 
        };
        
        try {
            const potentialIds = await prisma.song.findMany({ where: strictWatchedWhere, select: { id: true } });
            
            if (potentialIds.length > 0) {
                const shuffled = potentialIds.sort(() => 0.5 - Math.random()).slice(0, count);
                const picked = await prisma.song.findMany({ 
                    where: { id: { in: shuffled.map(s => s.id) } }, 
                    include: { anime: { include: { franchise: true } } } 
                });
                finalSongs = [...picked];
                excludedIds = picked.map(s => s.id);
                logger.info(`[Step 1] ${picked.length} sons trouvés dans la Watched List (Stricte).`, 'GameService');
            } else {
                logger.warn(`[Step 1] 0 sons trouvés avec les filtres stricts (Difficulé/Type) dans la Watched List.`, 'GameService');
            }
        } catch (e) {
            logger.error("Erreur Step 1 Fetch", "GameService", e);
        }
    }

    // =========================================================
    // ÉTAPE 2 : Watched List (Souple - IGNORE la difficulté)
    // On préfère jouer un son "Hard" de la liste du joueur qu'un son "Easy" inconnu.
    // =========================================================
    if (finalSongs.length < count && isWatchedMode && watchedIds && watchedIds.length > 0) {
        const remaining = count - finalSongs.length;
        
        // On copie la clause mais ON RETIRE LA DIFFICULTÉ
        const { difficulty, ...looseWhereClause } = whereClause; 
        
        const looseWatchedWhere = {
            ...looseWhereClause,
            animeId: { in: watchedIds },
            id: { notIn: excludedIds } // Pas de doublons
        };

        try {
            const potentialIds = await prisma.song.findMany({ where: looseWatchedWhere, select: { id: true } });
            
            if (potentialIds.length > 0) {
                const shuffled = potentialIds.sort(() => 0.5 - Math.random()).slice(0, remaining);
                const picked = await prisma.song.findMany({ 
                    where: { id: { in: shuffled.map(s => s.id) } }, 
                    include: { anime: { include: { franchise: true } } } 
                });
                finalSongs = [...finalSongs, ...picked];
                excludedIds = [...excludedIds, ...picked.map(s => s.id)];
                logger.info(`[Step 2] ${picked.length} sons récupérés en mode "Souple" (Difficulté ignorée) dans la Watched List.`, 'GameService');
            }
        } catch (e) {
            logger.error("Erreur Step 2 Fetch", "GameService", e);
        }
    }

    // =========================================================
    // ÉTAPE 3 : Fallback (Aléatoire Global)
    // =========================================================
    if (finalSongs.length < count) {
        if (isWatchedMode) fallbackUsed = true; // On signale au joueur

        const remaining = count - finalSongs.length;
        const fallbackWhere = { ...whereClause }; // On remet les filtres stricts (Difficulté) pour l'aléatoire
        
        if (excludedIds.length > 0) fallbackWhere.id = { notIn: excludedIds };
        
        try {
            const potentialIds = await prisma.song.findMany({ where: fallbackWhere, select: { id: true } });
            
            if (potentialIds.length > 0) {
                const shuffled = potentialIds.sort(() => 0.5 - Math.random()).slice(0, remaining);
                const picked = await prisma.song.findMany({ 
                    where: { id: { in: shuffled.map(s => s.id) } }, 
                    include: { anime: { include: { franchise: true } } } 
                });
                finalSongs = [...finalSongs, ...picked];
                logger.info(`[Step 3] ${picked.length} sons complétés via Aléatoire.`, 'GameService');
            }
        } catch (e) {
            logger.error("Erreur Fallback Fetch", "GameService", e);
        }
    }

    return { 
        songs: finalSongs.sort(() => 0.5 - Math.random()), 
        fallbackUsed 
    };
};

export const getRandomSongs = async (count: number, filters?: SongFilters) => {
    // ⚠️ On ne prend QUE les sons téléchargés et valides
    const whereClause: any = { downloadStatus: 'COMPLETED' };
    
    // Difficulté
    if (filters?.difficulty?.length) {
        whereClause.difficulty = { in: filters.difficulty };
    }
    
    // Type (OP/ED)
    if (filters?.types?.length) {
        const conds = [];
        if (filters.types.includes('opening')) conds.push({ type: { startsWith: 'OP' } });
        if (filters.types.includes('ending')) conds.push({ type: { startsWith: 'ED' } });
        if (conds.length > 0) whereClause.OR = conds;
    }
    
    // Playlists
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
        else if (TAG_DEFINITIONS[filters.playlist]) {
            const targetTags = TAG_DEFINITIONS[filters.playlist].dbValues;
            if (targetTags && targetTags.length > 0) {
                whereClause.anime = {
                    franchise: {
                        genres: { hasSome: targetTags }
                    }
                };
            }
        }
    }
    
    return await fetchWithFallback(count, whereClause, filters?.watchedIds);
};

export const generateChoices = async (correctTarget: string, precisionMode: string, filters?: SongFilters): Promise<string[]> => {
    const whereClause: any = { name: { not: correctTarget } };
    
    if (filters?.playlist === 'decades' && filters.decade) {
        const s = parseInt(filters.decade);
        if(!isNaN(s)) whereClause.seasonYear = { gte: s, lt: s + 10 };
    }

    let randomAnimes = await prisma.anime.findMany({
        where: whereClause,
        select: { name: true, franchise: { select: { name: true } } },
        take: 60
    });

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

    const unique = [...new Set(candidates)]
        .filter(c => c && c.trim().toLowerCase() !== correctTarget.trim().toLowerCase());

    const wrongChoices = unique.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    while (wrongChoices.length < 3) wrongChoices.push("Autre Anime");

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

/**
 * ✅ NOUVELLE FONCTION : Enregistre l'historique de fin de partie
 * Appelée par GameCore quand une partie se termine.
 */
export const saveGameHistory = async (players: any[], playlist: any[], winnerId?: string) => {
    logger.info(`[GameService] Sauvegarde des stats pour ${players.length} joueurs...`, 'GameService');
    
    const songIds = playlist.map((s: any) => s.id);

    for (const player of players) {
        try {
            const user = await prisma.profile.findUnique({ where: { username: player.username } });
            
            if (user) {
                const isWinner = winnerId && String(player.id) === String(winnerId);
                
                // 1. Update Stats Globales
                await prisma.profile.update({
                    where: { id: user.id },
                    data: {
                        gamesPlayed: { increment: 1 },
                        gamesWon: isWinner ? { increment: 1 } : undefined,
                        totalGuesses: { increment: 10 }, 
                        maxStreak: Math.max(user.maxStreak || 0, player.streak || 0)
                    }
                });

                // 2. Update Pokedex (SongHistory)
                if (songIds.length > 0) {
                    // On map avec les noms de ton schema (listenedAt au lieu de discoveredAt)
                    const entries = songIds.map((songId: number) => ({
                        profileId: user.id,
                        songId: songId,
                        listenedAt: new Date() // <--- C'est le nom dans ton schema
                    }));

                    // On utilise ta table existante 'songHistory'
                    await prisma.songHistory.createMany({
                        data: entries,
                        skipDuplicates: true
                    }).catch((err: any) => {
                        logger.warn(`Erreur lors de la sauvegarde de l'historique pour ${user.username}`, err);
                    });
                }
            }
        } catch (error) {
            logger.error(`Erreur sauvegarde stats pour ${player.username}`, 'GameService', error);
        }
    }
};