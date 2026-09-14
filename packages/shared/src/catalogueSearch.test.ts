import { describe, expect, it } from 'vitest';
import { parseCatalogueSearchQuery, resolveCatalogueSongTypes } from './catalogueSearch';

describe('parseCatalogueSearchQuery', () => {
  it('splits bleach ED5 into anime text, ending, and sequence', () => {
    expect(parseCatalogueSearchQuery('bleach ED5')).toEqual({
      text: 'bleach',
      songType: 'ED',
      sequence: 5,
    });
  });

  it('accepts spaced and long type labels', () => {
    expect(parseCatalogueSearchQuery('bleach ed 5')).toEqual({
      text: 'bleach',
      songType: 'ED',
      sequence: 5,
    });
    expect(parseCatalogueSearchQuery('naruto opening 3')).toEqual({
      text: 'naruto',
      songType: 'OP',
      sequence: 3,
    });
    expect(parseCatalogueSearchQuery('mha OP1')).toEqual({
      text: 'mha',
      songType: 'OP',
      sequence: 1,
    });
  });

  it('keeps type-only queries so ED5 lists endings #5', () => {
    expect(parseCatalogueSearchQuery('ED5')).toEqual({
      text: '',
      songType: 'ED',
      sequence: 5,
    });
  });

  it('does not treat One Piece or the word in as type tokens', () => {
    expect(parseCatalogueSearchQuery('one piece')).toEqual({
      text: 'one piece',
      songType: null,
      sequence: null,
    });
    expect(parseCatalogueSearchQuery('in the mood')).toEqual({
      text: 'in the mood',
      songType: null,
      sequence: null,
    });
    expect(parseCatalogueSearchQuery('OPM')).toEqual({
      text: 'OPM',
      songType: null,
      sequence: null,
    });
  });

  it('parses numbered inserts without a bare in token', () => {
    expect(parseCatalogueSearchQuery('bleach IN2')).toEqual({
      text: 'bleach',
      songType: 'INSERT',
      sequence: 2,
    });
    expect(parseCatalogueSearchQuery('bleach insert')).toEqual({
      text: 'bleach',
      songType: 'INSERT',
      sequence: null,
    });
  });

  it('lets the last type token win', () => {
    expect(parseCatalogueSearchQuery('bleach ED5 OP1')).toEqual({
      text: 'bleach',
      songType: 'OP',
      sequence: 1,
    });
  });
});

describe('resolveCatalogueSongTypes', () => {
  it('intersects a parsed type with the current filter', () => {
    expect(resolveCatalogueSongTypes(['OP', 'ED'], 'ED')).toEqual(['ED']);
    expect(resolveCatalogueSongTypes(['OP'], 'ED')).toEqual([]);
    expect(resolveCatalogueSongTypes(undefined, 'ED')).toEqual(['ED']);
    expect(resolveCatalogueSongTypes(['OP', 'ED'], null)).toEqual(['OP', 'ED']);
    expect(resolveCatalogueSongTypes(undefined, null)).toBeNull();
  });
});
