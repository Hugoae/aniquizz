import { normalizeString, tokenizeWords, type FuzzyAnimeCandidate } from '@aniquizz/shared';

type PrefixIndex = Map<string, FuzzyAnimeCandidate[]>;

let cachedIndex: { catalogue: FuzzyAnimeCandidate[]; index: PrefixIndex } | null = null;

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

/** Shrinks the fuzzy scan to prefix-matching rows — critical for backspace responsiveness. */
export function narrowCatalogueByPrefix(
  catalogue: FuzzyAnimeCandidate[],
  index: PrefixIndex,
  query: string,
): FuzzyAnimeCandidate[] {
  const term = normalizeString(query.trim());
  if (term.length < 2) return [];

  const bucket =
    (term.length >= 2 ? index.get(term.slice(0, 2)) : undefined) ??
    index.get(term.slice(0, 1));

  return bucket ?? catalogue;
}

/** Test helper — reset module cache between tests. */
export function resetCataloguePrefixIndexCache(): void {
  cachedIndex = null;
}
