import { describe, expect, it, beforeEach } from 'vitest';
import type { FuzzyAnimeCandidate } from '@aniquizz/shared';
import {
  buildCataloguePrefixIndex,
  getCatalogueFranchiseCounts,
  narrowCatalogueByPrefix,
  resetCataloguePrefixIndexCache,
} from './animeSearchIndex';

const catalogue: FuzzyAnimeCandidate[] = [
  { name: 'Naruto', franchise: 'Naruto', altNames: [] },
  { name: 'Nana', franchise: 'Nana', altNames: [] },
  { name: 'Neon Genesis Evangelion', franchise: 'Neon Genesis Evangelion', altNames: [] },
  { name: 'One Piece', franchise: 'One Piece', altNames: ['OP'] },
  { name: 'Cyberpunk: Edgerunners', franchise: 'Cyberpunk: Edgerunners', altNames: [] },
  { name: 'Fullmetal Alchemist: Brotherhood', franchise: 'Fullmetal Alchemist', altNames: [] },
];

describe('animeSearchIndex', () => {
  beforeEach(() => {
    resetCataloguePrefixIndexCache();
  });

  it('narrows by two-char prefix without unioning the 1-char bucket', () => {
    const index = buildCataloguePrefixIndex(catalogue);
    const narrowed = narrowCatalogueByPrefix(catalogue, index, 'na');
    expect(narrowed.map((a) => a.name).sort()).toEqual(['Nana', 'Naruto']);
    expect(narrowed.map((a) => a.name)).not.toContain('Neon Genesis Evangelion');
  });

  it('returns empty for short queries', () => {
    const index = buildCataloguePrefixIndex(catalogue);
    expect(narrowCatalogueByPrefix(catalogue, index, 'n')).toEqual([]);
  });

  it('narrows by word-level prefix (not only title start)', () => {
    const index = buildCataloguePrefixIndex(catalogue);
    const edgerunners = narrowCatalogueByPrefix(catalogue, index, 'edgerunner');
    expect(edgerunners.map((a) => a.name)).toContain('Cyberpunk: Edgerunners');

    const brotherhood = narrowCatalogueByPrefix(catalogue, index, 'brother');
    expect(brotherhood.map((a) => a.name)).toContain('Fullmetal Alchemist: Brotherhood');
  });

  it('memoizes franchise counts per catalogue reference', () => {
    const first = getCatalogueFranchiseCounts(catalogue);
    const second = getCatalogueFranchiseCounts(catalogue);
    expect(second).toBe(first);
    expect(first.get('Naruto')).toBe(1);
  });

  it('does not union 1-char buckets on multi-word queries', () => {
    const withLucky: FuzzyAnimeCandidate[] = [
      ...catalogue,
      { name: 'Your Lie in April', franchise: 'Your Lie in April', altNames: [] },
      { name: 'Lucky Star', franchise: 'Lucky Star', altNames: [] },
    ];
    const index = buildCataloguePrefixIndex(withLucky);
    const narrowed = narrowCatalogueByPrefix(withLucky, index, 'lie in april');
    expect(narrowed.map((a) => a.name)).toContain('Your Lie in April');
    expect(narrowed.map((a) => a.name)).not.toContain('Lucky Star');
  });
});
