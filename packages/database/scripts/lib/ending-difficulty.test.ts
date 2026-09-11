import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  recalibrateEndingDifficulties,
  resolveEndingDifficulty,
  type OpeningRef,
} from './ending-difficulty';

const op = (sequence: number, difficulty: string): OpeningRef => ({ sequence, difficulty });

describe('resolveEndingDifficulty', () => {
  it('copies the same-sequence opening of the same anime', () => {
    assert.equal(
      resolveEndingDifficulty({
        sequence: 2,
        sameAnimeOpenings: [op(1, 'EASY'), op(2, 'HARD')],
        franchiseOpenings: [op(1, 'MEDIUM')],
      }),
      'HARD',
    );
  });

  it('uses the median of the season openings when the sequence has no OP', () => {
    assert.equal(
      resolveEndingDifficulty({
        sequence: 3,
        sameAnimeOpenings: [op(1, 'EASY'), op(2, 'HARD')],
        franchiseOpenings: [op(1, 'MEDIUM')],
      }),
      'MEDIUM',
    );
  });

  it('falls back to franchise openings when the season has no OP', () => {
    assert.equal(
      resolveEndingDifficulty({
        sequence: 1,
        sameAnimeOpenings: [],
        franchiseOpenings: [op(1, 'HARD'), op(2, 'HARD'), op(3, 'MEDIUM')],
      }),
      'HARD',
    );
  });

  it('returns null when no opening exists in the franchise', () => {
    assert.equal(
      resolveEndingDifficulty({
        sequence: 1,
        sameAnimeOpenings: [],
        franchiseOpenings: [],
      }),
      null,
    );
  });
});

describe('recalibrateEndingDifficulties', () => {
  it('updates every ending and never changes openings', () => {
    const franchises = [
      {
        name: 'Naruto',
        animes: [
          {
            name: 'Naruto',
            songs: [
              { id: 1, songType: 'OP', sequence: 1, difficulty: 'MEDIUM', title: 'OP1' },
              { id: 2, songType: 'ED', sequence: 1, difficulty: 'EASY', title: 'ED1' },
              { id: 3, songType: 'ED', sequence: 2, difficulty: 'HARD', title: 'ED2' },
            ],
          },
          {
            name: 'Naruto Shippuden',
            songs: [{ id: 4, songType: 'ED', sequence: 1, difficulty: 'EASY', title: 'Ship ED1' }],
          },
        ],
      },
    ];

    const report = recalibrateEndingDifficulties(franchises);

    assert.equal(franchises[0].animes[0].songs[0].difficulty, 'MEDIUM');
    assert.equal(franchises[0].animes[0].songs[1].difficulty, 'MEDIUM');
    assert.equal(franchises[0].animes[0].songs[2].difficulty, 'MEDIUM');
    assert.equal(franchises[0].animes[1].songs[0].difficulty, 'MEDIUM');
    assert.equal(report.changed.length, 3);
    assert.equal(report.skippedNoOpening, 0);
  });

  it('leaves an ending unchanged when the franchise has no opening', () => {
    const franchises = [
      {
        name: 'Solo ED pack',
        animes: [
          {
            name: 'Only endings',
            songs: [{ id: 9, songType: 'ED', sequence: 1, difficulty: 'EASY', title: 'ED1' }],
          },
        ],
      },
    ];

    const report = recalibrateEndingDifficulties(franchises);
    assert.equal(franchises[0].animes[0].songs[0].difficulty, 'EASY');
    assert.equal(report.changed.length, 0);
    assert.equal(report.skippedNoOpening, 1);
  });
});
