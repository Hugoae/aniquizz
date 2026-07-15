import {
  buildFranchiseCountsMap,
  normalizeString,
  tokenizeWords,
  type FuzzyAnimeCandidate,
} from '@aniquizz/shared';

type PrefixIndex = Map<string, FuzzyAnimeCandidate[]>;

let cachedIndex: { catalogue: FuzzyAnimeCandidate[]; index: PrefixIndex } | null = null;
let cachedFranchiseCounts: { catalogue: FuzzyAnimeCandidate[]; counts: Map<string, number> } | null =
  null;

function addToIndex(index: PrefixIndex, key: string, anime: FuzzyAnimeCandidate) {
  if (!key) return;
  const bucket = index.get(key);
  if (bucket) {
    if (bucket[bucket.length - 1] !== anime) bucket.push(anime);
    return;
  }
  index.set(key, [anime]);
}

function registerPrefixKeys(keys: Set<string>, raw: string | undefined) {
  if (!raw) return;

  const norm = normalizeString(raw);
  if (norm.length >= 2) keys.add(norm.slice(0, 2));
  if (norm.length >= 1) keys.add(norm.slice(0, 1));

  // Word-level prefixes mirror getFuzzySuggestions scoring (e.g. "edgerunner" → Cyberpunk).
  for (const word of tokenizeWords(raw)) {
    if (word.length >= 2) keys.add(word.slice(0, 2));
    if (word.length >= 1) keys.add(word.slice(0, 1));
  }
}

/** Buckets catalogue rows by normalized 1–2 char prefixes (title start + each word). */
export function buildCataloguePrefixIndex(catalogue: FuzzyAnimeCandidate[]): PrefixIndex {
  if (cachedIndex?.catalogue === catalogue) return cachedIndex.index;

  const index: PrefixIndex = new Map();

  for (const anime of catalogue) {
    const keys = new Set<string>();
    registerPrefixKeys(keys, anime.name);
    registerPrefixKeys(keys, anime.franchise);
    for (const alt of anime.altNames ?? []) registerPrefixKeys(keys, alt);

    for (const key of keys) addToIndex(index, key, anime);
  }

  cachedIndex = { catalogue, index };
  return index;
}

/** Memoized franchise counts — reused across keystrokes on the same catalogue. */
export function getCatalogueFranchiseCounts(catalogue: FuzzyAnimeCandidate[]): Map<string, number> {
  if (cachedFranchiseCounts?.catalogue === catalogue) return cachedFranchiseCounts.counts;
  const counts = buildFranchiseCountsMap(catalogue);
  cachedFranchiseCounts = { catalogue, counts };
  return counts;
}

/** Shrinks the fuzzy scan to prefix-matching rows — critical for backspace responsiveness. */
export function narrowCatalogueByPrefix(
  catalogue: FuzzyAnimeCandidate[],
  index: PrefixIndex,
  query: string,
): FuzzyAnimeCandidate[] {
  const trimmed = query.trim();
  const term = normalizeString(trimmed);
  if (term.length < 2) return [];

  const hits = new Map<FuzzyAnimeCandidate, true>();
  const addBucket = (key?: string) => {
    if (!key) return;
    const bucket = index.get(key);
    if (!bucket) return;
    for (const anime of bucket) hits.set(anime, true);
  };

  addBucket(term.length >= 2 ? term.slice(0, 2) : undefined);
  addBucket(term.slice(0, 1));

  // Multi-word queries (e.g. "lie in april") must union each token's bucket.
  for (const word of trimmed.split(/[^a-zA-Z0-9\u00C0-\u024F]+/).filter((w) => w.length > 0)) {
    const norm = normalizeString(word);
    if (norm.length >= 2) addBucket(norm.slice(0, 2));
    if (norm.length >= 1) addBucket(norm.slice(0, 1));
  }

  if (hits.size === 0) return catalogue;
  return [...hits.keys()];
}

/** Test helper — reset module caches between tests. */
export function resetCataloguePrefixIndexCache(): void {
  cachedIndex = null;
  cachedFranchiseCounts = null;
}
