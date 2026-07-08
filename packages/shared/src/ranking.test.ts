import { describe, it, expect } from 'vitest';
import { computeCompetitionRanks } from './ranking';

describe('computeCompetitionRanks', () => {
  it('assigns the same rank to tied scores', () => {
    const ranks = computeCompetitionRanks([
      { id: 'a', score: 100 },
      { id: 'b', score: 100 },
      { id: 'c', score: 80 },
      { id: 'd', score: 80 },
      { id: 'e', score: 50 },
    ]);

    expect(ranks.get('a')).toBe(1);
    expect(ranks.get('b')).toBe(1);
    expect(ranks.get('c')).toBe(3);
    expect(ranks.get('d')).toBe(3);
    expect(ranks.get('e')).toBe(5);
  });
});
