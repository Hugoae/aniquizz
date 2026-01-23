import { PrismaClient } from '@prisma/client';
import { TAG_DEFINITIONS } from '../config/tagConfig';

const prisma = new PrismaClient();

// Types pour les filtres
interface SongFilters {
    difficulty?: string[];
    types?: string[];
    playlist?: string | null;
    decade?: string;
    watchedIds?: number[]; 
}

interface AnimeData {
    name: string;
    franchise: string | null;
    altNames: string[];
}

export const getAllAnimeNames = async (): Promise<AnimeData[]> => {
    const animes = await prisma.anime.findMany({
        select: { 
            name: true, 
            altNames: true,
            franchise: { select: { name: true } }
        }
    });

    return animes.map(a => ({
        name: a.name,
        franchise: a.franchise?.name || null,
        altNames: a.altNames
    }));
};

/**
 * Pioche des sons aléatoires.
 */
export const getRandomSongs = async (count: number, filters?: SongFilters) => {
    const whereClause: any = {};

    // 1. Filtre Difficulté
    if (filters?.difficulty && filters.difficulty.length > 0) {
        whereClause.difficulty = { in: filters.difficulty };
    }

    // 2. Filtre Type (OP/ED/IN)
    if (filters?.types && filters.types.length > 0) {
        const typeConditions = [];
        if (filters.types.includes('opening')) typeConditions.push({ type: { startsWith: 'OP' } });
        if (filters.types.includes('ending')) typeConditions.push({ type: { startsWith: 'ED' } });
        if (filters.types.includes('insert')) typeConditions.push({ type: { equals: 'IN' } });
        
        if (typeConditions.length > 0) {
            whereClause.OR = typeConditions;
        }
    }

    // 3. Filtre Playlist Spéciales
    if (filters?.playlist) {
        const playlistKey = filters.playlist;

        if (playlistKey === 'top-50') {
            whereClause.anime = { ...(whereClause.anime || {}), popularity: { gte: 80 } };
        }
        else if (playlistKey === 'decades' && filters.decade) {
            const startYear = parseInt(filters.decade);
            whereClause.anime = {
                ...(whereClause.anime || {}),
                seasonYear: { gte: startYear, lt: startYear + 10 }
            };
        }
        else if (TAG_DEFINITIONS[playlistKey]) {
            const targetTags = TAG_DEFINITIONS[playlistKey].dbValues;
            whereClause.anime = {
                OR: [
                    { tags: { hasSome: targetTags } },
                    { franchise: { genres: { hasSome: targetTags } } }
                ]
            };
        }
    }

    // 4. Mode "Watched"
    if (filters?.watchedIds && filters.watchedIds.length > 0) {
        whereClause.animeId = { in: filters.watchedIds };
    }

    // --- ALGORITHME DE LOTERIE ---
    const allSongIds = await prisma.song.findMany({
        where: whereClause,
        select: { id: true }
    });

    if (allSongIds.length === 0) return [];

    const shuffledIds = allSongIds.sort(() => 0.5 - Math.random());
    const selectedIds = shuffledIds.slice(0, count).map(s => s.id);

    const songs = await prisma.song.findMany({
        where: { id: { in: selectedIds } },
        include: {
            anime: { include: { franchise: true } }
        }
    });

    return songs.sort(() => 0.5 - Math.random());
};

/**
 * GÉNÉRATION INTELLIGENTE DES CHOIX
 * Corrige le problème "One Piece en mode Hard"
 */
export const generateChoices = async (
    correctTarget: string, 
    precisionMode: string, 
    filters?: SongFilters
): Promise<string[]> => {
    
    const whereClause: any = {
        name: { not: correctTarget }
    };

    // 1. COHÉRENCE PLAYLIST (Déjà présent)
    if (filters?.playlist) {
        if (TAG_DEFINITIONS[filters.playlist]) {
             const targetTags = TAG_DEFINITIONS[filters.playlist].dbValues;
             whereClause.OR = [
                { tags: { hasSome: targetTags } },
                { franchise: { genres: { hasSome: targetTags } } }
             ];
        }
        else if (filters.playlist === 'decades' && filters.decade) {
            const startYear = parseInt(filters.decade);
            whereClause.seasonYear = { gte: startYear, lt: startYear + 10 };
        }
    }

    // 2. COHÉRENCE DE DIFFICULTÉ (NOUVEAU !)
    // Si on joue en 'hard', on évite de proposer des animes ultra populaires
    if (filters?.difficulty && filters.difficulty.length > 0) {
        
        // Mode HARD ou INSANE -> On cherche des leurres peu connus
        if (filters.difficulty.includes('hard') || filters.difficulty.includes('insane')) {
            // On exclut les animes trop populaires (> 75 de popularité)
            // Cela évite d'avoir "Naruto" comme proposition face à un anime inconnu
            whereClause.popularity = { lt: 75 }; 
        } 
        
        // Mode EASY -> On cherche des leurres connus
        else if (filters.difficulty.includes('easy') && !filters.difficulty.includes('hard')) {
            // On force les leurres à être un minimum connus (> 30)
            whereClause.popularity = { gte: 30 };
        }
    }

    // TENTATIVE 1 : Recherche stricte (Bonne playlist + Bonne difficulté)
    let randomAnimes = await prisma.anime.findMany({
        where: whereClause,
        select: { name: true, franchise: { select: { name: true } } },
        take: 60
    });

    // TENTATIVE 2 (FALLBACK) : Si pas assez de choix, on relâche la contrainte de popularité
    if (randomAnimes.length < 3) {
        // On garde la cohérence de playlist, mais on enlève le filtre de popularité
        const { popularity, ...relaxedWhere } = whereClause;
        
        const fallbackAnimes = await prisma.anime.findMany({
            where: relaxedWhere, // Plus de filtre popularity ici
            select: { name: true, franchise: { select: { name: true } } },
            take: 20
        });
        randomAnimes.push(...fallbackAnimes);
    }
    
    // TENTATIVE 3 (DÉSESPOIR) : Si vraiment rien (playlist vide ?), on prend n'importe quoi
    if (randomAnimes.length < 3) {
        const anyAnimes = await prisma.anime.findMany({
            where: { name: { not: correctTarget } },
            select: { name: true, franchise: { select: { name: true } } },
            take: 10
        });
        randomAnimes.push(...anyAnimes);
    }

    const candidates = randomAnimes.map(a => 
        precisionMode === 'franchise' ? (a.franchise?.name || a.name) : a.name
    );

    const uniqueCandidates = [...new Set(candidates)].filter(c => c !== correctTarget);
    const wrongChoices = uniqueCandidates.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    return [...wrongChoices, correctTarget].sort(() => 0.5 - Math.random());
};

/**
 * MODE DUO (50/50)
 * On s'assure de ne pas mettre un fallback stupide comme "Naruto" si possible
 */
export const generateDuo = async (
    correctItem: string, 
    choicesPromise: Promise<string[]>
): Promise<string[]> => {
    const choices = await choicesPromise;
    const wrongChoices = choices.filter(c => c !== correctItem);
    
    // On prend un mauvais choix parmi ceux générés intelligemment ci-dessus
    let randomWrong = wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
    
    // Si jamais la liste est vide (bug extrême), on met un truc générique, sinon le choix intelligent
    if (!randomWrong) randomWrong = "Unknown Anime";

    return [correctItem, randomWrong].sort(() => 0.5 - Math.random());
};

export const getAniListIds = async (username: string): Promise<number[]> => {
    return []; 
};