import { describe, expect, it } from 'vitest';
import {
  artistCreditsOverlap,
  collectArtistSearchLabels,
  hasPlayableArtistCredit,
  resolveArtistAcceptedAnswers,
  resolveArtistQcmTarget,
  resolveArtistUnits,
  resolveRoundAnswerSet,
} from './artistAnswers';
import { isAnswerCorrect } from './utils';

const chicoHoney = {
  artist: 'CHiCO, HoneyWorks',
  artistNames: ['CHiCO', 'HoneyWorks'],
};

describe('resolveArtistUnits', () => {
  it('returns billed units without the composite collab string', () => {
    expect(resolveArtistUnits(chicoHoney.artist, chicoHoney.artistNames)).toEqual([
      'CHiCO',
      'HoneyWorks',
    ]);
  });

  it('keeps comma-in-name bands as a single unit', () => {
    expect(
      resolveArtistUnits('Fear, and Loathing in Las Vegas', ['Fear, and Loathing in Las Vegas']),
    ).toEqual(['Fear, and Loathing in Las Vegas']);
  });

  it('falls back to the display credit when no structured names exist', () => {
    expect(resolveArtistUnits('LiSA', [])).toEqual(['LiSA']);
  });
});

describe('resolveArtistQcmTarget', () => {
  it('uses the first billed unit, not the composite credit', () => {
    expect(resolveArtistQcmTarget(chicoHoney.artist, chicoHoney.artistNames)).toBe('CHiCO');
    expect(resolveArtistQcmTarget('LiSA, Felix', ['LiSA', 'Felix'])).toBe('LiSA');
    expect(
      resolveArtistQcmTarget('The Seatbelts feat. Mai Yamane', ['The Seatbelts', 'Mai Yamane']),
    ).toBe('The Seatbelts');
  });
});

describe('resolveArtistAcceptedAnswers', () => {
  it('lists billed units first, then the full credit as typing tolerance', () => {
    expect(resolveArtistAcceptedAnswers(chicoHoney.artist, chicoHoney.artistNames)).toEqual([
      'CHiCO',
      'HoneyWorks',
      'CHiCO, HoneyWorks',
    ]);
  });

  it('keeps comma-in-name bands atomic', () => {
    expect(
      resolveArtistAcceptedAnswers('Fear, and Loathing in Las Vegas', [
        'Fear, and Loathing in Las Vegas',
      ]),
    ).toEqual(['Fear, and Loathing in Las Vegas']);
  });

  it('keeps Seatbelts feat credits as units plus display', () => {
    expect(
      resolveArtistAcceptedAnswers('The Seatbelts feat. Mai Yamane', [
        'The Seatbelts',
        'Mai Yamane',
      ]),
    ).toEqual(['The Seatbelts', 'Mai Yamane', 'The Seatbelts feat. Mai Yamane']);
  });

  it('keeps a Greek-letter unit searchable', () => {
    expect(resolveArtistAcceptedAnswers('Velvet.kodhy and μ', ['Velvet.kodhy', 'μ'])).toEqual([
      'Velvet.kodhy',
      'μ',
      'Velvet.kodhy and μ',
    ]);
  });

  it('drops unknown / punctuation-only credits', () => {
    expect(resolveArtistAcceptedAnswers('???', [])).toEqual([]);
    expect(resolveArtistAcceptedAnswers('   ', [])).toEqual([]);
    expect(hasPlayableArtistCredit('Unknown Artist', [])).toBe(false);
    expect(hasPlayableArtistCredit('', [])).toBe(false);
  });

  it('dedupes case/accent variants of the same unit', () => {
    expect(resolveArtistAcceptedAnswers('LiSA', ['lisa', 'LiSA'])).toEqual(['LiSA']);
  });
});

describe('artist precision grading answers', () => {
  const answers = resolveArtistAcceptedAnswers(chicoHoney.artist, chicoHoney.artistNames);

  it('accepts each credited form and rejects title/anime', () => {
    expect(isAnswerCorrect('CHiCO, HoneyWorks', answers)).toBe(true);
    expect(isAnswerCorrect('CHiCO', answers)).toBe(true);
    expect(isAnswerCorrect('HoneyWorks', answers)).toBe(true);
    expect(isAnswerCorrect('Honey Works', answers)).toBe(true);
    expect(isAnswerCorrect('Kokoro Connect', answers)).toBe(false);
    expect(isAnswerCorrect('Kimiiro Signal', answers)).toBe(false);
  });

  it('accepts μ as an exact unit and rejects punctuation', () => {
    const muAnswers = resolveArtistAcceptedAnswers('Velvet.kodhy and μ', ['Velvet.kodhy', 'μ']);
    expect(isAnswerCorrect('μ', muAnswers)).toBe(true);
    expect(isAnswerCorrect('...', muAnswers)).toBe(false);
  });

  it('still allows fuzzy typos on long latin credits', () => {
    expect(isAnswerCorrect('HoneyWorkss', answers)).toBe(true);
  });
});

describe('artistCreditsOverlap', () => {
  it('detects a shared unit between a collab and a solo credit', () => {
    expect(
      artistCreditsOverlap(
        resolveArtistAcceptedAnswers('CHiCO, HoneyWorks', ['CHiCO', 'HoneyWorks']),
        resolveArtistAcceptedAnswers('CHiCO with HoneyWorks', ['CHiCO', 'HoneyWorks']),
      ),
    ).toBe(true);
    expect(
      artistCreditsOverlap(
        resolveArtistAcceptedAnswers('LiSA', ['LiSA']),
        resolveArtistAcceptedAnswers('CHiCO', ['CHiCO']),
      ),
    ).toBe(false);
  });
});

describe('collectArtistSearchLabels', () => {
  it('lists billed units only, never composite collab credits', () => {
    expect(
      collectArtistSearchLabels([
        { artist: 'CHiCO, HoneyWorks', artistNames: ['CHiCO', 'HoneyWorks'] },
        { artist: 'CHiCO', artistNames: ['CHiCO'] },
        { artist: 'LiSA, Felix', artistNames: ['LiSA', 'Felix'] },
      ]),
    ).toEqual(['CHiCO', 'HoneyWorks', 'LiSA', 'Felix']);
  });

  it('keeps an atomic comma-in-name band as one label', () => {
    expect(
      collectArtistSearchLabels([
        {
          artist: 'Fear, and Loathing in Las Vegas',
          artistNames: ['Fear, and Loathing in Las Vegas'],
        },
      ]),
    ).toEqual(['Fear, and Loathing in Las Vegas']);
  });
});

describe('resolveRoundAnswerSet', () => {
  it('uses the billed-first unit as the QCM target in artist precision', () => {
    const set = resolveRoundAnswerSet({
      precision: 'artist',
      animeName: 'Kokoro Connect',
      altNames: ['Kokoro Connect'],
      franchise: 'Kokoro Connect',
      artist: 'CHiCO, HoneyWorks',
      artistNames: ['CHiCO', 'HoneyWorks'],
    });
    expect(set.correctTarget).toBe('CHiCO');
    expect(set.validAnswers).toEqual(['CHiCO', 'HoneyWorks', 'CHiCO, HoneyWorks']);
  });

  it('keeps franchise answers unchanged', () => {
    const set = resolveRoundAnswerSet({
      precision: 'franchise',
      animeName: 'My Hero Academia Season 3',
      altNames: ['Boku no Hero Academia S3'],
      franchise: 'My Hero Academia',
      artist: 'LiSA',
      artistNames: ['LiSA'],
    });
    expect(set.correctTarget).toBe('My Hero Academia');
    expect(set.validAnswers).toContain('My Hero Academia Season 3');
    expect(set.validAnswers).toContain('My Hero Academia');
  });
});
