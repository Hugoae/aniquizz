import axios from 'axios';

// Requête GraphQL : On récupère les listes d'animes de l'utilisateur
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

/**
 * Récupère les IDs des animes vus (Completed/Watching) par un utilisateur AniList.
 * @param username Le pseudo AniList (ex: "Kyk")
 * @returns Un tableau d'IDs correspondants aux IDs de ta BDD.
 */
export const getUserAnimeIds = async (username: string): Promise<number[]> => {
    try {
        console.log(`[ANILIST] 🔍 Recherche de la liste pour : ${username}`);
        
        const response = await axios.post('https://graphql.anilist.co', {
            query: USER_LIST_QUERY,
            variables: { username }
        });

        const lists = response.data.data.MediaListCollection.lists;
        
        if (!lists || lists.length === 0) {
            console.log(`[ANILIST] ⚠️ Aucune liste trouvée (ou profil privé) pour ${username}`);
            return [];
        }

        const validIds = new Set<number>();

        // On parcourt les listes pour extraire les IDs
        lists.forEach((list: any) => {
            // On accepte les listes "Completed", "Watching" (En cours), "Repeating" (Re-watch)
            // Ainsi que les noms français courants si l'user a personnalisé
            const acceptedLists = ['Completed', 'Watching', 'Repeating', 'Terminé', 'En cours'];
            
            if (acceptedLists.includes(list.name) || acceptedLists.some(l => list.name.toLowerCase().includes(l.toLowerCase()))) {
                list.entries.forEach((entry: any) => {
                    validIds.add(entry.mediaId);
                });
            }
        });

        const finalIds = Array.from(validIds);
        console.log(`[ANILIST] ✅ ${username} : ${finalIds.length} animes récupérés.`);
        
        return finalIds;

    } catch (error: any) {
        if (error.response?.status === 404) {
            console.warn(`[ANILIST] ❌ Utilisateur introuvable : ${username}`);
        } else {
            console.error(`[ANILIST] ❌ Erreur API :`, error.message);
        }
        return [];
    }
};