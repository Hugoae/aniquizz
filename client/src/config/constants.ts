/**
 * CONSTANTES GLOBALES DU JEU
 * Modifiez ces valeurs pour ajuster l'équilibrage sans toucher au code logique.
 */
export const GAME_CONSTANTS = {
    // Barème des points par mode de réponse
    POINTS: {
        TYPING: 5,  // Réponse écrite (le plus difficile)
        CARRE: 2,   // QCM 4 choix
        DUO: 1,     // 50/50
        DEFAULT: 0
    },

    // Délais et Timers (en millisecondes)
    TIMERS: {
        INTRO_DELAY: 3000,       // MODIFIÉ : 3 secondes (au lieu de 10s)
        RESUME_COUNTDOWN: 3000,  // Compte à rebours après une pause (3, 2, 1)
        POLL_INTERVAL: 100       // Fréquence de vérification de la boucle de jeu
    },

    // Limites techniques et sécurité
    LIMITS: {
        CHAT_HISTORY: 50,        // Nombre de messages gardés en mémoire par room
        MAX_USERNAME_LENGTH: 20,
        MAX_MESSAGE_LENGTH: 500
    },

    // Algorithme de réponse (Fuzzy Matching)
    FUZZY: {
        THRESHOLD_RATIO: 0.3     // Tolérance d'erreur (30% de la longueur du mot)
                                 // Ex: "Naruto" (6 lettres) -> ~1.8 fautes -> 1 faute acceptée
    }
};

/**
 * COULEURS DES TAGS (UI)
 * Utilisé pour colorer les badges dans SongInfoCard et les playlists.
 */
export const TAG_COLORS: Record<string, string> = {
    // --- GENRES MAJEURS ---
    'action': '#FF4500',    // Orange Red
    'adventure': '#FF4500', 
    'shonen': '#FF4500',
    
    'fantasy': '#9C27B0',   // Purple
    'isekai': '#9C27B0',
    'supernatural': '#9C27B0',
    'magic': '#9C27B0',
    
    'romance': '#E91E63',   // Pink
    'drama': '#E91E63',
    'shojo': '#E91E63',
    
    'scifi': '#00BCD4',     // Cyan
    'mecha': '#00BCD4',
    'space': '#00BCD4',
    
    'dark': '#607D8B',      // Blue Grey
    'horror': '#607D8B',
    'thriller': '#607D8B',
    'psychological': '#607D8B',
    'mystery': '#607D8B',
    
    'slice of life': '#8BC34A', // Light Green
    'chill': '#8BC34A',
    
    'comedy': '#FDD835',    // Yellow
    
    // --- AUTRES ---
    'sports': '#FF9800',    // Orange
    'music': '#3F51B5',     // Indigo
    'ecchi': '#FF69B4',     // Hot Pink
    'mahou shoujo': '#FF69B4'
};

/**
 * Utilitaire pour récupérer le style CSS complet d'un tag
 * (Fond transparent, Bordure colorée, Texte coloré)
 */
export const getTagStyle = (tagName: string) => {
    if (!tagName) return { backgroundColor: '#71717a20', borderColor: '#71717a40', color: '#71717a' };

    const key = tagName.toLowerCase();
    
    // Recherche "intelligente" : Si le tag est "Dark Fantasy", on trouve "dark"
    const matchedKey = Object.keys(TAG_COLORS).find(k => key.includes(k) || k.includes(key));
    
    const color = matchedKey ? TAG_COLORS[matchedKey] : '#A1A1AA'; // Gris par défaut

    return {
        backgroundColor: `${color}20`, // Opacité 20%
        borderColor: `${color}40`,     // Opacité 40%
        color: color                   // Couleur pleine
    };
};