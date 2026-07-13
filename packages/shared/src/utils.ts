// packages/shared/src/utils.ts
// Framework-agnostic pure helpers shared by the client and the server.

import { GAME_CONFIG } from './constants';

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

/** Split a display string into normalized word tokens (spaces / punctuation). */
export const tokenizeWords = (str: string): string[] =>
  str
    .split(/[^a-zA-Z0-9\u00C0-\u024F]+/)
    .map(normalizeString)
    .filter((t) => t.length > 0);

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
  const { ANSWER_SIMILARITY, MIN_LENGTH_FOR_FUZZY } = GAME_CONFIG.FUZZY;

  return validAnswers.some((valid) => {
    const normalizedValid = normalizeString(valid);

    if (normalizedUser === normalizedValid) return true;
    if (normalizedValid.length < MIN_LENGTH_FOR_FUZZY) return false;

    const dist = getLevenshteinDistance(normalizedUser, normalizedValid);
    const maxLength = Math.max(normalizedUser.length, normalizedValid.length);
    const similarity = 1 - dist / maxLength;

    return similarity >= ANSWER_SIMILARITY;
  });
};

export interface FuzzyAnimeCandidate {
  name: string;
  franchise?: string | null;
  altNames?: string[];
}

export interface AnimeSuggestion {
  label: string;
  score: number;
  /** Character range in `label` to highlight (accent/case-insensitive match). */
  highlight: { start: number; end: number } | null;
}

const SCORE_PREFIX = 100;
const SCORE_PHRASE = 92;
const SCORE_WORD_PREFIX = 85;
const SCORE_ACRONYM = 88;
const SCORE_CONTAINS = 80;

/** Map a normalized-prefix length back to a slice end index in the original string. */
function normPrefixEndIndex(raw: string, normPrefixLen: number): number {
  for (let i = 1; i <= raw.length; i++) {
    if (normalizeString(raw.slice(0, i)).length >= normPrefixLen) return i;
  }
  return raw.length;
}

/**
 * Character range in `raw` where `query` matches (prefix on full string or on a
 * word token). Mid-word substrings (e.g. "ga" inside "darwinsgame") are ignored.
 */
export function findSuggestionHighlight(
  raw: string,
  query: string,
): { start: number; end: number } | null {
  const term = normalizeString(query);
  if (!term) return null;

  const fullNorm = normalizeString(raw);
  if (fullNorm.startsWith(term)) {
    return { start: 0, end: normPrefixEndIndex(raw, term.length) };
  }

  const wordRe = /[a-zA-Z0-9\u00C0-\u024F]+/g;
  let match: RegExpExecArray | null;
  while ((match = wordRe.exec(raw)) !== null) {
    const word = match[0];
    const wordNorm = normalizeString(word);
    const wordStart = match.index;

    if (wordNorm.startsWith(term)) {
      return {
        start: wordStart,
        end: wordStart + normPrefixEndIndex(word, term.length),
      };
    }
  }

  return null;
}

interface FieldScore {
  score: number;
  highlightSource: string;
}

/** First letters of each word, e.g. "Shingeki no Kyojin" → "snk". */
function titleAcronym(raw: string): string {
  const parts = raw.split(/[^a-zA-Z0-9\u00C0-\u024F]+/).filter((p) => p.length > 0);
  if (parts.length < 2) return '';
  return normalizeString(parts.map((p) => p[0]).join(''));
}

function scoreAcronym(term: string, raw: string): FieldScore | null {
  const acronym = titleAcronym(raw);
  if (!acronym) return null;
  if (acronym === term) return { score: SCORE_ACRONYM, highlightSource: raw };
  if (acronym.startsWith(term)) return { score: SCORE_WORD_PREFIX, highlightSource: raw };
  return null;
}

/** Ordered multi-word query: each token must prefix-match a title word left-to-right. */
function scorePhrase(query: string, raw: string): FieldScore | null {
  const queryWords = tokenizeWords(query)
    .map(normalizeString)
    .filter((w) => w.length >= 2 && w !== 'of' && w !== 'the' && w !== 'no');
  if (queryWords.length < 2) return null;

  const titleWords = tokenizeWords(raw).map(normalizeString);
  if (titleWords.length === 0) return null;

  let ti = 0;
  for (const qw of queryWords) {
    let found = false;
    while (ti < titleWords.length) {
      const tw = titleWords[ti];
      if (tw.startsWith(qw) || (qw.length >= 3 && tw.length >= 2 && tw.includes(qw))) {
        found = true;
        ti++;
        break;
      }
      ti++;
    }
    if (!found) return null;
  }

  return { score: SCORE_PHRASE, highlightSource: raw };
}

/** Score how well `term` matches a single display field. */
function scoreField(term: string, raw: string, allowFuzzy: boolean, query?: string): FieldScore | null {
  const acronymHit = scoreAcronym(term, raw);
  const norm = normalizeString(raw);
  if (!norm && !acronymHit) return null;

  let best = acronymHit;

  if (query) {
    const phraseHit = scorePhrase(query, raw);
    if (phraseHit && (!best || phraseHit.score > best.score)) best = phraseHit;
  }

  if (norm.startsWith(term)) {
    const candidate = { score: SCORE_PREFIX, highlightSource: raw };
    if (!best || candidate.score > best.score) best = candidate;
  }

  if (query && tokenizeWords(query).length >= 2 && term.length >= 4 && norm.includes(term)) {
    const candidate = { score: SCORE_CONTAINS, highlightSource: raw };
    if (!best || candidate.score > best.score) best = candidate;
  }

  const words = tokenizeWords(raw);

  for (const wordNorm of words) {
    if (wordNorm.startsWith(term)) {
      const candidate = { score: SCORE_WORD_PREFIX, highlightSource: raw };
      if (!best || candidate.score > best.score) best = candidate;
    }
  }

  if (!allowFuzzy) return best;

  const { SUGGESTION_DISTANCE_RATIO } = GAME_CONFIG.FUZZY;
  const allowedErrors = Math.ceil(norm.length * SUGGESTION_DISTANCE_RATIO);
  if (Math.abs(norm.length - term.length) <= allowedErrors) {
    const dist = getLevenshteinDistance(term, norm);
    if (dist <= allowedErrors) {
      const fuzzyScore = Math.max(1, 40 - dist * 10);
      const candidate = { score: fuzzyScore, highlightSource: raw };
      if (!best || candidate.score > best.score) best = candidate;
    }
  }

  return best;
}

/**
 * Stricter alt-name matching: full-string prefix / acronym / fuzzy, plus
 * word-prefix on the first few title words only (avoids "2nd Attack" noise).
 */
function scoreAltField(term: string, raw: string, allowFuzzy: boolean, query?: string): FieldScore | null {
  const acronymHit = scoreAcronym(term, raw);
  const norm = normalizeString(raw);
  if (!norm && !acronymHit) return null;

  let best = acronymHit;

  if (query) {
    const phraseHit = scorePhrase(query, raw);
    if (phraseHit && (!best || phraseHit.score > best.score)) best = phraseHit;
  }

  if (norm.startsWith(term)) {
    const candidate = { score: SCORE_PREFIX, highlightSource: raw };
    if (!best || candidate.score > best.score) best = candidate;
  }

  const words = raw.split(/[^a-zA-Z0-9\u00C0-\u024F]+/).filter((w) => w.length > 0);
  for (let i = 0; i < Math.min(words.length, 3); i++) {
    const word = words[i];
    if (/^\d/.test(word)) continue;
    const wordNorm = normalizeString(word);
    if (wordNorm.startsWith(term)) {
      const candidate = { score: SCORE_WORD_PREFIX, highlightSource: raw };
      if (!best || candidate.score > best.score) best = candidate;
    }
  }

  if (!allowFuzzy) return best;

  if (query && tokenizeWords(query).length >= 2 && term.length >= 4 && norm.includes(term)) {
    const candidate = { score: SCORE_CONTAINS, highlightSource: raw };
    if (!best || candidate.score > best.score) best = candidate;
  }

  const { SUGGESTION_DISTANCE_RATIO } = GAME_CONFIG.FUZZY;
  const allowedErrors = Math.ceil(norm.length * SUGGESTION_DISTANCE_RATIO);
  if (Math.abs(norm.length - term.length) <= allowedErrors) {
    const dist = getLevenshteinDistance(term, norm);
    if (dist <= allowedErrors) {
      const fuzzyScore = Math.max(1, 40 - dist * 10);
      const candidate = { score: fuzzyScore, highlightSource: raw };
      if (!best || candidate.score > best.score) best = candidate;
    }
  }

  return best;
}

function buildFranchiseCounts(list: FuzzyAnimeCandidate[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const anime of list) {
    if (!anime.franchise) continue;
    counts.set(anime.franchise, (counts.get(anime.franchise) ?? 0) + 1);
  }
  return counts;
}

/** Precomputed franchise counts — reuse across keystrokes on the same catalogue. */
export function buildFranchiseCountsMap(list: FuzzyAnimeCandidate[]): Map<string, number> {
  return buildFranchiseCounts(list);
}

/** Strip spin-off suffixes to compare against a parent franchise name. */
function franchiseStem(s: string): string {
  const base = s.split(/[:(]/)[0]?.trim() ?? s;
  return base.replace(/\s+(OVA|Gaiden|Season|Part|Final).*$/i, '').trim();
}

/** Whether `words` begins with the full `prefix` token sequence (word-boundary match). */
function wordsStartWith(words: string[], prefix: string[]): boolean {
  if (prefix.length === 0 || prefix.length > words.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (words[i] !== prefix[i]) return false;
  }
  return true;
}

/**
 * Spin-offs often have their own Franchise row in the DB (OVA, Gaiden…). When
 * their alt names reference a larger series ("Attack on Titan: No Regrets"),
 * bubble the suggestion up to that parent franchise instead.
 *
 * Matching is WORD-boundary based, never a bare character prefix: a single-letter
 * franchise like "K" must not swallow "Kiseijuu" / "Kimi no Uso" (see regression
 * where every "k…" title got relabeled to the "K" franchise).
 */
function findParentFranchise(
  anime: FuzzyAnimeCandidate,
  franchiseCounts: Map<string, number>,
): string | null {
  const popular = [...franchiseCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  const haystacks = [...(anime.altNames ?? []), anime.name];
  for (const [parentName] of popular) {
    const parentWords = tokenizeWords(parentName);
    if (parentWords.length === 0) continue;

    for (const h of haystacks) {
      const hWords = tokenizeWords(h);
      if (hWords.length === 0) continue;

      // Alt name starts with the whole parent name ("Attack on Titan: No Regrets").
      if (wordsStartWith(hWords, parentWords)) return parentName;

      // Or the spin-off stem is itself a full-word prefix of the parent name.
      const stemWords = tokenizeWords(franchiseStem(h));
      if (
        stemWords.length > 0 &&
        normalizeString(franchiseStem(h)).length >= 3 &&
        wordsStartWith(parentWords, stemWords)
      ) {
        return parentName;
      }
    }
  }
  return null;
}

function bestScoreForCandidate(
  term: string,
  anime: FuzzyAnimeCandidate,
  precisionMode: 'franchise' | 'anime',
  allowFuzzy: boolean,
  query?: string,
): FieldScore | null {
  let best: FieldScore | null = null;

  const consider = (scored: FieldScore | null) => {
    if (!scored) return;
    if (!best || scored.score > best.score) best = scored;
  };

  consider(scoreField(term, anime.name, allowFuzzy, query));

  for (const alt of anime.altNames ?? []) {
    consider(scoreAltField(term, alt, allowFuzzy, query));
  }

  if (precisionMode === 'franchise' && anime.franchise) {
    consider(scoreField(term, anime.franchise, allowFuzzy, query));
  }

  return best;
}

/** Resolve the dropdown label for a catalogue row. */
function suggestionLabel(
  anime: FuzzyAnimeCandidate,
  precisionMode: 'franchise' | 'anime',
  franchiseCounts: Map<string, number>,
): string | null {
  if (precisionMode === 'franchise') {
    if (!anime.franchise) return null;

    const count = franchiseCounts.get(anime.franchise) ?? 0;
    if (count >= 2) return anime.franchise;

    const parent = findParentFranchise(anime, franchiseCounts);
    if (parent) return parent;

    return anime.franchise;
  }
  return anime.name;
}

/**
 * Whether a catalogue row matches a library search query (name, alt names, franchise,
 * acronyms such as "mha" → My Hero Academia). Reuses the same scoring as autocomplete.
 */
export function animeMatchesLibrarySearch(candidate: FuzzyAnimeCandidate, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const term = normalizeString(trimmed);
  if (term.length < 2) return false;

  const allowFuzzy = term.length >= GAME_CONFIG.FUZZY.SUGGESTION_MIN_QUERY_FOR_FUZZY;
  if (bestScoreForCandidate(term, candidate, 'anime', allowFuzzy, trimmed)) return true;
  if (candidate.franchise && scoreField(term, candidate.franchise, allowFuzzy, trimmed)) return true;
  return false;
}

/**
 * Ranked anime autocomplete for the in-game typing bar.
 * prefix (100) > word-prefix (85) > fuzzy (40−).
 * Matches are word-scoped so "ga" hits "Steins Gate" but not "Darwinsgame".
 */
export const getFuzzySuggestions = (
  list: FuzzyAnimeCandidate[],
  query: string,
  precisionMode: 'franchise' | 'anime' = 'franchise',
  franchiseCountsCache?: Map<string, number>,
): AnimeSuggestion[] => {
  const { SUGGESTION_MIN_QUERY_LENGTH, SUGGESTION_MIN_QUERY_FOR_FUZZY, SUGGESTION_LIMIT } =
    GAME_CONFIG.FUZZY;

  if (!query || query.trim().length < SUGGESTION_MIN_QUERY_LENGTH) return [];

  const trimmed = query.trim();
  const term = normalizeString(trimmed);
  const allowFuzzy = term.length >= SUGGESTION_MIN_QUERY_FOR_FUZZY;
  const franchiseCounts =
    precisionMode === 'franchise'
      ? franchiseCountsCache ?? buildFranchiseCounts(list)
      : new Map<string, number>();

  const byLabel = new Map<string, AnimeSuggestion>();

  for (const anime of list) {
    const label = suggestionLabel(anime, precisionMode, franchiseCounts);
    if (!label) continue;

    const scored = bestScoreForCandidate(term, anime, precisionMode, allowFuzzy, trimmed);
    if (!scored) continue;

    const highlight = findSuggestionHighlight(label, trimmed);
    const entry: AnimeSuggestion = { label, score: scored.score, highlight };

    const prev = byLabel.get(label);
    if (!prev || entry.score > prev.score) byLabel.set(label, entry);
  }

  return [...byLabel.values()]
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, SUGGESTION_LIMIT);
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
