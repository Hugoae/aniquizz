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
  { name: 'Cyberpunk: Edgerunners', franchise: 'Cyberpunk: Edgerunners', altNames: [] },
  { name: 'Fullmetal Alchemist: Brotherhood', franchise: 'Fullmetal Alchemist', altNames: [] },
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

  it('narrows by word-level prefix (not only title start)', () => {
    const index = buildCataloguePrefixIndex(catalogue);
    const edgerunners = narrowCatalogueByPrefix(catalogue, index, 'edgerunner');
    expect(edgerunners.map((a) => a.name)).toContain('Cyberpunk: Edgerunners');

    const brotherhood = narrowCatalogueByPrefix(catalogue, index, 'brother');
    expect(brotherhood.map((a) => a.name)).toContain('Fullmetal Alchemist: Brotherhood');
  });
});
