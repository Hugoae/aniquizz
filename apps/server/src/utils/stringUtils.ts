import { distance } from 'fastest-levenshtein';

export const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlève accents
    .replace(/[^a-z0-9]/g, "") // Garde que chiffres et lettres
    .trim();
};

export const isAnswerCorrect = (userAnswer: string, validAnswers: string[]): boolean => {
  if (!userAnswer) return false;
  const normalizedUser = normalizeString(userAnswer);
  
  return validAnswers.some(valid => {
    const normalizedValid = normalizeString(valid);
    
    // 1. Exact
    if (normalizedUser === normalizedValid) return true;
    
    // 2. Pas de tolérance pour les mots très courts (< 4 lettres)
    if (normalizedValid.length < 4) return false;

    // 3. Distance de Levenshtein (Tolérance ~20%)
    const dist = distance(normalizedUser, normalizedValid);
    const maxLength = Math.max(normalizedUser.length, normalizedValid.length);
    const similarity = 1 - (dist / maxLength);

    return similarity >= 0.8; // 80% de ressemblance requise
  });
};