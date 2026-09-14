import { describe, expect, it } from 'vitest';
import { resolvePoolQueryFilters, selectedPoolSongTypes } from './poolFilters';

describe('resolvePoolQueryFilters', () => {
  it('unions song types without leaking INSERT', () => {
    expect(selectedPoolSongTypes(['ending'])).toEqual(['ending']);
    expect(selectedPoolSongTypes(['opening', 'ending'])).toEqual(['opening', 'ending']);
    expect(selectedPoolSongTypes(['ED', 'OP'])).toEqual(['opening', 'ending']);
  });

  it('keeps Moyen distinct from Facile so both-checked is a real union', () => {
    expect(resolvePoolQueryFilters({ types: ['ending'], difficulty: ['medium'] })).toEqual({
      types: ['ending'],
      difficulty: ['medium'],
    });

    expect(resolvePoolQueryFilters({ types: ['ending'], difficulty: ['easy'] })).toEqual({
      types: ['ending'],
      difficulty: ['easy'],
    });

    expect(resolvePoolQueryFilters({ types: ['ending'], difficulty: ['easy', 'medium'] })).toEqual({
      types: ['ending'],
      difficulty: ['medium', 'easy'],
    });
  });
});
