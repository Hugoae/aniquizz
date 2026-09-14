import { describe, expect, it } from 'vitest';
import type { DailySafeRoundDto, DailyTrackState } from '@aniquizz/shared';
import { tracksFromPrior } from './dailyPlayTracks';

const baseRound = (overrides: Partial<DailySafeRoundDto> = {}): DailySafeRoundDto => ({
  attemptId: 'a1',
  roundId: 'r1',
  position: 2,
  total: 5,
  videoKey: 'v',
  videoStartTime: 0,
  choices: ['A', 'B', 'C', 'D'],
  roundStartedAt: new Date().toISOString(),
  roundEndsAt: new Date().toISOString(),
  revealEndsAt: null,
  phase: 'guessing',
  reveal: null,
  ...overrides,
});

describe('tracksFromPrior', () => {
  it('prefers tracks from the next reveal payload', () => {
    const previous: DailyTrackState[] = ['correct', 'pending', 'empty', 'empty', 'empty'];
    const next = baseRound({
      reveal: {
        position: 2,
        selectedLabel: 'A',
        isCorrect: true,
        responseMs: 800,
        correctLabel: 'A',
        song: {
          id: 1,
          anime: 'X',
          title: 'T',
          artist: 'Ar',
          type: 'OP1',
          difficulty: 'easy',
          cover: null,
          franchise: null,
          year: 2020,
          season: null,
          format: null,
          episodeRange: null,
          coverColor: null,
          siteUrl: 'https://anilist.co/anime/1',
          tags: [],
          animeId: 1,
          videoKey: 'v',
          videoStartTime: 0,
        },
        tracks: ['correct', 'correct', 'empty', 'empty', 'empty'],
        revealEndsAt: new Date().toISOString(),
        finished: false,
      },
    });
    expect(tracksFromPrior(previous, next)).toEqual(['correct', 'correct', 'empty', 'empty', 'empty']);
  });

  it('rebuilds tracks from the previous round when the next payload has none', () => {
    const previous: DailyTrackState[] = ['correct', 'wrong', 'empty', 'empty', 'empty'];
    expect(tracksFromPrior(previous, baseRound({ position: 3 }))).toEqual([
      'correct',
      'wrong',
      'pending',
      'empty',
      'empty',
    ]);
  });
});
