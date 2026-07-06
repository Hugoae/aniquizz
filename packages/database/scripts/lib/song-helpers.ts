import { Difficulty, SongType } from '@prisma/client';
import { formatSongTypeLabel } from '@aniquizz/shared';

export { formatSongTypeLabel };

export const parsePipelineDifficulty = (value?: string): Difficulty => {
  switch ((value ?? 'medium').toLowerCase()) {
    case 'easy':
      return Difficulty.EASY;
    case 'hard':
      return Difficulty.HARD;
    default:
      return Difficulty.MEDIUM;
  }
};

/** Normalize legacy `type: "OP1"` or new `songType` + `sequence` from pipeline JSON. */
export const normalizePipelineSong = (song: {
  type?: string;
  songType?: string;
  sequence?: number;
}): { songType: SongType; sequence: number } => {
  if (song.songType) {
    return {
      songType: song.songType as SongType,
      sequence: song.sequence ?? 1,
    };
  }

  const legacy = song.type ?? 'OP1';
  const digits = legacy.replace(/\D/g, '');
  const sequence = digits ? Math.max(1, parseInt(digits, 10)) : 1;

  if (legacy.toUpperCase().startsWith('ED')) {
    return { songType: SongType.ED, sequence };
  }
  if (legacy.toUpperCase().startsWith('IN')) {
    return { songType: SongType.INSERT, sequence };
  }
  return { songType: SongType.OP, sequence };
};

export const buildVideoKey = (animeName: string, animeId: number, songType: string, sequence: number): string =>
  `${animeName.replace(/[^a-zA-Z0-9]/g, '')}-${animeId}-${formatSongTypeLabel(songType, sequence)}.mp4`;
