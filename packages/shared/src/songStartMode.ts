// Guessing-phase clip start position (26.1 #5).

export type SongStartMode = 'random' | 'beginning';

export const SONG_START_MODE_DEFAULT: SongStartMode = 'random';

/** French UI labels (isolated for future i18n). */
export const SONG_START_MODE_LABELS: Record<SongStartMode, string> = {
  random: 'Aléatoire',
  beginning: 'Au début',
};

export const SONG_START_MODE_DESCRIPTIONS: Record<SongStartMode, string> = {
  random: 'Un point aléatoire du clip, différent à chaque manche.',
  beginning: "L'extrait démarre au tout début du clip (intro).",
};

export function normalizeSongStartMode(value: unknown): SongStartMode {
  if (value === 'beginning') return 'beginning';
  return SONG_START_MODE_DEFAULT;
}
