import { Difficulty, SongType } from '@prisma/client';
import { prisma } from '@aniquizz/database';
import { shuffleArray, type Precision } from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import { GAME_CONFIG } from '@aniquizz/shared';

const toDifficultyEnum = (value: string): Difficulty => {
  switch (value.toLowerCase()) {
    case 'easy':
      return Difficulty.EASY;
    case 'hard':
      return Difficulty.HARD;
    default:
      return Difficulty.MEDIUM;
  }
};

/** Filtering criteria for song selection. */
export interface SongFilters {
  /** Accepted difficulties (easy, medium, hard). */
  difficulty?: string[];
  /** Accepted song types (opening, ending, ost). */
  types?: string[];
  /** Specific playlist id (top-50, decades, genres...). */
  playlist?: string | null;
  /** Starting decade (e.g. "2010" for 2010-2019). */
  decade?: string;
  /** Anime ids watched by the players (Watched mode). */
  watchedIds?: number[];
}

/** Shape of a fully-selected song (Prisma Song + anime + franchise). */
export interface SelectedSong {
  id: number;
  title: string;
  artist: string;
  songType: SongType;
  sequence: number;
  videoKey: string;
  duration: number | null;
  difficulty: Difficulty;
  anime: {
    id: number;
    name: string;
    altNames: string[];
    coverImage: string | null;
    seasonYear: number | null;
    siteUrl: string | null;
    franchise: { name: string; genres: string[] } | null;
  };
}

// ---------------------------------------------------------------------------
// SELECTION & ORDERING (internal)
// ---------------------------------------------------------------------------

interface Candidate {
  id: number;
  anime: { name: string; franchiseId: number | null };
}

/** Pick candidates while maximising franchise diversity (unbiased shuffle). */
const pickBestCandidates = (candidates: Candidate[], count: number): Candidate[] => {
  const pool = shuffleArray(candidates);

  const selected: Candidate[] = [];
  const usedKeys = new Set<string>();
  const leftovers: Candidate[] = [];

  // Pass 1: one song per franchise/anime for diversity.
  for (const c of pool) {
    const key = c.anime?.franchiseId ? `f-${c.anime.franchiseId}` : `a-${c.anime.name}`;
    if (!usedKeys.has(key)) {
      selected.push(c);
      usedKeys.add(key);
    } else {
      leftovers.push(c);
    }
    if (selected.length >= count) break;
  }

  // Pass 2: fill remaining slots with duplicates.
  if (selected.length < count) {
    const needed = count - selected.length;
    selected.push(...shuffleArray(leftovers).slice(0, needed));
  }

  return selected.slice(0, count);
};

/** Order the final playlist so same-franchise songs are spread out. */
const smartShuffle = <T extends { anime: { name: string; franchise: { name: string } | null } }>(
  songs: T[],
): T[] => {
  if (!songs || songs.length === 0) return [];

  const groups: Record<string, T[]> = {};
  for (const song of songs) {
    const key = song.anime.franchise?.name || song.anime.name || 'Unknown';
    (groups[key] ??= []).push(song);
  }

  // Shuffle within each group, then order groups largest-first.
  Object.keys(groups).forEach((key) => {
    groups[key] = shuffleArray(groups[key]);
  });
  const sortedGroups = shuffleArray(Object.values(groups)).sort((a, b) => b.length - a.length);

  // Interleave.
  const result: T[] = [];
  const maxLen = sortedGroups[0].length;
  for (let i = 0; i < maxLen; i++) {
    for (const group of sortedGroups) {
      if (group[i]) result.push(group[i]);
    }
  }
  return result;
};

// Difficulty cascade (hardest → easiest).
const DIFFICULTY_ORDER: Difficulty[] = [Difficulty.HARD, Difficulty.MEDIUM, Difficulty.EASY];

/** Waterfall retrieval strategy: watched pool first, then global, cascading difficulty. */
const fetchWithFallback = async (
  count: number,
  baseWhere: Record<string, unknown>,
  watchedIds?: number[],
  targetDifficulties: string[] = [],
): Promise<{ songs: SelectedSong[]; fallbackUsed: boolean }> => {
  const finalSongs: SelectedSong[] = [];
  const excludedIds: number[] = [];
  let fallbackUsed = false;

  const isWatchedMode = Array.isArray(watchedIds) && watchedIds.length > 0;

  const getCandidates = (where: Record<string, unknown>): Promise<Candidate[]> =>
    prisma.song.findMany({
      where,
      select: { id: true, anime: { select: { name: true, franchiseId: true } } },
    });

  const loadFull = (ids: number[]): Promise<SelectedSong[]> =>
    prisma.song.findMany({
      where: { id: { in: ids } },
      include: { anime: { include: { franchise: true } } },
    }) as unknown as Promise<SelectedSong[]>;

  let cascade: Difficulty[][] = [];
  if (!targetDifficulties || targetDifficulties.length === 0) {
    cascade = [[]];
  } else {
    const mapped = [...new Set(targetDifficulties.map(toDifficultyEnum))];
    cascade.push(mapped);
    let lowestIndex = -1;
    mapped.forEach((d) => {
      const idx = DIFFICULTY_ORDER.indexOf(d);
      if (idx > lowestIndex) lowestIndex = idx;
    });
    if (lowestIndex !== -1) {
      for (let i = lowestIndex + 1; i < DIFFICULTY_ORDER.length; i++) {
        cascade.push([DIFFICULTY_ORDER[i]]);
      }
    }
  }

  for (const difficulties of cascade) {
    if (finalSongs.length >= count) break;
    const diffFilter = difficulties.length === 0 ? undefined : { in: difficulties };

    // Watched pool first (priority).
    if (isWatchedMode && finalSongs.length < count) {
      const remaining = count - finalSongs.length;
      const watchedWhere: Record<string, unknown> = {
        ...baseWhere,
        animeId: { in: watchedIds },
        id: { notIn: excludedIds },
      };
      if (diffFilter) watchedWhere.difficulty = diffFilter;
      try {
        const candidates = await getCandidates(watchedWhere);
        if (candidates.length > 0) {
          const picked = await loadFull(pickBestCandidates(candidates, remaining).map((s) => s.id));
          finalSongs.push(...picked);
          excludedIds.push(...picked.map((s) => s.id));
        }
      } catch (e) {
        logger.error('[GameService] Watched cascade fetch failed', 'Service', e);
      }
    }

    // Global random completion.
    if (finalSongs.length < count) {
      const remaining = count - finalSongs.length;
      const globalWhere: Record<string, unknown> = { ...baseWhere, id: { notIn: excludedIds } };
      if (diffFilter) globalWhere.difficulty = diffFilter;
      if (isWatchedMode) fallbackUsed = true;
      try {
        const candidates = await getCandidates(globalWhere);
        if (candidates.length > 0) {
          const picked = await loadFull(pickBestCandidates(candidates, remaining).map((s) => s.id));
          finalSongs.push(...picked);
          excludedIds.push(...picked.map((s) => s.id));
        }
      } catch (e) {
        logger.error('[GameService] Global cascade fetch failed', 'Service', e);
      }
    }
  }

  if (finalSongs.length < count) {
    logger.warn(
      `[GameService] Playlist under-filled. Requested: ${count}, got: ${finalSongs.length}`,
      'Service',
    );
  }

  return { songs: smartShuffle(finalSongs), fallbackUsed };
};

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

export const getRandomSongs = async (
  count: number,
  filters?: SongFilters,
): Promise<{ songs: SelectedSong[]; fallbackUsed: boolean }> => {
  // Only playable songs. Difficulty is applied per-cascade-step in fetchWithFallback.
  const whereClause: Record<string, unknown> = { downloadStatus: 'COMPLETED' };

  if (filters?.types?.length) {
    const songTypes: SongType[] = [];
    if (filters.types.includes('opening')) songTypes.push(SongType.OP);
    if (filters.types.includes('ending')) songTypes.push(SongType.ED);
    if (filters.types.includes('ost')) songTypes.push(SongType.INSERT);
    if (songTypes.length > 0) whereClause.songType = { in: songTypes };
  }

  if (filters?.playlist) {
    if (filters.playlist === 'top-50') {
      whereClause.anime = { popularity: { gte: 80 } };
    } else if (filters.playlist === 'decades' && filters.decade) {
      const s = parseInt(filters.decade, 10);
      if (!isNaN(s)) whereClause.anime = { seasonYear: { gte: s, lt: s + 10 } };
    } else {
      const targetPlaylist = GAME_CONFIG.PLAYLISTS.find((p) => p.id === filters.playlist);
      if (targetPlaylist?.dbValues?.length) {
        whereClause.anime = { franchise: { genres: { hasSome: targetPlaylist.dbValues } } };
      }
    }
  }

  return fetchWithFallback(count, whereClause, filters?.watchedIds, filters?.difficulty);
};

/**
 * Random pool of candidate display names used to build QCM/duo choices.
 * Fetched ONCE per match; choices are then assembled in memory (see PlaylistBuilder).
 */
export const getChoiceCandidates = async (
  precision: Precision,
  filters?: Pick<SongFilters, 'playlist' | 'decade'>,
): Promise<string[]> => {
  const where: Record<string, unknown> = {};
  if (filters?.playlist === 'decades' && filters?.decade) {
    const s = parseInt(filters.decade, 10);
    if (!isNaN(s)) where.seasonYear = { gte: s, lt: s + 10 };
  }

  const select = { name: true, franchise: { select: { name: true } } };
  let animes = await prisma.anime.findMany({ where, select });

  // Fallback when the filter is too narrow to build 4-way choices.
  if (animes.length < 4) {
    animes = await prisma.anime.findMany({ select });
  }

  const names = animes.map((a) => (precision === 'franchise' ? a.franchise?.name || a.name : a.name));
  return [...new Set(names)];
};

export const getAllAnimeNames = async () => {
  const animes = await prisma.anime.findMany({
    select: { name: true, altNames: true, franchise: { select: { name: true } } },
  });
  return animes.map((a) => ({
    name: a.name,
    franchise: a.franchise?.name || null,
    altNames: a.altNames,
  }));
};
