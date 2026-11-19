/** Homepage excerpt length. The same clip window is stored with the daily row. */
export const SONG_OF_THE_DAY_EXCERPT_SECONDS = 30;

export interface SongOfTheDaySong {
  id: number;
  title: string;
  artist: string;
  songType: 'OP' | 'ED';
  sequence: number;
  /** Same shape as the in-game reveal, e.g. "OP1". */
  typeLabel: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  animeId: number;
  animeTitle: string;
  seasonYear: number | null;
  season: string | null;
  format: string | null;
  episodeRange: string | null;
  coverImage: string | null;
  coverColor: string | null;
  siteUrl: string | null;
  franchise: string | null;
}

/** Public discovery card. `heard` is null for a guest. */
export interface SongOfTheDayResponse {
  challengeDate: string;
  resetsAt: string;
  excerptSeconds: number;
  heard: boolean | null;
  playbackUrl: string;
  videoStartTime: number;
  song: SongOfTheDaySong;
}

export interface SongOfTheDayHeardResponse {
  heard: true;
}
