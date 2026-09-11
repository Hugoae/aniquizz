import { describe, expect, it } from 'vitest';
import { getFuzzySuggestions, prepareFuzzyCatalogue } from '@aniquizz/shared';
import {
  buildCataloguePrefixIndex,
  getCatalogueFranchiseCounts,
  narrowCatalogueByPrefix,
} from './animeSearchIndex';

const ylia = {
  name: 'Your Lie in April',
  franchise: 'Your Lie in April',
  altNames: ['Shigatsu wa Kimi no Uso', 'Your lie in April'],
};

function searchPipeline(catalogue: typeof ylia[], query: string) {
  const prepared = prepareFuzzyCatalogue(catalogue);
  const index = buildCataloguePrefixIndex(prepared);
  const scoped = narrowCatalogueByPrefix(prepared, index, query);
  const franchiseCounts = getCatalogueFranchiseCounts(prepared);
  let next = getFuzzySuggestions(scoped, query, 'franchise', franchiseCounts);
  if (next.length === 0 && scoped.length < prepared.length) {
    next = getFuzzySuggestions(prepared, query, 'franchise', franchiseCounts);
  }
  return { scoped: scoped.length, labels: next.map((r) => r.label) };
}

describe('useAnimeSearch pipeline', () => {
  it('finds Your Lie in April in a large yo bucket', () => {
    const decoys = Array.from({ length: 300 }, (_, i) => ({
      name: `Yonder ${i}`,
      franchise: `Yonder ${i}`,
      altNames: [] as string[],
    }));
    const catalogue = [...decoys, ylia, ...decoys];
    const result = searchPipeline(catalogue, 'your lie in april');
    expect(result.labels).toContain('Your Lie in April');
  });

  it('finds Your Lie in April when query starts mid-title', () => {
    const catalogue = [ylia];
    expect(searchPipeline(catalogue, 'lie in april').labels).toContain('Your Lie in April');
  });

  it('keeps prefix-scoped hits without a full-catalogue rescan', () => {
    const neon = {
      name: 'Neon Genesis Evangelion',
      franchise: 'Neon Genesis Evangelion',
      altNames: [] as string[],
    };
    const naruto = { name: 'Naruto', franchise: 'Naruto', altNames: [] as string[] };
    const catalogue = [neon, naruto, ylia];
    const prepared = prepareFuzzyCatalogue(catalogue);
    const index = buildCataloguePrefixIndex(prepared);
    const scoped = narrowCatalogueByPrefix(prepared, index, 'na');
    expect(scoped.map((row) => row.name)).toEqual(['Naruto']);
    const hits = getFuzzySuggestions(scoped, 'na', 'franchise', getCatalogueFranchiseCounts(prepared));
    expect(hits.map((row) => row.label)).toEqual(['Naruto']);
  });
});
