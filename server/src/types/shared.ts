/**
 * DÉFINITIONS DES TYPES PARTAGÉS
 * Centralise les interfaces pour éviter les dépendances circulaires.
 */

// --- JOUEUR ---
export interface Player {
    id: string | number; // Socket ID (Invité) ou UUID (Connecté)
    username: string;
    avatar: string;
    score: number;
}

// Joueur avec données serveur étendues
export interface ExtendedPlayer extends Player {
    dbId?: string;          // ID Base de données (Auth Supabase)
    
    // État du round actuel
    currentAnswer?: string | null;
    answerMode?: 'typing' | 'carre' | 'duo';
    isCorrect?: boolean | null;
    roundPoints?: number;
    correctCount?: number;
    
    // État global
    isReady?: boolean;
    isInGame?: boolean;
    
    // NOUVEAU : Victoires dans la session actuelle (Reset quand on quitte la room)
    sessionWins?: number; 

    anilistUsername?: string;
    streak?: number;
    heardSongIds?: number[];
}

// --- SALON (ROOM) ---
export interface Room {
    id: string;             // Code unique (ex: AX99B)
    name: string;
    hostId: string | number;
    
    players: ExtendedPlayer[];
    
    status: 'waiting' | 'playing' | 'finished';
    maxPlayers: number;
    
    // Système de votes
    pauseVotes: Set<string>;
    skipVotes: Set<string>;
    
    // État Pause
    isPaused: boolean;
    isPausePending: boolean;
    
    settings: any;           // Config de la partie
    currentGameId?: string;  // ID Session pour logs
    
    lastActivity: number;
    chatHistory: any[];
}