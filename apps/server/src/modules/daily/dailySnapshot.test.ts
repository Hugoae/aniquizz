import { describe, expect, it } from 'vitest';
import type { DailyRoundSnapshot } from '@aniquizz/shared';
import { withNewDailyClipStart } from './dailySnapshot';

const snap = (videoStartTime: number): DailyRoundSnapshot => ({
  id: 1,
  anime: 'Naruto',
  franchise: 'Naruto',
  validAnswers: ['Naruto'],
  title: 'GO!!!',
  artist: 'FLOW',
  typeLabel: 'OP1',
  difficulty: 'easy',
  videoKey: 'k',
  videoStartTime,
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
  choices: ['Naruto'],
  songType: 'OP',
  franchiseId: 10,
  popularity: 100,
});

describe('withNewDailyClipStart', () => {
  it('keeps guess + reveal + 2s inside the track and can pick a new offset', () => {
    const next = withNewDailyClipStart(snap(0), 90, { next: () => 0.5 });
    expect(next.videoStartTime).toBe(29);
    expect(next.videoStartTime).toBeLessThan(90 - 15 - 15 - 2);
    expect(next.title).toBe('GO!!!');
  });

  it('retries when the first roll lands on the current offset', () => {
    const rolls = [0, 0.5];
    const next = withNewDailyClipStart(snap(0), 90, { next: () => rolls.shift() ?? 0.5 });
    expect(next.videoStartTime).toBe(29);
  });
});
