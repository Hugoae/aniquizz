import { describe, it, expect } from 'vitest';
import { buildChoices, buildDuo, buildChoiceCandidatePool, buildArtistChoices } from './selection';
import { normalizeString } from './utils';

describe('buildChoiceCandidatePool', () => {
  const rows = [
    { id: 1, name: 'Naruto', franchise: 'Naruto' },
    { id: 2, name: 'Bleach', franchise: 'Bleach' },
    { id: 3, name: 'One Piece', franchise: 'One Piece' },
    { id: 4, name: 'Death Note', franchise: 'Death Note' },
    { id: 99, name: 'Obscure Anime', franchise: 'Obscure' },
  ];

  it('returns an empty pool when the allowed id list is empty', () => {
    const pool = buildChoiceCandidatePool(rows, 'anime', []);
    expect(pool).toEqual([]);
  });

  it('restricts the pool to watched anime ids in AniList mode', () => {
    const pool = buildChoiceCandidatePool(rows, 'anime', [1, 2, 3]);
    expect(pool).toEqual(['Naruto', 'Bleach', 'One Piece']);
    expect(pool).not.toContain('Obscure Anime');
  });

  it('uses franchise names when precision is franchise', () => {
    const pool = buildChoiceCandidatePool(rows, 'franchise', [1, 4]);
    expect(pool).toEqual(['Naruto', 'Death Note']);
  });
});

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

  it('only draws wrong answers from a watched-filtered pool', () => {
    const watchedPool = buildChoiceCandidatePool(
      [
        { id: 1, name: 'Naruto', franchise: 'Naruto' },
        { id: 2, name: 'Bleach', franchise: 'Bleach' },
        { id: 3, name: 'One Piece', franchise: 'One Piece' },
        { id: 4, name: 'Death Note', franchise: 'Death Note' },
      ],
      'anime',
      [1, 2, 3, 4],
    );
    const choices = buildChoices('Naruto', watchedPool, 4);
    expect(choices).toHaveLength(4);
    expect(choices).toContain('Naruto');
    for (const choice of choices) {
      expect(['Naruto', 'Bleach', 'One Piece', 'Death Note', '???']).toContain(choice);
    }
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

describe('buildArtistChoices', () => {
  const pool = [
    { artist: 'CHiCO, HoneyWorks', artistNames: ['CHiCO', 'HoneyWorks'] },
    { artist: 'CHiCO with HoneyWorks', artistNames: ['CHiCO', 'HoneyWorks'] },
    { artist: 'HoneyWorks', artistNames: ['HoneyWorks'] },
    { artist: 'LiSA', artistNames: ['LiSA'] },
    { artist: 'LiSA, Felix', artistNames: ['LiSA', 'Felix'] },
    { artist: 'Aimer', artistNames: ['Aimer'] },
    { artist: 'YOASOBI', artistNames: ['YOASOBI'] },
    { artist: 'Official HIGE DANdism', artistNames: ['Official HIGE DANdism'] },
  ];

  it('uses the first billed unit as the correct option', () => {
    const choices = buildArtistChoices('CHiCO, HoneyWorks', ['CHiCO', 'HoneyWorks'], pool, 4);
    expect(choices).toContain('CHiCO');
    expect(choices).not.toContain('CHiCO, HoneyWorks');
    expect(choices).toHaveLength(4);
  });

  it('never puts a composite collab credit on a button', () => {
    const choices = buildArtistChoices('LiSA', ['LiSA'], pool, 4);
    expect(choices).toContain('LiSA');
    expect(choices).not.toContain('CHiCO, HoneyWorks');
    expect(choices).not.toContain('CHiCO with HoneyWorks');
    expect(choices).not.toContain('LiSA, Felix');
  });

  it('excludes every credited unit of the answer from distractors', () => {
    const choices = buildArtistChoices('CHiCO, HoneyWorks', ['CHiCO', 'HoneyWorks'], pool, 4);
    expect(choices).not.toContain('HoneyWorks');
    expect(choices).not.toContain('CHiCO with HoneyWorks');
    for (const choice of choices) {
      if (choice === 'CHiCO' || choice === '???') continue;
      expect(['LiSA', 'Felix', 'Aimer', 'YOASOBI', 'Official HIGE DANdism']).toContain(choice);
    }
  });

  it('keeps an atomic comma-in-name band as the correct option', () => {
    const choices = buildArtistChoices(
      'Fear, and Loathing in Las Vegas',
      ['Fear, and Loathing in Las Vegas'],
      pool,
      4,
    );
    expect(choices).toContain('Fear, and Loathing in Las Vegas');
    expect(choices).toHaveLength(4);
  });
});
