import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  shuffleArray,
  getFuzzySuggestions,
  isAnswerCorrect,
  getLevenshteinDistance,
  normalizeString,
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
    // Math.random() === 0 => j = 0 for every i; standard Fisher-Yates trace.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(shuffleArray(['A', 'B', 'C', 'D'])).toEqual(['B', 'C', 'D', 'A']);
  });

  it('handles empty and invalid input safely', () => {
    expect(shuffleArray([])).toEqual([]);
    // @ts-expect-error - guarding runtime misuse
    expect(shuffleArray(null)).toEqual([]);
  });

  it('is not positionally biased (no anchored first element)', () => {
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 2000; i++) {
      const out = shuffleArray([0, 1, 2, 3]);
      counts[out.indexOf(0)] += 1;
    }
    // With a fair shuffle each slot should get ~25%; assert every slot is well used.
    for (const c of counts) {
      expect(c).toBeGreaterThan(2000 * 0.15);
    }
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

describe('getFuzzySuggestions', () => {
  const list: FuzzyAnimeCandidate[] = [
    { name: 'Naruto', franchise: 'Naruto', altNames: ['NARUTO'] },
    { name: 'Naruto Shippuden', franchise: 'Naruto', altNames: [] },
    { name: 'Bleach', franchise: 'Bleach', altNames: [] },
    { name: 'Fullmetal Alchemist', franchise: 'Fullmetal Alchemist', altNames: ['Hagane no Renkinjutsushi'] },
  ];

  it('returns nothing for empty or too-short queries', () => {
    expect(getFuzzySuggestions(list, '')).toEqual([]);
    expect(getFuzzySuggestions(list, 'a')).toEqual([]);
  });

  it('matches on substrings', () => {
    const res = getFuzzySuggestions(list, 'blea', 'exact');
    expect(res).toContain('Bleach');
  });

  it('collapses to the franchise in franchise mode and dedupes', () => {
    const res = getFuzzySuggestions(list, 'naru', 'franchise');
    expect(res).toEqual(['Naruto']);
  });

  it('returns individual names in exact mode', () => {
    const res = getFuzzySuggestions(list, 'naru', 'exact');
    expect(res).toContain('Naruto');
    expect(res).toContain('Naruto Shippuden');
  });

  it('tolerates typos via edit distance', () => {
    const res = getFuzzySuggestions(list, 'bleech', 'exact');
    expect(res).toContain('Bleach');
  });

  it('caps the result list at five entries', () => {
    const big: FuzzyAnimeCandidate[] = Array.from({ length: 20 }, (_, i) => ({
      name: `Test Anime ${i}`,
      franchise: `Franchise ${i}`,
      altNames: [],
    }));
    expect(getFuzzySuggestions(big, 'test', 'exact').length).toBeLessThanOrEqual(5);
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
