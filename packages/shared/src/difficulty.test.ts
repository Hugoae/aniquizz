import { describe, expect, it } from 'vitest';
import { selectedPoolDifficulties } from './difficulty';

describe('selectedPoolDifficulties', () => {
  it('counts only the checked tiers (no easier fallback)', () => {
    expect(selectedPoolDifficulties(['medium'])).toEqual(['medium']);
    expect(selectedPoolDifficulties(['easy'])).toEqual(['easy']);
    expect(selectedPoolDifficulties(['hard'])).toEqual(['hard']);
  });

  it('unions several checked tiers without inventing the ones in between', () => {
    expect(selectedPoolDifficulties(['medium', 'easy'])).toEqual(['medium', 'easy']);
    expect(selectedPoolDifficulties(['hard', 'easy'])).toEqual(['hard', 'easy']);
    expect(selectedPoolDifficulties(['easy', 'MEDIUM', 'hard'])).toEqual(['hard', 'medium', 'easy']);
  });

  it('returns undefined when nothing is selected', () => {
    expect(selectedPoolDifficulties(undefined)).toBeUndefined();
    expect(selectedPoolDifficulties([])).toBeUndefined();
  });
});
