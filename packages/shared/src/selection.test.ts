import { describe, it, expect } from 'vitest';
import { buildChoices, buildDuo } from './selection';
import { normalizeString } from './utils';

describe('buildChoices', () => {
  const pool = ['Naruto', 'Bleach', 'One Piece', 'Death Note', 'Fairy Tail'];

  it('always contains the correct answer', () => {
    const choices = buildChoices('Naruto', pool, 4);
    expect(choices).toContain('Naruto');
  });

  it('produces the requested number of distinct choices', () => {
    const choices = buildChoices('Naruto', pool, 4);
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
  });

  it('never includes the correct answer among the wrong options', () => {
    const correctNorm = normalizeString('Naruto');
    const choices = buildChoices('Naruto', pool, 4);
    const occurrences = choices.filter((c) => normalizeString(c) === correctNorm);
    expect(occurrences).toHaveLength(1);
  });

  it('pads with a placeholder when the pool is too small', () => {
    const choices = buildChoices('Naruto', ['Bleach'], 4);
    expect(choices).toHaveLength(4);
    expect(choices).toContain('Naruto');
    expect(choices.filter((c) => c === '???').length).toBeGreaterThan(0);
  });
});

describe('buildDuo', () => {
  it('returns the correct answer plus one distinct wrong option', () => {
    const duo = buildDuo('Naruto', ['Naruto', 'Bleach', 'One Piece']);
    expect(duo).toHaveLength(2);
    expect(duo).toContain('Naruto');
    expect(duo).toContain('Bleach');
  });

  it('falls back to a placeholder when no wrong option exists', () => {
    const duo = buildDuo('Naruto', ['Naruto']);
    expect(duo).toHaveLength(2);
    expect(duo).toContain('Naruto');
    expect(duo).toContain('???');
  });
});
