import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ARTIST_CREDIT_OVERRIDES,
  ATOMIC_ARTIST_CREDITS,
  hasArtistCreditOverride,
  isAtomicArtistCredit,
  isUnknownArtistCredit,
  parseArtistNames,
  resolveArtistNames,
} from './parse-artist-names';

describe('parseArtistNames', () => {
  it('keeps a single artist unchanged', () => {
    assert.deepEqual(parseArtistNames('LiSA'), ['LiSA']);
    assert.deepEqual(parseArtistNames('MYTH & ROID'), ['MYTH & ROID']);
  });

  it('splits comma-separated collaborations', () => {
    assert.deepEqual(parseArtistNames('CHiCO, HoneyWorks'), ['CHiCO', 'HoneyWorks']);
    assert.deepEqual(parseArtistNames('Kana Hanazawa, Marina Inoue, Youko Hikasa'), [
      'Kana Hanazawa',
      'Marina Inoue',
      'Youko Hikasa',
    ]);
    assert.deepEqual(parseArtistNames('MYTH & ROID, TK from Ling tosite sigure'), [
      'MYTH & ROID',
      'TK from Ling tosite sigure',
    ]);
    assert.deepEqual(parseArtistNames('Tackey, Tsubasa'), ['Tackey', 'Tsubasa']);
  });

  it('keeps every official comma-in-name credit atomic', () => {
    for (const credit of ATOMIC_ARTIST_CREDITS) {
      assert.deepEqual(parseArtistNames(credit), [credit], credit);
    }
  });

  it('rejoins atomic names even after a naive comma split', () => {
    assert.deepEqual(parseArtistNames('Fear, and Loathing in Las Vegas'), [
      'Fear, and Loathing in Las Vegas',
    ]);
    assert.deepEqual(parseArtistNames("Mix Speaker's, Inc."), ["Mix Speaker's, Inc."]);
    assert.deepEqual(parseArtistNames('JO☆STARS ~TOMMY, Coda, JIN~'), [
      'JO☆STARS ~TOMMY, Coda, JIN~',
    ]);
  });

  it('rejoins an atomic credit that sits next to another artist', () => {
    assert.deepEqual(parseArtistNames('Fear, and Loathing in Las Vegas, LiSA'), [
      'Fear, and Loathing in Las Vegas',
      'LiSA',
    ]);
  });

  it('drops unknown or empty credits', () => {
    assert.deepEqual(parseArtistNames(''), []);
    assert.deepEqual(parseArtistNames('Unknown Artist'), []);
    assert.deepEqual(parseArtistNames('   '), []);
  });

  it('keeps artist names written outside the Latin alphabet', () => {
    assert.deepEqual(parseArtistNames('μ'), ['μ']);
  });

  it('dedupes the same person listed twice', () => {
    assert.deepEqual(parseArtistNames('LiSA, LiSA'), ['LiSA']);
  });

  it('splits every curated non-comma collaboration', () => {
    for (const [credit, names] of Object.entries(ARTIST_CREDIT_OVERRIDES)) {
      assert.deepEqual(parseArtistNames(credit), names, credit);
      assert.equal(hasArtistCreditOverride(credit), true, credit);
    }
  });

  it('does not split words that belong to atomic group names', () => {
    for (const name of [
      'Bird Bear Hare and Fish',
      'Daisy X Daisy',
      'HIGH and MIGHTY COLOR',
      'kanon x kanon',
      'MAN WITH A MISSION',
      'TOMORROW X TOGETHER',
    ]) {
      assert.deepEqual(parseArtistNames(name), [name], name);
    }
  });
});

describe('resolveArtistNames', () => {
  it('prefers a structured AnimeThemes list over re-parsing the joined credit', () => {
    assert.deepEqual(
      resolveArtistNames('CHiCO, HoneyWorks', ['CHiCO', 'HoneyWorks']),
      ['CHiCO', 'HoneyWorks'],
    );
  });

  it('falls back to parsing the display credit', () => {
    assert.deepEqual(resolveArtistNames('CHiCO, HoneyWorks'), ['CHiCO', 'HoneyWorks']);
  });

  it('expands a curated composite even when AnimeThemes exposes one artist entity', () => {
    assert.deepEqual(
      resolveArtistNames('The Seatbelts feat. Mai Yamane', [
        'The Seatbelts feat. Mai Yamane',
      ]),
      ['The Seatbelts', 'Mai Yamane'],
    );
  });
});

describe('artist credit classifiers', () => {
  it('detects unknown credits', () => {
    assert.equal(isUnknownArtistCredit('Unknown Artist'), true);
    assert.equal(isUnknownArtistCredit('LiSA'), false);
  });

  it('detects atomic comma-in-name credits', () => {
    assert.equal(isAtomicArtistCredit('Fear, and Loathing in Las Vegas'), true);
    assert.equal(isAtomicArtistCredit('CHiCO, HoneyWorks'), false);
  });
});
