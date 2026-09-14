import { describe, expect, it } from 'vitest';
import type { DailyRoundSnapshot } from '@aniquizz/shared';
import { toResultDto, toRevealSong, type DailyRoundRow } from './dailyPayloads';

const snapshot = (id: number, anime: string): DailyRoundSnapshot => ({
  id,
  anime,
  franchise: anime,
  validAnswers: [anime],
  title: `Song ${id}`,
  artist: 'Artist',
  typeLabel: 'ED5',
  difficulty: 'medium',
  videoKey: `k-${id}`,
  videoStartTime: 8,
  guessDuration: 15,
  cover: null,
  animeId: id,
  year: 2020,
  season: 'FALL',
  format: 'TV',
  episodeRange: '1-12',
  coverColor: null,
  siteUrl: 'https://anilist.co/anime/1',
  tags: [],
  choices: [anime, 'Bleach', 'One Piece', 'Naruto'],
  songType: 'ED',
  franchiseId: id,
  popularity: 100,
});

const round = (position: number, songId: number): DailyRoundRow => ({
  id: `round-${position}`,
  position,
  voided: false,
  snapshot: snapshot(songId, `Anime ${position}`),
  choices: [`Anime ${position}`],
  videoStartTime: 8,
});

describe('dailyPayloads likes', () => {
  it('exposes the catalogue song id on reveal so likes match other modes', () => {
    const song = toRevealSong(snapshot(4242, 'Bleach'));
    expect(song.id).toBe(4242);
    expect(song.anime).toBe('Bleach');
  });

  it('keeps that catalogue id on the recap rows', () => {
    const result = toResultDto({
      rounds: [round(1, 4242)],
      answers: [
        { roundId: 'round-1', selectedLabel: 'Anime 1', isCorrect: true, responseMs: 1200 },
      ],
      xpAwarded: 8,
      completedAt: new Date('2026-09-14T10:00:00.000Z'),
      streak: 1,
    });
    expect(result.recap[0]).toMatchObject({ position: 1, songId: 4242, anime: 'Anime 1' });
  });
});
