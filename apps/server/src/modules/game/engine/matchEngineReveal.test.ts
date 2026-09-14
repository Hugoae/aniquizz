import { describe, expect, it } from 'vitest';
import { buildRoundHistoryByUser, toRevealSong } from './matchEngineReveal';
import type { PlaylistItem, RecordedRound } from './types';

const item: PlaylistItem = {
  id: 7,
  anime: 'Naruto',
  franchise: 'Naruto',
  validAnswers: ['Naruto'],
  title: 'GO!!!',
  artist: 'FLOW',
  typeLabel: 'OP1',
  difficulty: 'easy',
  videoKey: 'clip',
  videoStartTime: 12,
  guessDuration: 15,
  cover: null,
  animeId: 20,
  year: 2002,
  season: 'FALL',
  format: 'TV',
  episodeRange: '1-13',
  coverColor: null,
  siteUrl: 'https://anilist.co',
  tags: [],
  choices: ['Naruto', 'Bleach'],
  duo: ['Naruto', 'Bleach'],
};

describe('matchEngineReveal', () => {
  it('maps a playlist row to a public reveal song with start at 0', () => {
    expect(toRevealSong(item)).toMatchObject({
      id: 7,
      anime: 'Naruto',
      type: 'OP1',
      videoKey: 'clip',
      videoStartTime: 0,
    });
  });

  it('builds per-user history including unanswered players', () => {
    const recorded: RecordedRound[] = [
      {
        roundNumber: 1,
        songId: 7,
        answers: [
          {
            userId: 'a',
            answer: 'Naruto',
            isCorrect: true,
            answerType: 'typing',
            timeMs: 900,
            pointsAwarded: 100,
            speedRank: 1,
            speedBonus: 5,
          },
        ],
      },
    ];
    const byUser = buildRoundHistoryByUser([item], recorded, ['a', 'b']);
    expect(byUser.a[0]).toMatchObject({
      round: 1,
      isCorrect: true,
      points: 100,
      myAnswer: 'Naruto',
      answerTimeMs: 900,
    });
    expect(byUser.b[0]).toMatchObject({
      isCorrect: false,
      points: 0,
      myAnswer: null,
      answerTimeMs: null,
    });
  });
});
