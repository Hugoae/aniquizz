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

export const getUserAnimeIds = async (username: string): Promise<number[]> => {
    if (!username) return [];
    
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

            // Vérification souple du nom de la liste
            if (acceptedKeywords.some(keyword => listName.includes(keyword))) {
                logger.debug(`   - Liste incluse : "${list.name}" (${entryCount} animes)`, 'AniList');
                list.entries.forEach((entry: any) => {
                    if (entry.mediaId) validIds.add(entry.mediaId);
                });
            } else {
                // logger.debug(`   - Liste ignorée : "${list.name}"`, 'AniList');
            }
        });

        const finalIds = Array.from(validIds);
        logger.info(`✅ ${username} : ${finalIds.length} animes uniques récupérés.`, 'AniList');
        
        return finalIds;

    } catch (error: any) {
        if (error.response?.status === 404) {
            logger.warn(`❌ Utilisateur ${username} introuvable sur AniList.`, 'AniList');
            return [];
        }
        logger.error(`Erreur API AniList pour ${username}`, 'AniList', error.message);
        return [];
    }
};