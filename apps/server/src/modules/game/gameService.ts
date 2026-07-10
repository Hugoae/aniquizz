import { Difficulty, SongType } from '@prisma/client';
import { prisma } from '@aniquizz/database';
import { shuffleArray, buildChoiceCandidatePool, type Precision } from '@aniquizz/shared';
import { logger } from '../../utils/logger';

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
  /** Accepted song types (opening, ending). */
  types?: string[];
  /** Anime ids watched by the players (Watched mode). */
  watchedIds?: number[];
  /** When true in Watched mode, missing rounds may be filled from the global catalogue. */
  allowWatchedFallback?: boolean;
  /** Cumulative song ids from prior matches in this lobby (excluded when possible). */
  excludePriorMatchSongIds?: number[];
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

const candidateKey = (c: Candidate): string =>
  c.anime?.franchiseId ? `f-${c.anime.franchiseId}` : `a-${c.anime.name}`;

/**
 * Pick candidates while maximising franchise diversity (unbiased shuffle).
 * `usedKeys` is shared across cascade passes so a franchise already chosen in an
 * earlier pass (e.g. the Watched pool) is only reused once every distinct
 * franchise has been exhausted — i.e. the same anime never reappears unless we
 * genuinely run out of variety.
 */
const pickBestCandidates = (
  candidates: Candidate[],
  count: number,
  usedKeys: Set<string> = new Set<string>(),
): Candidate[] => {
  const pool = shuffleArray(candidates);

  const selected: Candidate[] = [];
  const leftovers: Candidate[] = [];

  // Pass 1: one song per franchise/anime for diversity.
  for (const c of pool) {
    const key = candidateKey(c);
    if (!usedKeys.has(key)) {
      selected.push(c);
      usedKeys.add(key);
    } else {
      leftovers.push(c);
    }
    if (selected.length >= count) break;
  }

  // Pass 2: only when a distinct franchise per slot isn't available — fill the
  // remaining slots with duplicates (we're out of variety).
  if (selected.length < count) {
    const needed = count - selected.length;
    selected.push(...shuffleArray(leftovers).slice(0, needed));
  }

  return selected.slice(0, count);
};

/**
 * Order the final playlist so the same anime/franchise never plays twice in a
 * row when it can be avoided. Greedy: at each step take the group with the most
 * songs left whose key differs from the one just placed. Two songs from the same
 * franchise become adjacent only if that franchise makes up more than half the
 * playlist (unavoidable — the pool has too little variety).
 */
const smartShuffle = <T extends { anime: { name: string; franchise: { name: string } | null } }>(
  songs: T[],
): T[] => {
  if (!songs || songs.length === 0) return [];

  const groups = new Map<string, T[]>();
  for (const song of songs) {
    const key = song.anime.franchise?.name || song.anime.name || 'Unknown';
    const bucket = groups.get(key);
    if (bucket) bucket.push(song);
    else groups.set(key, [song]);
  }

  const buckets = [...groups.entries()].map(([key, arr]) => ({ key, arr: shuffleArray(arr) }));

  const result: T[] = [];
  let lastKey: string | null = null;
  while (result.length < songs.length) {
    // Largest remaining group first keeps a dominant franchise spread out.
    buckets.sort((a, b) => b.arr.length - a.arr.length);
    let chosen = buckets.find((b) => b.arr.length > 0 && b.key !== lastKey);
    // Only the just-played group has songs left — adjacency is unavoidable.
    if (!chosen) chosen = buckets.find((b) => b.arr.length > 0);
    if (!chosen) break;
    result.push(chosen.arr.pop() as T);
    lastKey = chosen.key;
  }
  return result;
};

// Difficulty cascade (hardest → easiest).
const DIFFICULTY_ORDER: Difficulty[] = [Difficulty.HARD, Difficulty.MEDIUM, Difficulty.EASY];

const buildSongWhere = (
  baseWhere: Record<string, unknown>,
  filters?: Pick<SongFilters, 'difficulty' | 'types'>,
): Record<string, unknown> => {
  const where = { ...baseWhere };
  if (filters?.types?.length) {
    const songTypes: SongType[] = [];
    if (filters.types.includes('opening')) songTypes.push(SongType.OP);
    if (filters.types.includes('ending')) songTypes.push(SongType.ED);
    if (songTypes.length > 0) where.songType = { in: songTypes };
  }
  return where;
};

/** Options for a single fetch pass (lobby history + ids already picked this build). */
interface FetchSongsPassOptions {
  priorLobbySongIds?: number[];
  alsoExcludeIds?: number[];
}

/** Waterfall retrieval strategy: watched pool first, optional global completion. */
const fetchWithFallback = async (
  count: number,
  baseWhere: Record<string, unknown>,
  watchedIds?: number[],
  targetDifficulties: string[] = [],
  allowWatchedFallback = false,
  passOptions: FetchSongsPassOptions = {},
): Promise<{ songs: SelectedSong[]; fallbackUsed: boolean; priorMatchReuse: boolean }> => {
  const priorLobby = passOptions.priorLobbySongIds ?? [];
  const alsoExclude = passOptions.alsoExcludeIds ?? [];
  const finalSongs: SelectedSong[] = [];
  const excludedIds: number[] = [...new Set([...priorLobby, ...alsoExclude])];
  // Shared across every pass/cascade step so the same franchise is only picked
  // again once all others are exhausted (avoids the same anime twice per game).
  const usedFranchiseKeys = new Set<string>();
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
          const picked = await loadFull(
            pickBestCandidates(candidates, remaining, usedFranchiseKeys).map((s) => s.id),
          );
          finalSongs.push(...picked);
          excludedIds.push(...picked.map((s) => s.id));
        }
      } catch (e) {
        logger.error('[GameService] Watched cascade fetch failed', 'Service', e);
      }
    }

    // Global completion — only when the host opted in (Watched mode).
    if (finalSongs.length < count && (!isWatchedMode || allowWatchedFallback)) {
      const remaining = count - finalSongs.length;
      const globalWhere: Record<string, unknown> = { ...baseWhere, id: { notIn: excludedIds } };
      if (diffFilter) globalWhere.difficulty = diffFilter;
      if (isWatchedMode) fallbackUsed = true;
      try {
        const candidates = await getCandidates(globalWhere);
        if (candidates.length > 0) {
          const picked = await loadFull(
            pickBestCandidates(candidates, remaining, usedFranchiseKeys).map((s) => s.id),
          );
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

  let songs = smartShuffle(finalSongs);
  let priorMatchReuse = false;

  // Pool too small after excluding prior lobby matches — fill the gap without that constraint.
  if (songs.length < count && priorLobby.length > 0) {
    const retry = await fetchWithFallback(
      count - songs.length,
      baseWhere,
      watchedIds,
      targetDifficulties,
      allowWatchedFallback,
      { alsoExcludeIds: [...alsoExclude, ...songs.map((s) => s.id)] },
    );
    if (retry.songs.length > 0) {
      songs = smartShuffle([...songs, ...retry.songs]);
      priorMatchReuse = true;
      logger.info(
        `[GameService] Prior-match exclusion relaxed — reused ${retry.songs.length} song(s) from earlier lobby games.`,
        'Service',
      );
    }
  }

  return { songs, fallbackUsed, priorMatchReuse };
};

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

export const getRandomSongs = async (
  count: number,
  filters?: SongFilters,
): Promise<{ songs: SelectedSong[]; fallbackUsed: boolean; priorMatchReuse: boolean }> => {
  const whereClause = buildSongWhere({ downloadStatus: 'COMPLETED' }, filters);

  return fetchWithFallback(
    count,
    whereClause,
    filters?.watchedIds,
    filters?.difficulty,
    filters?.allowWatchedFallback ?? false,
    { priorLobbySongIds: filters?.excludePriorMatchSongIds },
  );
};

/**
 * Count playable songs for watched anime ids (COMPLETED), with optional filters
 * aligned to playlist selection (types; difficulty uses any-of for a quick hint).
 */
export const countPlayableWatchedSongs = async (
  watchedIds: number[],
  filters?: Pick<SongFilters, 'difficulty' | 'types'>,
): Promise<number> => {
  if (!watchedIds.length) return 0;
  const where = buildSongWhere(
    { downloadStatus: 'COMPLETED', animeId: { in: watchedIds } },
    filters,
  );
  if (filters?.difficulty?.length) {
    where.difficulty = { in: filters.difficulty.map(toDifficultyEnum) };
  }
  return prisma.song.count({ where });
};

// ---------------------------------------------------------------------------
// CATALOGUE NAME CACHE (shared by autocomplete + QCM choices)
// ---------------------------------------------------------------------------
// The set of anime/franchise names changes only on catalogue edits, so we cache
// it in memory. A SINGLE `anime` scan feeds both the autocomplete search and the
// QCM/duo choice pool — the heaviest constant DB cost of every match start.
// Promises are cached to collapse concurrent reads (parallel match starts).

const CHOICE_CANDIDATES_TTL_MS = 10 * 60 * 1000;

export interface AnimeNameRow {
  id: number;
  name: string;
  franchise: string | null;
  altNames: string[];
}

const loadAllAnimeNames = async (): Promise<AnimeNameRow[]> => {
  const animes = await prisma.anime.findMany({
    select: { id: true, name: true, altNames: true, franchise: { select: { name: true } } },
  });
  return animes.map((a) => ({
    id: a.id,
    name: a.name,
    franchise: a.franchise?.name || null,
    altNames: a.altNames,
  }));
};

interface AnimeNamesCacheEntry {
  timestamp: number;
  promise: Promise<AnimeNameRow[]>;
}

let animeNamesCache: AnimeNamesCacheEntry | null = null;

export const getAllAnimeNames = async (): Promise<AnimeNameRow[]> => {
  const now = Date.now();
  if (animeNamesCache && now - animeNamesCache.timestamp < CHOICE_CANDIDATES_TTL_MS) {
    return animeNamesCache.promise;
  }

  const promise = loadAllAnimeNames().catch((error) => {
    animeNamesCache = null;
    throw error;
  });
  animeNamesCache = { timestamp: now, promise };
  return promise;
};

/**
 * Deduped display-name pool for building QCM/duo choices. Derived from the shared
 * anime-name cache (no extra DB scan), then cached per precision so the dedup work
 * is done once per catalogue version. Pass `watchedIds` in AniList mode to restrict
 * distractors to the same list as the songs (not cached — filtered in memory).
 */
interface ChoiceCandidatesEntry {
  timestamp: number;
  promise: Promise<string[]>;
}

const choiceCandidatesCache = new Map<Precision, ChoiceCandidatesEntry>();

const loadChoiceCandidates = async (
  precision: Precision,
  watchedIds?: number[],
): Promise<string[]> => {
  const rows = await getAllAnimeNames();
  return buildChoiceCandidatePool(rows, precision, watchedIds);
};

export const getChoiceCandidates = async (
  precision: Precision,
  watchedIds?: number[],
): Promise<string[]> => {
  if (watchedIds?.length) {
    return loadChoiceCandidates(precision, watchedIds);
  }

  const now = Date.now();
  const cached = choiceCandidatesCache.get(precision);
  if (cached && now - cached.timestamp < CHOICE_CANDIDATES_TTL_MS) {
    return cached.promise;
  }

  const promise = loadChoiceCandidates(precision).catch((error) => {
    // Never poison the cache with a rejected promise: drop it so the next call retries.
    choiceCandidatesCache.delete(precision);
    throw error;
  });
  choiceCandidatesCache.set(precision, { timestamp: now, promise });
  return promise;
};

/** Invalidate autocomplete + QCM candidate caches (call after catalogue edits). */
export const invalidateChoiceCandidates = (): void => {
  choiceCandidatesCache.clear();
  animeNamesCache = null;
};

/**
 * Pre-warm the catalogue caches at boot so the first match start / first
 * autocomplete keystroke doesn't pay the full `anime` scan (Render cold start).
 * Best-effort and non-blocking.
 */
export const warmCatalogueCaches = async (): Promise<void> => {
  await Promise.all([getChoiceCandidates('franchise'), getChoiceCandidates('anime')]);
};
