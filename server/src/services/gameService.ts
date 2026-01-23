import { PrismaClient } from '@prisma/client';

// Instance unique de Prisma pour le service
const prisma = new PrismaClient();

// ------------------------------------------------------------------
// CONFIGURATION DES PLAYLISTS
// ------------------------------------------------------------------
// Mappe les IDs de playlist (ex: 'shonen') vers les Tags en BDD
const PLAYLIST_TAGS: Record<string, string[]> = {
    'shonen': ['Shonen'],
    'isekai': ['Isekai'],
    'romance': ['Romance'],
    'top-50': [], // Géré spécifiquement par la popularité
    'decades': [] // Géré spécifiquement par l'année
};

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

/**
 * Récupère la liste complète des animes pour l'autocomplete côté client.
 * Optimisé pour ne renvoyer que les noms.
 */
export const getAllAnimeNames = async (): Promise<AnimeData[]> => {
    const animes = await prisma.anime.findMany({
        select: { 
            name: true, 
            altNames: true,
            franchise: {
                select: { name: true }
            }
        }
    });

    return animes.map(a => ({
        name: a.name,
        franchise: a.franchise?.name || null,
        altNames: a.altNames
    }));
};

/**
 * Pioche des sons aléatoires en base de données selon les critères.
 * Utilise une stratégie "Fetch IDs -> Shuffle -> Fetch Details" pour
 * garantir une équité parfaite (chaque son a la même chance de sortir).
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
        // Par Tags
        if (PLAYLIST_TAGS[filters.playlist] && PLAYLIST_TAGS[filters.playlist].length > 0) {
            const tags = PLAYLIST_TAGS[filters.playlist];
            whereClause.anime = {
                tags: { hasSome: tags }
            };
        }

        // Par Popularité
        if (filters.playlist === 'top-50') {
            whereClause.anime = {
                ...whereClause.anime,
                popularity: { gte: 80 } // Seuil arbitraire de popularité
            };
        }

        // Par Décennie
        if (filters.playlist === 'decades' && filters.decade) {
            const startYear = parseInt(filters.decade);
            const endYear = startYear + 10;
            
            whereClause.anime = {
                ...whereClause.anime,
                seasonYear: {
                    gte: startYear,
                    lt: endYear
                }
            };
        }
    }

    // 4. Mode "Watched" (Liste perso)
    if (filters?.watchedIds && filters.watchedIds.length > 0) {
        whereClause.animeId = { in: filters.watchedIds };
    }

    // --- ALGORITHME DE LOTERIE ---
    
    // Étape A : Récupérer TOUS les IDs correspondants (très léger)
    const allSongIds = await prisma.song.findMany({
        where: whereClause,
        select: { id: true }
    });

    if (allSongIds.length === 0) return [];

    // Étape B : Mélanger les IDs
    const shuffledIds = allSongIds.sort(() => 0.5 - Math.random());

    // Étape C : Garder uniquement le nombre nécessaire
    const selectedIdsObj = shuffledIds.slice(0, count);
    const selectedIds = selectedIdsObj.map(s => s.id);

    // Étape D : Récupérer les détails complets pour les gagnants
    const songs = await prisma.song.findMany({
        where: { id: { in: selectedIds } },
        include: {
            anime: {
                include: {
                    franchise: true
                }
            }
        }
    });

    // Étape E : Re-mélanger le résultat final (pour éviter l'ordre croissant des IDs)
    return songs.sort(() => 0.5 - Math.random());
};

/**
 * Génère 3 mauvaises réponses pour le mode QCM.
 * Essaie de prendre des animes du même thème si possible.
 */
export const generateChoices = async (
    correctTarget: string, 
    precisionMode: string, 
    filters?: SongFilters
): Promise<string[]> => {
    
    const whereClause: any = {
        name: { not: correctTarget }
    };

    // On essaie de garder la cohérence de playlist pour les pièges
    if (filters?.playlist) {
        if (PLAYLIST_TAGS[filters.playlist] && PLAYLIST_TAGS[filters.playlist].length > 0) {
            whereClause.tags = { hasSome: PLAYLIST_TAGS[filters.playlist] };
        }
        if (filters.playlist === 'decades' && filters.decade) {
            const startYear = parseInt(filters.decade);
            whereClause.seasonYear = { gte: startYear, lt: startYear + 10 };
        }
    }

    // On prend plus de candidats que nécessaire pour avoir de la variété
    const randomAnimes = await prisma.anime.findMany({
        where: whereClause,
        select: { name: true, franchise: { select: { name: true } } },
        take: 60
    });

    // Fallback si pas assez d'animes trouvés
    if (randomAnimes.length < 3) {
        const fallbackAnimes = await prisma.anime.findMany({
            where: { name: { not: correctTarget } },
            select: { name: true, franchise: { select: { name: true } } },
            take: 20
        });
        randomAnimes.push(...fallbackAnimes);
    }

    // Formatage selon le mode de précision (Exact vs Franchise)
    const candidates = randomAnimes.map(a => 
        precisionMode === 'franchise' ? (a.franchise?.name || a.name) : a.name
    );

    // Dédoublonnage et sélection aléatoire
    const uniqueCandidates = [...new Set(candidates)].filter(c => c !== correctTarget);
    const wrongChoices = uniqueCandidates.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    // On ajoute la bonne réponse et on mélange le tout
    const finalChoices = [...wrongChoices, correctTarget];
    return finalChoices.sort(() => 0.5 - Math.random());
};

/**
 * Génère le mode DUO (50/50).
 */
export const generateDuo = async (
    correctItem: string, 
    choicesPromise: Promise<string[]>
): Promise<string[]> => {
    const choices = await choicesPromise;
    const wrongChoices = choices.filter(c => c !== correctItem);
    // Fallback safe si jamais
    const randomWrong = wrongChoices[Math.floor(Math.random() * wrongChoices.length)] || "Naruto";
    return [correctItem, randomWrong].sort(() => 0.5 - Math.random());
};

// @TODO: Implémenter l'intégration Anilist pour récupérer la liste de l'utilisateur
export const getAniListIds = async (username: string): Promise<number[]> => {
    return []; 
};