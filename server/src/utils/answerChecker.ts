import { GAME_CONSTANTS } from '../config/constants';

// Algorithme de Levenshtein (Distance d'édition entre deux chaînes)
const getLevenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // Initialisation de la première ligne et colonne
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    // Calcul de la distance
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // Substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // Insertion
                        matrix[i - 1][j] + 1  // Suppression
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

export const isAnswerCorrect = (playerInput: string | null | undefined, correctAnswer: string): boolean => {
    if (!playerInput) return false;

    // 1. Nettoyage basique (minuscules, espaces)
    const input = playerInput.trim().toLowerCase();
    const target = correctAnswer.trim().toLowerCase();

    // 2. Correspondance Exacte
    if (input === target) return true;

    // 3. Correspondance Partielle (Si le joueur tape "Shippuden" pour "Naruto Shippuden")
    // On exige que le mot tapé fasse au moins 4 caractères pour éviter les faux positifs courts
    if (input.length >= 4 && target.includes(input)) {
        return true;
    }

    // 4. Fuzzy Matching (Tolérance aux fautes de frappe)
    const distance = getLevenshteinDistance(input, target);
    
    // On calcule le nombre d'erreurs autorisées (Ex: 20% de la longueur du mot cible)
    const maxErrors = Math.floor(target.length * GAME_CONSTANTS.FUZZY.THRESHOLD_RATIO);
    
    // Pour les mots très courts (< 4 lettres), on n'autorise pas d'erreur pour éviter les confusions
    if (target.length < 4) return distance === 0;

    return distance <= maxErrors;
};