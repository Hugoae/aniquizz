import axios from 'axios';
import { logger } from '../../utils/logger'; 

const USER_LIST_QUERY = `
query ($username: String) {
  MediaListCollection(userName: $username, type: ANIME) {
    lists {
      name
      entries {
        mediaId
        status
      }
    }
  }
}
`;

// --- CONFIGURATION CACHE ---
const CACHE_DURATION = 10 * 60 * 1000; // 10 Minutes de mémoire tampon

interface CacheEntry {
    timestamp: number;
    promise: Promise<number[]>;
}

// On stocke les Promesses et non juste les données pour gérer les appels simultanés (Race Conditions)
const userCache = new Map<string, CacheEntry>();

export const getUserAnimeIds = async (username: string): Promise<number[]> => {
    if (!username) return [];
    
    // 1. Nettoyage paresseux (si le cache est vieux, on l'ignore)
    const now = Date.now();
    const cached = userCache.get(username);

    if (cached && (now - cached.timestamp < CACHE_DURATION)) {
        logger.debug(`⚡ [AniList] Cache HIT pour ${username} (Récupération instantanée)`, 'AniList');
        return cached.promise;
    }

    // 2. Création de la requête (encapsulée dans une IIFE async pour capturer la promesse)
    const fetchPromise = (async () => {
        try {
            logger.info(`🔍 Recherche AniList pour : ${username}`, 'AniList');
            
            const response = await axios.post('https://graphql.anilist.co', {
                query: USER_LIST_QUERY,
                variables: { username }
            });

            const lists = response.data.data.MediaListCollection.lists;
            
            if (!lists || lists.length === 0) {
                logger.warn(`⚠️ Aucune liste trouvée pour ${username}`, 'AniList');
                return [];
            }

            const validIds = new Set<number>();
            
            // Mots clés acceptés (Français / Anglais / États système)
            const acceptedKeywords = [
                'completed', 'watching', 'current', 
                'terminé', 'en cours', 'repeating', 'rewatching'
            ];

            lists.forEach((list: any) => {
                const listName = list.name.toLowerCase();
                const entryCount = list.entries?.length || 0;

                if (acceptedKeywords.some(keyword => listName.includes(keyword))) {
                    logger.debug(`   - Liste incluse : "${list.name}" (${entryCount} animes)`, 'AniList');
                    list.entries.forEach((entry: any) => {
                        if (entry.mediaId) validIds.add(entry.mediaId);
                    });
                }
            });

            const finalIds = Array.from(validIds);
            logger.info(`✅ ${username} : ${finalIds.length} animes uniques récupérés.`, 'AniList');
            
            return finalIds;

        } catch (error: any) {
            // EN CAS D'ERREUR : On supprime l'entrée du cache pour permettre de réessayer immédiatement
            userCache.delete(username);

            if (error.response?.status === 404) {
                logger.warn(`❌ Utilisateur ${username} introuvable sur AniList.`, 'AniList');
                return [];
            }
            logger.error(`Erreur API AniList pour ${username}`, 'AniList', error.message);
            return [];
        }
    })();

    // 3. Stockage immédiat de la promesse dans le cache
    userCache.set(username, {
        timestamp: now,
        promise: fetchPromise
    });

    return fetchPromise;
};
