// packages/shared/src/utils.ts

// --- CLASSEMENT / RANGS ---
export const getRank = (score: number, maxPossibleScore: number) => {
  if (maxPossibleScore === 0) return { label: '?', color: 'text-gray-500 border-gray-500' };

  const percentage = (score / maxPossibleScore) * 100;

  if (percentage >= 100) return { label: 'S+', color: 'text-yellow-400 border-yellow-400 bg-yellow-400/10' };
  if (percentage >= 90) return { label: 'S', color: 'text-yellow-500 border-yellow-500 bg-yellow-500/10' };
  if (percentage >= 80) return { label: 'A', color: 'text-emerald-400 border-emerald-400 bg-emerald-400/10' };
  if (percentage >= 60) return { label: 'B', color: 'text-blue-400 border-blue-400 bg-blue-400/10' };
  if (percentage >= 40) return { label: 'C', color: 'text-orange-400 border-orange-400 bg-orange-400/10' };
  
  return { label: 'D', color: 'text-red-500 border-red-500 bg-red-500/10' };
};

// --- COULEURS DES TAGS ---
export const getTagStyle = (tag: string) => {
  const colors = [
    { bg: '#fee2e2', text: '#ef4444', border: '#fca5a5' }, // Rouge
    { bg: '#ffedd5', text: '#f97316', border: '#fdba74' }, // Orange
    { bg: '#fef9c3', text: '#eab308', border: '#fde047' }, // Jaune
    { bg: '#dcfce7', text: '#22c55e', border: '#86efac' }, // Vert
    { bg: '#dbeafe', text: '#3b82f6', border: '#93c5fd' }, // Bleu
    { bg: '#f3e8ff', text: '#a855f7', border: '#d8b4fe' }, // Violet
    { bg: '#fce7f3', text: '#ec4899', border: '#fbcfe8' }, // Rose
  ];
  
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// --- LOGIQUE FUZZY MATCHING (Levenshtein) ---

// Calcul de la distance (Nombre de modifs pour passer de A à B)
export const getLevenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1,   // insertion
            matrix[i - 1][j] + 1    // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Retourne les meilleures suggestions basées sur une recherche floue.
 * @param list Liste des objets animes (doit contenir name, franchise, altNames)
 * @param query La saisie utilisateur
 * @param precisionMode 'franchise' ou 'exact'
 * @param thresholdRatio Tolérance d'erreur (ex: 0.3 = 30%)
 */
export const getFuzzySuggestions = (list: any[], query: string, precisionMode: 'franchise' | 'exact' = 'franchise', thresholdRatio: number = 0.3): string[] => {
    if (!query || query.trim().length < 2) return [];
    
    const term = query.toLowerCase().trim();

    const filteredMatches = list.filter(anime => {
        const nameLower = anime.name.toLowerCase();
        
        // 1. Vérification exacte / partielle (Priorité absolue)
        if (nameLower.includes(term)) return true;
        if (anime.franchise && anime.franchise.toLowerCase().includes(term)) return true;
        if (anime.altNames && anime.altNames.some((alt: string) => alt.toLowerCase().includes(term))) return true;

        // 2. Vérification Fuzzy (Si pas de match exact)
        const allowedErrors = Math.floor(nameLower.length * thresholdRatio);
        
        // Optimisation : Si différence de longueur trop grande, on ignore
        if (Math.abs(nameLower.length - term.length) > allowedErrors) return false;

        const dist = getLevenshteinDistance(term, nameLower);
        return dist <= allowedErrors;
    });

    // Déduplication et formatage des résultats
    const candidates = filteredMatches.map(a => 
        precisionMode === 'franchise' ? (a.franchise || a.name) : a.name
    );

    // Retourne les 5 premiers uniques
    return Array.from(new Set(candidates)).slice(0, 5);
};