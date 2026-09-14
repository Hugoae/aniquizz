import { describe, expect, it, vi } from 'vitest';
import type { DailyRoundSnapshot } from '@aniquizz/shared';
import { toRevealSong, toSafeRound, type DailyRoundRow } from './dailyPayloads';

vi.mock('../../lib/mediaPlaybackUrl', () => ({
  toPlaybackUrl: (videoKey: string) =>
    `https://media.test/v/${Buffer.from(videoKey).toString('hex')}`,
}));

const snapshot = (id: number, anime: string): DailyRoundSnapshot => ({
  id,
  anime,
  franchise: anime,
  validAnswers: [anime],
  title: `Song ${id}`,
  artist: 'Artist',
  typeLabel: 'OP2',
  difficulty: 'medium',
  videoKey: `DEATHNOTE-${id}-OP2.mp4`,
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
  songType: 'OP',
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

describe('dailyPayloads opaque playback URLs', () => {
  it('does not put the R2 filename on guessing or reveal locators', () => {
    const startedAt = new Date('2026-09-14T10:00:00.000Z');
    const dto = toSafeRound({
      attemptId: 'attempt-1',
      round: round(1, 1535),
      total: 5,
      roundStartedAt: startedAt,
      revealUntil: null,
      phase: 'guessing',
      reveal: null,
    });
    expect(dto.videoKey).toMatch(/^https:\/\/media\.test\/v\/[0-9a-f]+$/);
    expect(dto.videoKey).not.toMatch(/OP2\.mp4/i);
    expect(dto.videoKey).not.toContain('DEATHNOTE');

    const song = toRevealSong(snapshot(1535, 'Death Note'));
    expect(song.videoKey).toMatch(/^https:\/\/media\.test\/v\/[0-9a-f]+$/);
    expect(song.videoKey).not.toContain('DEATHNOTE');
  });
});
