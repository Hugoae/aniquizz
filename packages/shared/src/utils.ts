// packages/shared/src/utils.ts
// Framework-agnostic pure helpers shared by the client and the server.

// --- SONG TYPE HELPERS ---
/** Display / video-key label, e.g. OP + 1 → "OP1". */
export const formatSongTypeLabel = (songType: string, sequence: number): string =>
  `${songType}${sequence}`;

// --- TAG COLORS ---
export const getTagStyle = (tag: string) => {
  const colors = [
    { bg: '#fee2e2', text: '#ef4444', border: '#fca5a5' },
    { bg: '#ffedd5', text: '#f97316', border: '#fdba74' },
    { bg: '#fef9c3', text: '#eab308', border: '#fde047' },
    { bg: '#dcfce7', text: '#22c55e', border: '#86efac' },
    { bg: '#dbeafe', text: '#3b82f6', border: '#93c5fd' },
    { bg: '#f3e8ff', text: '#a855f7', border: '#d8b4fe' },
    { bg: '#fce7f3', text: '#ec4899', border: '#fbcfe8' },
  ];

  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// --- NORMALIZATION ---
export const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

// --- FUZZY MATCHING (Levenshtein) ---
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
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1),
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

// --- ANSWER VALIDATION ---
export const isAnswerCorrect = (userAnswer: string, validAnswers: string[]): boolean => {
  if (!userAnswer) return false;
  const normalizedUser = normalizeString(userAnswer);

  return validAnswers.some((valid) => {
    const normalizedValid = normalizeString(valid);

    if (normalizedUser === normalizedValid) return true;
    if (normalizedValid.length < 4) return false;

    const dist = getLevenshteinDistance(normalizedUser, normalizedValid);
    const maxLength = Math.max(normalizedUser.length, normalizedValid.length);
    const similarity = 1 - dist / maxLength;

    return similarity >= 0.8;
  });
};

export interface FuzzyAnimeCandidate {
  name: string;
  franchise?: string | null;
  altNames?: string[];
}

export const getFuzzySuggestions = (
  list: FuzzyAnimeCandidate[],
  query: string,
  precisionMode: 'franchise' | 'exact' = 'franchise',
  thresholdRatio: number = 0.3,
): string[] => {
  if (!query || query.trim().length < 2) return [];

  const term = normalizeString(query);

  const filteredMatches = list.filter((anime) => {
    const nameNorm = normalizeString(anime.name);
    const franchiseNorm = anime.franchise ? normalizeString(anime.franchise) : '';

    if (nameNorm.includes(term)) return true;
    if (franchiseNorm && franchiseNorm.includes(term)) return true;
    if (anime.altNames?.some((alt) => normalizeString(alt).includes(term))) return true;

    const allowedErrors = Math.ceil(nameNorm.length * thresholdRatio);
    if (Math.abs(nameNorm.length - term.length) > allowedErrors) return false;

    return getLevenshteinDistance(term, nameNorm) <= allowedErrors;
  });

  const candidates = filteredMatches.map((a) =>
    precisionMode === 'franchise' ? a.franchise || a.name : a.name,
  );

  return Array.from(new Set(candidates)).slice(0, 5);
};

export const shuffleArray = <T>(array: T[]): T[] => {
  if (!array || !Array.isArray(array)) return [];
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};
