import { Difficulty } from '@prisma/client';
import { normalizePipelineSong, parsePipelineDifficulty } from './song-helpers';

export type PipelineDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface OpeningRef {
  sequence: number;
  difficulty: string;
}

export interface EndingDifficultyInput {
  sequence: number;
  sameAnimeOpenings: OpeningRef[];
  franchiseOpenings: OpeningRef[];
}

export type EndingDifficultySource = 'same-sequence' | 'same-anime' | 'franchise';

export interface EndingDifficultyChange {
  songId?: number;
  title: string;
  animeName: string;
  franchiseName: string;
  from: PipelineDifficulty;
  to: PipelineDifficulty;
  source: EndingDifficultySource;
}

export interface RecalibrateEndingReport {
  changed: EndingDifficultyChange[];
  unchanged: number;
  skippedNoOpening: number;
}

const RANK: Record<PipelineDifficulty, number> = {
  EASY: 0,
  MEDIUM: 1,
  HARD: 2,
};

const FROM_RANK: PipelineDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

export const toPipelineDifficulty = (value?: string | null): PipelineDifficulty | null => {
  if (!value) return null;
  switch (parsePipelineDifficulty(value)) {
    case Difficulty.EASY:
      return 'EASY';
    case Difficulty.HARD:
      return 'HARD';
    default:
      return 'MEDIUM';
  }
};

export const medianDifficulty = (values: string[]): PipelineDifficulty | null => {
  const ranks = values
    .map((value) => toPipelineDifficulty(value))
    .filter((value): value is PipelineDifficulty => value != null)
    .map((value) => RANK[value])
    .sort((a, b) => a - b);
  if (!ranks.length) return null;
  const mid = (ranks.length - 1) / 2;
  const averaged = (ranks[Math.floor(mid)] + ranks[Math.ceil(mid)]) / 2;
  return FROM_RANK[Math.round(averaged)] ?? null;
};

export const openingsFromSongs = (
  songs:
    Array<{ songType?: string; type?: string; sequence?: number; difficulty?: string }> | undefined,
): OpeningRef[] => {
  if (!songs?.length) return [];
  return songs
    .filter((song) => normalizePipelineSong(song).songType === 'OP')
    .map((song) => ({
      sequence: normalizePipelineSong(song).sequence,
      difficulty: song.difficulty ?? 'MEDIUM',
    }));
};

export const resolveEndingDifficulty = (input: EndingDifficultyInput): PipelineDifficulty | null =>
  resolveEndingDifficultyWithSource(input)?.difficulty ?? null;

export const resolveEndingDifficultyWithSource = (
  input: EndingDifficultyInput,
): { difficulty: PipelineDifficulty; source: EndingDifficultySource } | null => {
  const sameSequence = input.sameAnimeOpenings.find(
    (opening) => opening.sequence === input.sequence,
  );
  if (sameSequence) {
    const difficulty = toPipelineDifficulty(sameSequence.difficulty);
    return difficulty ? { difficulty, source: 'same-sequence' } : null;
  }
  const seasonMedian = medianDifficulty(
    input.sameAnimeOpenings.map((opening) => opening.difficulty),
  );
  if (seasonMedian) return { difficulty: seasonMedian, source: 'same-anime' };
  const franchiseMedian = medianDifficulty(
    input.franchiseOpenings.map((opening) => opening.difficulty),
  );
  if (franchiseMedian) return { difficulty: franchiseMedian, source: 'franchise' };
  return null;
};

type PipelineSong = {
  id?: number;
  title?: string;
  songType?: string;
  type?: string;
  sequence?: number;
  difficulty?: string;
};

type PipelineAnime = {
  name?: string;
  songs?: PipelineSong[];
};

type PipelineFranchise = {
  name?: string;
  franchiseName?: string;
  animes?: PipelineAnime[];
};

const franchiseLabel = (franchise: PipelineFranchise): string =>
  franchise.name || franchise.franchiseName || 'Unknown franchise';

/** Mutates ending `difficulty` in place to match openings (same season, else franchise). */
export const recalibrateEndingDifficulties = (
  franchises: PipelineFranchise[],
): RecalibrateEndingReport => {
  const report: RecalibrateEndingReport = { changed: [], unchanged: 0, skippedNoOpening: 0 };

  for (const franchise of franchises) {
    const animes = franchise.animes ?? [];
    const franchiseOpenings = animes.flatMap((anime) => openingsFromSongs(anime.songs));

    for (const anime of animes) {
      const sameAnimeOpenings = openingsFromSongs(anime.songs);
      for (const song of anime.songs ?? []) {
        if (normalizePipelineSong(song).songType !== 'ED') continue;
        const from = toPipelineDifficulty(song.difficulty) ?? 'MEDIUM';
        const resolved = resolveEndingDifficultyWithSource({
          sequence: normalizePipelineSong(song).sequence,
          sameAnimeOpenings,
          franchiseOpenings,
        });
        if (!resolved) {
          report.skippedNoOpening += 1;
          continue;
        }
        if (resolved.difficulty === from) {
          report.unchanged += 1;
          continue;
        }
        song.difficulty = resolved.difficulty;
        report.changed.push({
          songId: song.id,
          title: song.title ?? 'Unknown Title',
          animeName: anime.name ?? 'Unknown anime',
          franchiseName: franchiseLabel(franchise),
          from,
          to: resolved.difficulty,
          source: resolved.source,
        });
      }
    }
  }

  return report;
};

export const difficultyToPipelineJson = (value: PipelineDifficulty): string => value.toLowerCase();
