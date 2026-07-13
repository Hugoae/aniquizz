import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  shuffleArray,
  getFuzzySuggestions,
  animeMatchesLibrarySearch,
  isAnswerCorrect,
  getLevenshteinDistance,
  normalizeString,
  findSuggestionHighlight,
  type FuzzyAnimeCandidate,
} from './utils';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('shuffleArray (Fisher-Yates)', () => {
  it('returns a permutation with the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffleArray(input);
    expect(out).toHaveLength(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffleArray(input);
    expect(input).toEqual(copy);
  });

  it('is deterministic given a fixed random source', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(shuffleArray(['A', 'B', 'C', 'D'])).toEqual(['B', 'C', 'D', 'A']);
  });

  it('handles empty and invalid input safely', () => {
    expect(shuffleArray([])).toEqual([]);
    // @ts-expect-error - guarding runtime misuse
    expect(shuffleArray(null)).toEqual([]);
  });
});

describe('getLevenshteinDistance', () => {
  it('is zero for identical strings', () => {
    expect(getLevenshteinDistance('naruto', 'naruto')).toBe(0);
  });

  it('counts single edits', () => {
    expect(getLevenshteinDistance('naruto', 'narutp')).toBe(1);
    expect(getLevenshteinDistance('kitten', 'sitting')).toBe(3);
  });
});

describe('normalizeString', () => {
  it('strips accents, case and punctuation', () => {
    expect(normalizeString('Ré:Zero!')).toBe('rezero');
    expect(normalizeString('  One Piece  ')).toBe('onepiece');
  });
});

describe('findSuggestionHighlight', () => {
  it('highlights a word-prefix match', () => {
    expect(findSuggestionHighlight('Steins Gate', 'ga')).toEqual({ start: 7, end: 9 });
  });

  it('highlights a full-string prefix', () => {
    expect(findSuggestionHighlight('Naruto', 'nar')).toEqual({ start: 0, end: 3 });
  });
});

describe('getFuzzySuggestions', () => {
  const list: FuzzyAnimeCandidate[] = [
    { name: 'Naruto', franchise: 'Naruto', altNames: ['NARUTO'] },
    { name: 'Naruto Shippuden', franchise: 'Naruto', altNames: [] },
    { name: 'Bleach', franchise: 'Bleach', altNames: [] },
    { name: 'Fullmetal Alchemist', franchise: 'Fullmetal Alchemist', altNames: ['Hagane no Renkinjutsushi'] },
    { name: "Darwin's Game", franchise: "Darwin's Game", altNames: [] },
    { name: 'Steins Gate', franchise: 'Steins Gate', altNames: [] },
  ];

  const labels = (res: ReturnType<typeof getFuzzySuggestions>) => res.map((r) => r.label);

  it('returns nothing for empty or too-short queries', () => {
    expect(getFuzzySuggestions(list, '')).toEqual([]);
    expect(getFuzzySuggestions(list, 'a')).toEqual([]);
  });

  it('matches on prefixes and ranks them first', () => {
    const res = getFuzzySuggestions(list, 'blea', 'anime');
    expect(labels(res)).toContain('Bleach');
    expect(res[0]?.label).toBe('Bleach');
  });

  it('collapses to the franchise in franchise mode and dedupes', () => {
    expect(labels(getFuzzySuggestions(list, 'naru', 'franchise'))).toEqual(['Naruto']);
  });

  it('franchise mode skips entries without a franchise link', () => {
    const res = labels(
      getFuzzySuggestions(
        [
          { name: 'Shingeki no Kyojin', franchise: 'Shingeki no Kyojin', altNames: ['Attack on Titan'] },
          { name: 'Shingeki no Kyojin OVA', franchise: null, altNames: [] },
          { name: 'Shingeki no Kyojin: LOST GIRLS', franchise: null, altNames: [] },
        ],
        'attack',
        'franchise',
      ),
    );
    expect(res).toEqual(['Shingeki no Kyojin']);
  });

  it('franchise mode collapses SNK spin-offs under the parent franchise', () => {
    const snkCatalogue: FuzzyAnimeCandidate[] = [
      { name: 'Attack on Titan', franchise: 'Attack on Titan', altNames: ['SnK', 'AoT'] },
      { name: 'Attack on Titan Season 2', franchise: 'Attack on Titan', altNames: ['SnK 2'] },
      {
        name: 'Shingeki no Kyojin Gaiden: Kuinaki Sentaku',
        franchise: 'Shingeki no Kyojin Gaiden: Kuinaki Sentaku',
        altNames: ['Attack on Titan: No Regrets'],
      },
      {
        name: 'Shingeki no Kyojin OVA',
        franchise: 'Shingeki no Kyojin OVA',
        altNames: ['Attack on Titan OVA'],
      },
      {
        name: 'Shingeki no Kyojin: LOST GIRLS',
        franchise: 'Shingeki no Kyojin: LOST GIRLS',
        altNames: ['Attack on Titan: Lost Girls'],
      },
      {
        name: "Don't Toy With Me, Miss Nagatoro Season 2",
        franchise: "Don't Toy With Me, Miss Nagatoro",
        altNames: ['Ijiranaide, Nagatoro-san 2nd Attack'],
      },
    ];
    expect(labels(getFuzzySuggestions(snkCatalogue, 'attack', 'franchise'))).toEqual(['Attack on Titan']);
  });

  it('franchise mode keeps single-anime franchises with non-latin alt names', () => {
    const catalogue: FuzzyAnimeCandidate[] = [
      { name: 'Popular Parent', franchise: 'Popular Parent', altNames: [] },
      { name: 'Popular Parent S2', franchise: 'Popular Parent', altNames: [] },
      {
        name: 'Black Clover',
        franchise: 'Black Clover',
        altNames: ['Black Clover', 'ブラッククローバー', 'Чёрный клевер'],
      },
    ];
    expect(labels(getFuzzySuggestions(catalogue, 'black clover', 'franchise'))).toEqual(['Black Clover']);
    expect(labels(getFuzzySuggestions(catalogue, 'black', 'franchise'))).toContain('Black Clover');
  });

  it('matches multi-word English titles like Your Lie in April', () => {
    const catalogue: FuzzyAnimeCandidate[] = [
      {
        name: 'Your Lie in April',
        franchise: 'Your Lie in April',
        altNames: ['Shigatsu wa Kimi no Uso', 'Your lie in April'],
      },
    ];
    expect(labels(getFuzzySuggestions(catalogue, 'your lie in april', 'franchise'))).toEqual([
      'Your Lie in April',
    ]);
    expect(labels(getFuzzySuggestions(catalogue, 'lie in april', 'franchise'))).toEqual([
      'Your Lie in April',
    ]);
    expect(labels(getFuzzySuggestions(catalogue, 'april', 'franchise'))).toEqual(['Your Lie in April']);
  });

  it('matches single-word titles like Parasyte', () => {
    const catalogue: FuzzyAnimeCandidate[] = [
      {
        name: 'Parasyte',
        franchise: 'Parasyte',
        altNames: ['Kiseijuu: Sei no Kakuritsu', 'Parasyte: The Maxim', 'Parasyte -the maxim-'],
      },
    ];
    expect(labels(getFuzzySuggestions(catalogue, 'parasyte', 'franchise'))).toEqual(['Parasyte']);
    expect(labels(getFuzzySuggestions(catalogue, 'paras', 'franchise'))).toEqual(['Parasyte']);
    expect(labels(getFuzzySuggestions(catalogue, 'kiseijuu', 'franchise'))).toEqual(['Parasyte']);
  });

  it('franchise mode keeps single-anime franchises whose title contains a colon', () => {
    const catalogue: FuzzyAnimeCandidate[] = [
      { name: 'Popular Parent', franchise: 'Popular Parent', altNames: [] },
      { name: 'Popular Parent S2', franchise: 'Popular Parent', altNames: [] },
      {
        name: 'Cyberpunk: Edgerunners',
        franchise: 'Cyberpunk: Edgerunners',
        altNames: ['Cyberpunk: Edgerunners', 'サイバーパンク エッジランナーズ', 'Киберпанк: Бегущие по краю'],
      },
      {
        name: 'Fullmetal Alchemist: Brotherhood',
        franchise: 'Fullmetal Alchemist: Brotherhood',
        altNames: ['Fullmetal Alchemist: Brotherhood', 'Hagane no Renkinjutsushi: Fullmetal Alchemist'],
      },
    ];

    expect(labels(getFuzzySuggestions(catalogue, 'cyberpunk', 'franchise'))).toEqual(['Cyberpunk: Edgerunners']);
    expect(labels(getFuzzySuggestions(catalogue, 'cyberpunk edgerunners', 'franchise'))).toEqual([
      'Cyberpunk: Edgerunners',
    ]);
    expect(labels(getFuzzySuggestions(catalogue, 'edgerunner', 'franchise'))).toEqual(['Cyberpunk: Edgerunners']);
    expect(labels(getFuzzySuggestions(catalogue, 'brotherhood', 'franchise'))).toEqual([
      'Fullmetal Alchemist: Brotherhood',
    ]);
  });

  it('franchise mode does not bubble to a parent via empty normalized alt names', () => {
    const catalogue: FuzzyAnimeCandidate[] = [
      { name: 'Kizumonogatari I: Tekketsu-hen', franchise: 'Kizumonogatari I: Tekketsu-hen', altNames: [] },
      { name: 'Kizumonogatari II', franchise: 'Kizumonogatari I: Tekketsu-hen', altNames: [] },
      {
        name: 'Black Clover',
        franchise: 'Black Clover',
        altNames: ['Black Clover', 'ブラッククローバー'],
      },
    ];

    expect(labels(getFuzzySuggestions(catalogue, 'black clover', 'franchise'))).toEqual(['Black Clover']);
    expect(labels(getFuzzySuggestions(catalogue, 'black', 'franchise'))).not.toEqual([
      'Kizumonogatari I: Tekketsu-hen',
    ]);
  });

  it('does not let a single-letter franchise (K) swallow every "k…" title', () => {
    const catalogue: FuzzyAnimeCandidate[] = [
      { name: 'K', franchise: 'K', altNames: ['K', 'K-Project'] },
      { name: 'K: RETURN OF KINGS', franchise: 'K', altNames: ['K RETURN OF KINGS'] },
      {
        name: 'Parasyte',
        franchise: 'Parasyte',
        altNames: ['Kiseijuu: Sei no Kakuritsu', 'Parasyte: The Maxim'],
      },
      {
        name: 'Your Lie in April',
        franchise: 'Your Lie in April',
        altNames: ['Shigatsu wa Kimi no Uso'],
      },
    ];

    // Real titles must resolve to their own franchise, not be relabeled to "K".
    expect(labels(getFuzzySuggestions(catalogue, 'parasyte', 'franchise'))).toContain('Parasyte');
    expect(labels(getFuzzySuggestions(catalogue, 'kiseijuu', 'franchise'))).toContain('Parasyte');
    expect(labels(getFuzzySuggestions(catalogue, 'your lie in april', 'franchise'))).toContain(
      'Your Lie in April',
    );
    // The genuine "K" sequel still bubbles to the K franchise.
    expect(labels(getFuzzySuggestions(catalogue, 'return of kings', 'franchise'))).toContain('K');
  });

  it('exact mode lists individual anime names in exact mode', () => {
    const res = labels(getFuzzySuggestions(list, 'naru', 'anime'));
    expect(res).toContain('Naruto');
    expect(res).toContain('Naruto Shippuden');
  });

  it('exact mode does not surface franchise when only the franchise name matches', () => {
    const res = labels(
      getFuzzySuggestions(
        [{ name: 'Naruto Shippuden', franchise: 'Naruto', altNames: [] }],
        'naruto',
        'anime',
      ),
    );
    expect(res).toEqual(['Naruto Shippuden']);
  });

  it('tolerates typos via edit distance when query length >= 3', () => {
    const res = getFuzzySuggestions(list, 'bleech', 'anime');
    expect(labels(res)).toContain('Bleach');
  });

  it('does not fuzzy-match on 2-character queries', () => {
    const res = labels(getFuzzySuggestions(list, 'be', 'anime'));
    expect(res).not.toContain('Bleach');
  });

  it('matches word prefixes but not mid-word substrings', () => {
    const res = labels(
      getFuzzySuggestions(
        [
          { name: "Darwin's Game", franchise: "Darwin's Game", altNames: [] },
          { name: 'Darwinsgame', franchise: 'Darwinsgame', altNames: [] },
          { name: 'Steins Gate', franchise: 'Steins Gate', altNames: [] },
        ],
        'ga',
        'anime',
      ),
    );
    expect(res).toContain("Darwin's Game");
    expect(res).toContain('Steins Gate');
    expect(res).not.toContain('Darwinsgame');
  });

  it('matches via alt names but displays the primary title only', () => {
    const res = getFuzzySuggestions(
      [{ name: 'Shingeki no Kyojin', franchise: 'Shingeki no Kyojin', altNames: ["L'Attaque des Titans", 'SNK'] }],
      'attaque',
      'anime',
    );
    expect(res.map((r) => r.label)).toEqual(['Shingeki no Kyojin']);
  });

  it('matches multi-word acronyms (e.g. SNK)', () => {
    const res = getFuzzySuggestions(
      [{ name: 'Shingeki no Kyojin', franchise: 'Shingeki no Kyojin', altNames: [] }],
      'snk',
      'anime',
    );
    expect(res[0]?.label).toBe('Shingeki no Kyojin');
  });

  it('never uses alt names as the suggestion label', () => {
    const res = getFuzzySuggestions(
      [{ name: 'Fullmetal Alchemist', franchise: 'Fullmetal Alchemist', altNames: ['Hagane no Renkinjutsushi'] }],
      'hagane',
      'anime',
    );
    expect(res.map((r) => r.label)).toEqual(['Fullmetal Alchemist']);
    expect(res.every((r) => r.label !== 'Hagane no Renkinjutsushi')).toBe(true);
  });

  it('labels always use the primary title (exact) or franchise (franchise mode)', () => {
    const res = getFuzzySuggestions(
      [{ name: 'Naruto Shippuden', franchise: 'Naruto', altNames: ['NARUTO SHIPPUDEN'] }],
      'naru',
      'anime',
    );
    expect(res.map((r) => r.label)).toEqual(['Naruto Shippuden']);
  });

  it('returns every matching suggestion up to SUGGESTION_LIMIT', () => {
    const big: FuzzyAnimeCandidate[] = Array.from({ length: 20 }, (_, i) => ({
      name: `Test Anime ${i}`,
      franchise: `Franchise ${i}`,
      altNames: [],
    }));
    expect(getFuzzySuggestions(big, 'test', 'anime').length).toBe(20);
  });
});

describe('animeMatchesLibrarySearch', () => {
  it('matches acronyms and alt names used in library search', () => {
    const mha: FuzzyAnimeCandidate = {
      name: 'Boku no Hero Academia',
      franchise: 'Boku no Hero Academia',
      altNames: ['My Hero Academia', 'MHA'],
    };
    expect(animeMatchesLibrarySearch(mha, 'mha')).toBe(true);
    expect(animeMatchesLibrarySearch(mha, 'my hero')).toBe(true);
    expect(animeMatchesLibrarySearch(mha, 'naruto')).toBe(false);
  });
});

describe('isAnswerCorrect', () => {
  it('accepts exact matches ignoring case/accents', () => {
    expect(isAnswerCorrect('one piece', ['One Piece'])).toBe(true);
    expect(isAnswerCorrect('Ré:Zero', ['rezero'])).toBe(true);
  });

  it('accepts close typos above the similarity threshold', () => {
    expect(isAnswerCorrect('narutoo', ['Naruto'])).toBe(true);
  });

  it('rejects unrelated answers', () => {
    expect(isAnswerCorrect('bleach', ['Naruto'])).toBe(false);
    expect(isAnswerCorrect('', ['Naruto'])).toBe(false);
  });
});
