import {
  DAILY_GUESS_MS,
  DAILY_PRECISION,
  DAILY_REVEAL_MS,
  answerIdentityKey,
  formatSongTypeLabel,
  resolveRoundAnswerSet,
  type DailyRoundSnapshot,
} from '@aniquizz/shared';
import type { Rng } from './dailySelection';
import { pickDailyClipStart, shuffleWith } from './dailySelection';

const PLACEHOLDER = '???';

export interface DailySongRow {
  id: number;
  title: string;
  artist: string;
  artistNames: string[];
  songType: 'OP' | 'ED' | 'INSERT';
  sequence: number;
  videoKey: string;
  duration: number | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  episodeRange: string | null;
  anime: {
    id: number;
    name: string;
    altNames: string[];
    coverImage: string | null;
    coverColor: string | null;
    seasonYear: number | null;
    season: string | null;
    format: string | null;
    siteUrl: string | null;
    popularity: number;
    franchiseId: number | null;
    franchise: { id: number; name: string; genres: string[] } | null;
  };
}

/** Nested anime/franchise fields needed by `snapshotFromSong` / `toCandidate`. */
export const DAILY_ANIME_SELECT = {
  id: true,
  name: true,
  altNames: true,
  coverImage: true,
  coverColor: true,
  seasonYear: true,
  season: true,
  format: true,
  siteUrl: true,
  popularity: true,
  franchiseId: true,
  franchise: { select: { id: true, name: true, genres: true } },
} as const;

/** Slim song row — skips synopsis/banner and unused song columns on catalogue scans. */
export const DAILY_SONG_SELECT = {
  id: true,
  title: true,
  artist: true,
  artistNames: true,
  songType: true,
  sequence: true,
  videoKey: true,
  duration: true,
  difficulty: true,
  episodeRange: true,
  downloadStatus: true,
  anime: { select: DAILY_ANIME_SELECT },
} as const;

/** One-song lookups: nested select still avoids loading the full Franchise row. */
export const DAILY_SONG_INCLUDE = {
  anime: { select: DAILY_ANIME_SELECT },
} as const;

export function buildChoicesWithRng(
  correctTarget: string,
  pool: string[],
  rng: Rng,
  count = 4,
): string[] {
  const correctNorm = answerIdentityKey(correctTarget);
  const uniqueWrong = [
    ...new Set(
      pool.filter((name) => {
        if (!name) return false;
        const key = answerIdentityKey(name);
        return Boolean(key) && key !== correctNorm;
      }),
    ),
  ];
  const wrong = shuffleWith(uniqueWrong, rng).slice(0, count - 1);
  while (wrong.length < count - 1) wrong.push(PLACEHOLDER);
  return shuffleWith([...wrong, correctTarget], rng);
}

export function snapshotFromSong(
  song: DailySongRow,
  choicePool: string[],
  rng: Rng,
  guessDuration = DAILY_GUESS_MS / 1000,
): DailyRoundSnapshot {
  const franchise = song.anime.franchise?.name ?? null;
  const answers = resolveRoundAnswerSet({
    precision: DAILY_PRECISION,
    animeName: song.anime.name,
    altNames: song.anime.altNames,
    franchise,
    artist: song.artist,
    artistNames: song.artistNames ?? [],
  });
  const videoStartTime = pickDailyClipStart(
    song.duration,
    guessDuration,
    DAILY_REVEAL_MS / 1000,
    rng,
  );
  const choices = buildChoicesWithRng(answers.correctTarget, choicePool, rng, 4);
  const songType: 'OP' | 'ED' = song.songType === 'ED' ? 'ED' : 'OP';

  return {
    id: song.id,
    anime: song.anime.name,
    franchise,
    validAnswers: answers.validAnswers,
    title: song.title,
    artist: song.artist,
    typeLabel: formatSongTypeLabel(song.songType, song.sequence),
    difficulty: song.difficulty.toLowerCase(),
    videoKey: song.videoKey,
    videoStartTime,
    guessDuration,
    cover: song.anime.coverImage,
    animeId: song.anime.id,
    year: song.anime.seasonYear,
    season: song.anime.season,
    format: song.anime.format,
    episodeRange: song.episodeRange,
    coverColor: song.anime.coverColor,
    siteUrl: song.anime.siteUrl || `https://anilist.co/anime/${song.anime.id}`,
    tags: song.anime.franchise?.genres ?? [],
    choices,
    songType,
    franchiseId: song.anime.franchiseId,
    popularity: song.anime.popularity,
  };
}

/** Re-roll clip offset only — same guess + reveal + 2s tail as generation. */
export function withNewDailyClipStart(
  snapshot: DailyRoundSnapshot,
  duration: number | null,
  rng: Rng,
): DailyRoundSnapshot {
  let videoStartTime = pickDailyClipStart(
    duration,
    DAILY_GUESS_MS / 1000,
    DAILY_REVEAL_MS / 1000,
    rng,
  );
  for (let i = 0; i < 7 && videoStartTime === snapshot.videoStartTime; i += 1) {
    videoStartTime = pickDailyClipStart(
      duration,
      DAILY_GUESS_MS / 1000,
      DAILY_REVEAL_MS / 1000,
      rng,
    );
  }
  return { ...snapshot, videoStartTime };
}

export function parseDailySnapshot(raw: unknown): DailyRoundSnapshot {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Daily round snapshot is missing.');
  }
  return raw as DailyRoundSnapshot;
}

export function isoDayFromDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function dateFromIsoDay(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}
