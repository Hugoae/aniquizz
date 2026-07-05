// packages/shared/src/utils.ts
// Framework-agnostic pure helpers shared by the client and the server.

// --- RANKS (score grade) ---
export const getRank = (score: number, maxPossibleScore: number) => {
  if (maxPossibleScore === 0) return { label: '?', color: 'text-gray-500 border-gray-500' };

  const percentage = (score / maxPossibleScore) * 100;

  if (percentage >= 100)
    return { label: 'S+', color: 'text-yellow-400 border-yellow-400 bg-yellow-400/10' };
  if (percentage >= 90)
    return { label: 'S', color: 'text-yellow-500 border-yellow-500 bg-yellow-500/10' };
  if (percentage >= 80)
    return { label: 'A', color: 'text-emerald-400 border-emerald-400 bg-emerald-400/10' };
  if (percentage >= 60)
    return { label: 'B', color: 'text-blue-400 border-blue-400 bg-blue-400/10' };
  if (percentage >= 40)
    return { label: 'C', color: 'text-orange-400 border-orange-400 bg-orange-400/10' };

  return { label: 'D', color: 'text-red-500 border-red-500 bg-red-500/10' };
};

// --- TAG COLORS ---
// Deterministic color for a tag, derived from a hash of its label.
export const getTagStyle = (tag: string) => {
  const colors = [
    { bg: '#fee2e2', text: '#ef4444', border: '#fca5a5' }, // red
    { bg: '#ffedd5', text: '#f97316', border: '#fdba74' }, // orange
    { bg: '#fef9c3', text: '#eab308', border: '#fde047' }, // yellow
    { bg: '#dcfce7', text: '#22c55e', border: '#86efac' }, // green
    { bg: '#dbeafe', text: '#3b82f6', border: '#93c5fd' }, // blue
    { bg: '#f3e8ff', text: '#a855f7', border: '#d8b4fe' }, // purple
    { bg: '#fce7f3', text: '#ec4899', border: '#fbcfe8' }, // pink
  ];

  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// --- NORMALIZATION ---
// Lowercase, strip accents, keep alphanumerics only.
export const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '') // keep digits and letters only
    .trim();
};

// --- FUZZY MATCHING (Levenshtein) ---
// Edit distance: number of single-character edits to turn `a` into `b`.
export const getLevenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          ),
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

// --- ANSWER VALIDATION ---
// Used by the server (StandardGame) and optionally by the client to pre-validate.
export const isAnswerCorrect = (userAnswer: string, validAnswers: string[]): boolean => {
  if (!userAnswer) return false;
  const normalizedUser = normalizeString(userAnswer);

  return validAnswers.some((valid) => {
    const normalizedValid = normalizeString(valid);

    // 1. Exact match
    if (normalizedUser === normalizedValid) return true;

    // 2. No tolerance for very short words (< 4 letters)
    if (normalizedValid.length < 4) return false;

    // 3. Levenshtein distance (~20% tolerance)
    const dist = getLevenshteinDistance(normalizedUser, normalizedValid);
    const maxLength = Math.max(normalizedUser.length, normalizedValid.length);
    const similarity = 1 - dist / maxLength;

    return similarity >= 0.8; // require 80% similarity
  });
};

/**
 * Returns the best suggestions using fuzzy search.
 * @param list List of anime objects (must contain name, franchise, altNames)
 * @param query The user input
 * @param precisionMode 'franchise' or 'exact'
 * @param thresholdRatio Error tolerance (e.g. 0.3 = 30%)
 */
export const getFuzzySuggestions = (
  list: any[],
  query: string,
  precisionMode: 'franchise' | 'exact' = 'franchise',
  thresholdRatio: number = 0.3,
): string[] => {
  if (!query || query.trim().length < 2) return [];

  const term = normalizeString(query);

  const filteredMatches = list.filter((anime) => {
    const nameNorm = normalizeString(anime.name);
    const franchiseNorm = anime.franchise ? normalizeString(anime.franchise) : '';

    // 1. Exact / partial check (top priority, on normalized strings)
    if (nameNorm.includes(term)) return true;
    if (franchiseNorm && franchiseNorm.includes(term)) return true;
    if (anime.altNames && anime.altNames.some((alt: string) => normalizeString(alt).includes(term)))
      return true;

    // 2. Fuzzy check (when no exact match).
    // Math.ceil makes it more permissive (e.g. 1.8 -> 2 allowed errors).
    const allowedErrors = Math.ceil(nameNorm.length * thresholdRatio);

    // Optimization: skip when the length difference is too large.
    if (Math.abs(nameNorm.length - term.length) > allowedErrors) return false;

    const dist = getLevenshteinDistance(term, nameNorm);
    return dist <= allowedErrors;
  });

  // Deduplicate and format results.
  const candidates = filteredMatches.map((a) =>
    precisionMode === 'franchise' ? a.franchise || a.name : a.name,
  );

  // Return the first 5 unique candidates.
  return Array.from(new Set(candidates)).slice(0, 5);
};

/**
 * Shuffles an array randomly (Fisher-Yates).
 * Does not mutate the original array; returns a copy.
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  if (!array || !Array.isArray(array)) return [];
  const newArray = [...array]; // copy for immutability
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};
