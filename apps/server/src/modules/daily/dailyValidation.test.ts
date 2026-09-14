import { describe, expect, it } from 'vitest';
import type { DailyRoundSnapshot } from '@aniquizz/shared';
import { validateDailySnapshots } from './dailyValidation';

const snap = (overrides: Partial<DailyRoundSnapshot> = {}): DailyRoundSnapshot => ({
  id: 1,
  anime: 'Naruto',
  franchise: 'Naruto',
  validAnswers: ['Naruto'],
  title: 'GO!!!',
  artist: 'FLOW',
  typeLabel: 'OP1',
  difficulty: 'easy',
  videoKey: 'k',
  videoStartTime: 0,
  guessDuration: 15,
  cover: null,
  animeId: 1,
  year: 2002,
  season: null,
  format: 'TV',
  episodeRange: null,
  coverColor: null,
  siteUrl: '',
  tags: [],
  choices: ['Naruto', 'Bleach', 'One Piece', 'Hunter x Hunter'],
  songType: 'OP',
  franchiseId: 10,
  popularity: 100,
  ...overrides,
});

const five = (rows: Array<Partial<DailyRoundSnapshot>>): DailyRoundSnapshot[] =>
  rows.map((row, index) =>
    snap({
      id: index + 1,
      animeId: index + 1,
      franchiseId: 10 + index,
      difficulty: index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard',
      songType: index < 3 ? 'OP' : 'ED',
      ...row,
    }),
  );

describe('validateDailySnapshots', () => {
  const emptyRecent = { recentSongIds: new Set<number>(), recentFranchiseKeys: new Set<string>() };

  it('returns no warnings for a valid odd-numbered day', () => {
    expect(
      validateDailySnapshots(five([{}, {}, {}, {}, {}]), { challengeNumber: 1, ...emptyRecent }),
    ).toEqual([]);
  });

  it('flags a shared franchise and a song reused within 60 days', () => {
    const codes = validateDailySnapshots(
      five([{ franchiseId: 10 }, { franchiseId: 10 }, {}, {}, {}]),
      { challengeNumber: 1, recentSongIds: new Set([1]), recentFranchiseKeys: new Set() },
    ).map((row) => row.code);
    expect(codes).toContain('duplicate_franchise');
    expect(codes).toContain('recent_song');
  });

  it('flags a franchise that already appeared in the 14-day lookback', () => {
    const codes = validateDailySnapshots(five([{}, {}, {}, {}, {}]), {
      challengeNumber: 1,
      recentSongIds: new Set(),
      recentFranchiseKeys: new Set(['f:10']),
    }).map((row) => row.code);
    expect(codes).toEqual(['recent_franchise']);
  });
});
