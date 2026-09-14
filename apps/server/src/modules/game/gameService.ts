import { Difficulty, SongType } from '@prisma/client';
import { prisma } from '@aniquizz/database';
import {
  shuffleArray,
  buildChoiceCandidatePool,
  selectedPoolSongTypes,
  collectArtistSearchLabels,
  answerIdentityKey,
  type ArtistChoiceRow,
  type Precision,
} from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import { playlistMembershipAnd } from './playlistQuery';

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
  /**
   * Frozen thematic-playlist snapshot ids. When set, every fetch pass stays inside
   * this set — including Watched fallback (rest of pack, never global catalogue).
   * Prefer `playlistIds` (relation filter) on the hot path; this remains for tests.
   */
  playlistSongIds?: number[];
  /**
   * Thematic playlist ids. Intersection is `AND` of membership (`thematicPlaylists.some`),
   * so Postgres never receives a thousands-long `id IN (...)`.
   */
  playlistIds?: string[];
  /** When true in Watched mode, missing rounds may be filled from the global catalogue. */
  allowWatchedFallback?: boolean;
  /** Cumulative song ids from prior matches in this lobby (excluded when possible). */
  excludePriorMatchSongIds?: number[];
  /** Artist precision: skip songs with no structured/playable credit. */
  requirePlayableArtist?: boolean;
}

/** Shape of a fully-selected song (Prisma Song + anime + franchise). */
export interface SelectedSong {
  id: number;
  title: string;
  artist: string;
  artistNames: string[];
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

// Difficulty cascade (hardest → easiest).
const DIFFICULTY_ORDER: Difficulty[] = [Difficulty.HARD, Difficulty.MEDIUM, Difficulty.EASY];

const buildSongWhere = (
  baseWhere: Record<string, unknown>,
  filters?: Pick<
    SongFilters,
    | 'difficulty'
    | 'types'
    | 'playlistSongIds'
    | 'playlistIds'
    | 'watchedIds'
    | 'requirePlayableArtist'
  >,
): Record<string, unknown> => {
  const where = { ...baseWhere };
  if (filters?.requirePlayableArtist) {
    where.artistNames = { isEmpty: false };
  }
  if (filters?.playlistIds?.length) {
    const membership = playlistMembershipAnd(filters.playlistIds);
    if (membership.length === 1) {
      Object.assign(where, membership[0]);
    } else {
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...existingAnd, ...membership];
    }
  } else if (filters?.playlistSongIds?.length) {
    where.id = { in: filters.playlistSongIds };
  }
  if (filters?.watchedIds?.length) {
    where.animeId = { in: filters.watchedIds };
  }
  if (filters?.types?.length) {
    const mapped = selectedPoolSongTypes(filters.types) ?? [];
    const songTypes: SongType[] = [];
    if (mapped.includes('opening')) songTypes.push(SongType.OP);
    if (mapped.includes('ending')) songTypes.push(SongType.ED);
    if (songTypes.length > 0) where.songType = { in: songTypes };
  }
  return where;
};

const isEmptyPlaylistConstraint = (
  filters?: Pick<SongFilters, 'playlistSongIds' | 'playlistIds'>,
): boolean =>
  Boolean(
    (filters?.playlistIds && filters.playlistIds.length === 0) ||
    (filters?.playlistSongIds && filters.playlistSongIds.length === 0),
  );

/**
 * Apply prior-pick exclusion without dropping a snapshot membership constraint.
 * Spreading `{ id: { notIn } }` over `{ id: { in } }` would escape the pack;
 * relation-filtered packs (`playlistIds`) use `notIn` alongside membership.
 */
const withExcludedSongIds = (
  where: Record<string, unknown>,
  excludedIds: number[],
): Record<string, unknown> | null => {
  const existingIn = (where.id as { in?: number[] } | undefined)?.in;
  if (existingIn) {
    const remaining = existingIn.filter((id) => !excludedIds.includes(id));
    if (!remaining.length) return null;
    return { ...where, id: { in: remaining } };
  }
  if (!excludedIds.length) return { ...where };
  return { ...where, id: { notIn: excludedIds } };
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
): Promise<{
  songs: SelectedSong[];
  fallbackUsed: boolean;
  priorMatchReuse: boolean;
  difficultyRelaxed: boolean;
}> => {
  const priorLobby = passOptions.priorLobbySongIds ?? [];
  const alsoExclude = passOptions.alsoExcludeIds ?? [];
  const finalSongs: SelectedSong[] = [];
  const excludedIds: number[] = [...new Set([...priorLobby, ...alsoExclude])];
  // Shared across every pass/cascade step so the same franchise is only picked
  // again once all others are exhausted (avoids the same anime twice per game).
  const usedFranchiseKeys = new Set<string>();
  let fallbackUsed = false;
  let difficultyRelaxed = false;

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

  let cascadeStep = 0;
  for (const difficulties of cascade) {
    if (finalSongs.length >= count) break;
    const beforeStep = finalSongs.length;
    const diffFilter = difficulties.length === 0 ? undefined : { in: difficulties };

    // Watched pool first (priority).
    if (isWatchedMode && finalSongs.length < count) {
      const remaining = count - finalSongs.length;
      const watchedBase: Record<string, unknown> = {
        ...baseWhere,
        animeId: { in: watchedIds },
      };
      if (diffFilter) watchedBase.difficulty = diffFilter;
      const watchedWhere = withExcludedSongIds(watchedBase, excludedIds);
      try {
        const candidates = watchedWhere ? await getCandidates(watchedWhere) : [];
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

    // Global (or rest-of-pack) completion — only when the host opted in (Watched mode).
    if (finalSongs.length < count && (!isWatchedMode || allowWatchedFallback)) {
      const remaining = count - finalSongs.length;
      const globalBase: Record<string, unknown> = { ...baseWhere };
      if (diffFilter) globalBase.difficulty = diffFilter;
      const globalWhere = withExcludedSongIds(globalBase, excludedIds);
      if (isWatchedMode) fallbackUsed = true;
      try {
        const candidates = globalWhere ? await getCandidates(globalWhere) : [];
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

    if (cascadeStep > 0 && finalSongs.length > beforeStep) {
      difficultyRelaxed = true;
    }
    cascadeStep += 1;
  }

  if (finalSongs.length < count) {
    logger.warn(
      `[GameService] Playlist under-filled. Requested: ${count}, got: ${finalSongs.length}`,
      'Service',
    );
  }

  // Uniform random round order; franchise diversity is already enforced at pick time.
  let songs = shuffleArray(finalSongs);
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
      songs = shuffleArray([...songs, ...retry.songs]);
      priorMatchReuse = true;
      difficultyRelaxed = difficultyRelaxed || retry.difficultyRelaxed;
      logger.info(
        `[GameService] Prior-match exclusion relaxed — reused ${retry.songs.length} song(s) from earlier lobby games.`,
        'Service',
      );
    }
  }

  return { songs, fallbackUsed, priorMatchReuse, difficultyRelaxed };
};

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

export const getRandomSongs = async (
  count: number,
  filters?: SongFilters,
): Promise<{
  songs: SelectedSong[];
  fallbackUsed: boolean;
  priorMatchReuse: boolean;
  difficultyRelaxed: boolean;
}> => {
  if (isEmptyPlaylistConstraint(filters)) {
    return { songs: [], fallbackUsed: false, priorMatchReuse: false, difficultyRelaxed: false };
  }
  const whereClause = buildSongWhere(
    { downloadStatus: 'COMPLETED' },
    {
      types: filters?.types,
      playlistSongIds: filters?.playlistSongIds,
      playlistIds: filters?.playlistIds,
      requirePlayableArtist: filters?.requirePlayableArtist,
    },
  );

  return fetchWithFallback(
    count,
    whereClause,
    filters?.watchedIds,
    filters?.difficulty,
    filters?.allowWatchedFallback ?? false,
    { priorLobbySongIds: filters?.excludePriorMatchSongIds },
  );
};

export const countPlayableSongs = async (
  filters: Pick<
    SongFilters,
    | 'difficulty'
    | 'types'
    | 'playlistSongIds'
    | 'playlistIds'
    | 'watchedIds'
    | 'requirePlayableArtist'
  >,
): Promise<number> => {
  if (isEmptyPlaylistConstraint(filters)) return 0;
  if (filters.watchedIds && filters.watchedIds.length === 0) return 0;
  const where = buildSongWhere({ downloadStatus: 'COMPLETED' }, filters);
  if (filters.difficulty?.length) {
    where.difficulty = { in: filters.difficulty.map(toDifficultyEnum) };
  }
  return prisma.song.count({ where });
};

/**
 * Count playable songs for watched anime ids (COMPLETED), with optional filters
 * aligned to playlist selection (types; difficulty uses any-of for a quick hint).
 */
export const countPlayableWatchedSongs = async (
  watchedIds: number[],
  filters?: Pick<SongFilters, 'difficulty' | 'types' | 'requirePlayableArtist'>,
): Promise<number> => countPlayableSongs({ ...filters, watchedIds });

export const countDistinctChoiceNames = async (
  precision: Precision,
  allowedAnimeIds: number[],
): Promise<number> => {
  if (!allowedAnimeIds.length) return 0;
  if (precision === 'artist') {
    const pool = await getArtistChoiceCandidates(allowedAnimeIds);
    return collectArtistSearchLabels(pool).length;
  }
  const pool = await getChoiceCandidates(precision, allowedAnimeIds);
  return pool.length;
};

export const countDistinctArtistCredits = async (
  filters: Pick<
    SongFilters,
    | 'difficulty'
    | 'types'
    | 'playlistSongIds'
    | 'playlistIds'
    | 'watchedIds'
    | 'requirePlayableArtist'
  >,
): Promise<number> => {
  if (isEmptyPlaylistConstraint(filters)) return 0;
  if (filters.watchedIds && filters.watchedIds.length === 0) return 0;
  const where = buildSongWhere(
    { downloadStatus: 'COMPLETED' },
    { ...filters, requirePlayableArtist: true },
  );
  if (filters.difficulty?.length) {
    where.difficulty = { in: filters.difficulty.map(toDifficultyEnum) };
  }
  const rows = await prisma.song.findMany({
    where,
    select: { artist: true, artistNames: true },
  });
  return collectArtistSearchLabels(rows).length;
};

export const listPlayableAnimeIds = async (
  filters: Pick<
    SongFilters,
    | 'difficulty'
    | 'types'
    | 'playlistSongIds'
    | 'playlistIds'
    | 'watchedIds'
    | 'requirePlayableArtist'
  >,
): Promise<number[]> => {
  if (isEmptyPlaylistConstraint(filters)) return [];
  if (filters.watchedIds && filters.watchedIds.length === 0) return [];
  const where = buildSongWhere({ downloadStatus: 'COMPLETED' }, filters);
  if (filters.difficulty?.length) {
    where.difficulty = { in: filters.difficulty.map(toDifficultyEnum) };
  }
  const rows = await prisma.song.findMany({
    where,
    select: { animeId: true },
    distinct: ['animeId'],
  });
  return rows.map((row) => row.animeId);
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
  allowedAnimeIds?: number[],
): Promise<string[]> => {
  if (precision === 'artist') {
    const rows = await getArtistChoiceCandidates(allowedAnimeIds);
    return collectArtistSearchLabels(rows);
  }
  if (allowedAnimeIds !== undefined) {
    return loadChoiceCandidates(precision, allowedAnimeIds);
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

interface ArtistSongRow extends ArtistChoiceRow {
  animeId: number;
}

interface ArtistRowsCacheEntry {
  timestamp: number;
  promise: Promise<ArtistSongRow[]>;
}

let artistRowsCache: ArtistRowsCacheEntry | null = null;

const loadAllArtistChoiceRows = async (): Promise<ArtistSongRow[]> => {
  const rows = await prisma.song.findMany({
    where: { downloadStatus: 'COMPLETED', artistNames: { isEmpty: false } },
    select: { artist: true, artistNames: true, animeId: true },
  });
  return rows.map((row) => ({
    artist: row.artist,
    artistNames: row.artistNames,
    animeId: row.animeId,
  }));
};

const getAllArtistChoiceRows = async (): Promise<ArtistSongRow[]> => {
  const now = Date.now();
  if (artistRowsCache && now - artistRowsCache.timestamp < CHOICE_CANDIDATES_TTL_MS) {
    return artistRowsCache.promise;
  }
  const promise = loadAllArtistChoiceRows().catch((error) => {
    artistRowsCache = null;
    throw error;
  });
  artistRowsCache = { timestamp: now, promise };
  return promise;
};

const dedupeArtistChoiceRows = (rows: ArtistSongRow[]): ArtistChoiceRow[] => {
  const byKey = new Map<string, ArtistChoiceRow>();
  for (const row of rows) {
    const key = answerIdentityKey(row.artist);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, { artist: row.artist, artistNames: row.artistNames });
  }
  return [...byKey.values()];
};

/** Deduped billed units for artist QCM/duo, optionally restricted to a song universe. */
export async function getArtistChoiceCandidates(
  allowedAnimeIds?: number[],
): Promise<ArtistChoiceRow[]> {
  const rows = await getAllArtistChoiceRows();
  if (allowedAnimeIds !== undefined) {
    const allowed = new Set(allowedAnimeIds);
    return dedupeArtistChoiceRows(rows.filter((row) => allowed.has(row.animeId)));
  }
  return dedupeArtistChoiceRows(rows);
}

/** Deduped billed units for client autocomplete. */
export async function getAllArtistSearchEntries(): Promise<
  { name: string; franchise: null; altNames: string[] }[]
> {
  const rows = await getAllArtistChoiceRows();
  return collectArtistSearchLabels(rows).map((name) => ({ name, franchise: null, altNames: [] }));
}

/** Invalidate autocomplete + QCM candidate caches (call after catalogue edits). */
export const invalidateChoiceCandidates = (): void => {
  choiceCandidatesCache.clear();
  animeNamesCache = null;
  artistRowsCache = null;
};

/**
 * Pre-warm the catalogue caches at boot so the first match start / first
 * autocomplete keystroke doesn't pay the full `anime` scan (Render cold start).
 * Best-effort and non-blocking.
 */
export const warmCatalogueCaches = async (): Promise<void> => {
  await Promise.all([
    getChoiceCandidates('franchise'),
    getChoiceCandidates('anime'),
    getAllArtistSearchEntries(),
  ]);
};
