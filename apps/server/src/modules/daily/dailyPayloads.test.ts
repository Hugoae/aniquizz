import { describe, expect, it } from 'vitest';
import type { DailyRoundSnapshot } from '@aniquizz/shared';
import { toResultDto, toRevealDto, toRevealSong, type DailyRoundRow } from './dailyPayloads';

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

  it('warms the next playable clip without leaking its identity', () => {
    const rounds = [round(1, 11), round(2, 22), round(3, 33)];
    const answer = { roundId: 'round-1', selectedLabel: 'Anime 1', isCorrect: true, responseMs: 500 };
    const dto = toRevealDto({
      round: rounds[0],
      answer,
      rounds,
      answers: [answer],
      revealUntil: new Date('2026-09-14T10:00:15.000Z'),
      finished: false,
    });
    expect(dto.nextVideo).toBe('k-22');
    expect(dto.nextVideoStartTime).toBe(8);
    expect(JSON.stringify(dto)).not.toContain('Anime 2');
    expect(JSON.stringify(dto)).not.toContain('Song 22');
  });

  it('skips voided rounds when choosing the next clip', () => {
    const rounds = [round(1, 11), { ...round(2, 22), voided: true }, round(3, 33)];
    const dto = toRevealDto({
      round: rounds[0],
      answer: undefined,
      rounds,
      answers: [],
      revealUntil: new Date('2026-09-14T10:00:15.000Z'),
      finished: false,
    });
    expect(dto.nextVideo).toBe('k-33');
  });

  it('omits the next clip on the last playable round', () => {
    const rounds = [round(1, 11)];
    const dto = toRevealDto({
      round: rounds[0],
      answer: undefined,
      rounds,
      answers: [],
      revealUntil: new Date('2026-09-14T10:00:15.000Z'),
      finished: true,
    });
    expect(dto.nextVideo).toBeNull();
    expect(dto.nextVideoStartTime).toBeNull();
  });

  it('keeps that catalogue id on the recap rows', () => {
    const result = toResultDto({
      rounds: [round(1, 4242)],
      answers: [{ roundId: 'round-1', selectedLabel: 'Anime 1', isCorrect: true, responseMs: 1200 }],
      xpAwarded: 8,
      completedAt: new Date('2026-09-14T10:00:00.000Z'),
      streak: 1,
    });
    expect(result.recap[0]).toMatchObject({ position: 1, songId: 4242, anime: 'Anime 1' });
  });
});
