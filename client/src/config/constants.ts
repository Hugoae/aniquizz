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