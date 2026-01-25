export const GAME_RULES = {
    // Points Max par Round selon le mode de jeu
    POINTS: {
        TYPING: 5,
        MIX: 5,
        QCM: 2,
        // DUO n'existe pas en mode de jeu principal
    },

    SOLO: {
        THRESHOLDS: {
            'easy': 0.70,   // 70% requis
            'medium': 0.60, // 60% requis
            'hard': 0.50,   // 50% requis
        } as Record<string, number>,
        
        // Seuil spécial pour le mode "Anime Exact" (plus dur)
        EXACT_PRECISION_THRESHOLD: 0.50, // 50% pour tout le monde
        
        DEFAULT_THRESHOLD: 0.60
    },

    MULTIPLAYER: {
        SMALL_LOBBY_LIMIT: 4, // 4 joueurs ou moins
        WINNERS_SMALL: 1,     // Top 1 gagne
        WINNERS_LARGE: 3      // Top 3 gagnent (si > 4 joueurs)
    },

    // Seuils pour les grades (Basé sur le % du score MAX POSSIBLE)
    RANKS: [
        { label: 'S+', threshold: 1.00, color: 'text-yellow-400 drop-shadow-glow' }, // Perfect
        { label: 'S', threshold: 0.90, color: 'text-yellow-500' },
        { label: 'A', threshold: 0.80, color: 'text-green-400' },
        { label: 'B', threshold: 0.60, color: 'text-blue-400' },
        { label: 'C', threshold: 0.40, color: 'text-orange-500' },
        { label: 'D', threshold: 0.00, color: 'text-red-500' }
    ]
};