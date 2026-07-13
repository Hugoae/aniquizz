import { describe, expect, it, beforeEach } from 'vitest';
import type { FuzzyAnimeCandidate } from '@aniquizz/shared';
import {
  buildCataloguePrefixIndex,
  narrowCatalogueByPrefix,
  resetCataloguePrefixIndexCache,
} from './animeSearchIndex';

const catalogue: FuzzyAnimeCandidate[] = [
  { name: 'Naruto', franchise: 'Naruto', altNames: [] },
  { name: 'Nana', franchise: 'Nana', altNames: [] },
  { name: 'One Piece', franchise: 'One Piece', altNames: ['OP'] },
];

describe('animeSearchIndex', () => {
  beforeEach(() => {
    resetCataloguePrefixIndexCache();
  });

  it('narrows by two-char prefix', () => {
    const index = buildCataloguePrefixIndex(catalogue);
    const narrowed = narrowCatalogueByPrefix(catalogue, index, 'na');
    expect(narrowed.map((a) => a.name).sort()).toEqual(['Nana', 'Naruto']);
  });

  it('returns empty for short queries', () => {
    const index = buildCataloguePrefixIndex(catalogue);
    expect(narrowCatalogueByPrefix(catalogue, index, 'n')).toEqual([]);
  });
});
