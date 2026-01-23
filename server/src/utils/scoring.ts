import { GAME_CONSTANTS } from '../config/constants';

// On définit l'interface pour accepter l'objet envoyé par index.ts
interface ScoreParams {
    mode: string;
    isCorrect: boolean;
    streak?: number;
}

export const calculateScore = ({ mode, isCorrect, streak }: ScoreParams): number => {
    // 1. Si la réponse est fausse, c'est 0 point direct
    if (!isCorrect) return 0;

    // 2. Sinon, on calcule les points selon le mode de jeu
    let points = 0;
    
    switch (mode) {
        case 'carre': 
            points = GAME_CONSTANTS.POINTS.CARRE; 
            break;
        case 'duo': 
            points = GAME_CONSTANTS.POINTS.DUO; 
            break;
        case 'typing': 
            points = GAME_CONSTANTS.POINTS.TYPING; 
            break;
        default: 
            points = GAME_CONSTANTS.POINTS.TYPING; 
            break;
    }

    // (Bonus optionnel) Tu pourras ajouter des bonus de streak ici plus tard
    // if (streak && streak > 2) points += 1;

    return points;
};