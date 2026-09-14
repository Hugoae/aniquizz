// packages/shared/src/playlist.ts
// Staff thematic-playlist recipes and membership — pure, no I/O.
// Year is the song's anime `seasonYear`, not the franchise origin year.

import type { WatchedPoolStats } from './watchedPool';
import { isWatchedPoolInsufficient } from './watchedPool';
import { normalizePrecision } from './precision';

export const MIN_QCM_DISTINCT_NAMES = 4;

export type PlaylistCategory = 'genre' | 'tag' | 'decade' | 'format' | 'theme';

export type PlaylistSongType = 'OP' | 'ED';
export type PlaylistDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

/** Versioned recipe stored as JSON on ThematicPlaylist. Empty arrays = no constraint. */
export interface PlaylistRecipe {
  genres?: string[];
  tags?: string[];
  yearMin?: number;
  yearMax?: number;
  formats?: string[];
  songTypes?: PlaylistSongType[];
  difficulties?: PlaylistDifficulty[];
  includeSongIds?: number[];
  excludeSongIds?: number[];
}

const sortedCopy = (values: string[] | undefined): string[] => [...(values ?? [])].sort();

const sortedIds = (values: number[] | undefined): number[] =>
  [...(values ?? [])].sort((a, b) => a - b);

/** Stable equality so a re-save with shuffled arrays does not look like a new recipe. */
export const recipesAreEqual = (a: PlaylistRecipe, b: PlaylistRecipe): boolean =>
  JSON.stringify({
    genres: sortedCopy(a.genres),
    tags: sortedCopy(a.tags),
    formats: sortedCopy(a.formats),
    songTypes: sortedCopy(a.songTypes),
    difficulties: sortedCopy(a.difficulties),
    yearMin: a.yearMin ?? null,
    yearMax: a.yearMax ?? null,
    includeSongIds: sortedIds(a.includeSongIds),
    excludeSongIds: sortedIds(a.excludeSongIds),
  }) ===
  JSON.stringify({
    genres: sortedCopy(b.genres),
    tags: sortedCopy(b.tags),
    formats: sortedCopy(b.formats),
    songTypes: sortedCopy(b.songTypes),
    difficulties: sortedCopy(b.difficulties),
    yearMin: b.yearMin ?? null,
    yearMax: b.yearMax ?? null,
    includeSongIds: sortedIds(b.includeSongIds),
    excludeSongIds: sortedIds(b.excludeSongIds),
  });

/**
 * Publish flag for an admin upsert. A recipe edit always unpublishes so public chips
 * cannot advertise a snapshot that was frozen against a previous recipe.
 */
export const nextPlaylistPublishState = (input: {
  previousRecipe: PlaylistRecipe;
  nextRecipe: PlaylistRecipe;
  requestedPublish?: boolean;
  snapshotCount: number;
}): { isPublished?: boolean } => {
  if (!recipesAreEqual(input.previousRecipe, input.nextRecipe)) {
    return { isPublished: false };
  }
  if (input.requestedPublish === undefined) return {};
  if (input.requestedPublish && input.snapshotCount <= 0) return { isPublished: false };
  return { isPublished: input.requestedPublish };
};

/** Admin recipe caps — keep Zod and parsers aligned. */
export const PLAYLIST_RECIPE_LIMITS = {
  stringMax: 40,
  genres: 20,
  tags: 30,
  formats: 10,
  songTypes: 2,
  difficulties: 3,
  includeSongIds: 500,
  excludeSongIds: 500,
} as const;

export const PLAYLIST_UNAVAILABLE_REASON = "Cette playlist n'est plus disponible.";

/** Exclude-only or `{}` would resolve to the whole COMPLETED catalogue. */
export const recipeHasPositiveConstraint = (recipe: PlaylistRecipe): boolean =>
  Boolean(
    recipe.genres?.length ||
      recipe.tags?.length ||
      recipe.formats?.length ||
      recipe.songTypes?.length ||
      recipe.difficulties?.length ||
      recipe.includeSongIds?.length ||
      recipe.yearMin != null ||
      recipe.yearMax != null,
  );

export const recipeYearRangeIsValid = (recipe: PlaylistRecipe): boolean =>
  recipe.yearMin == null || recipe.yearMax == null || recipe.yearMin <= recipe.yearMax;

/** Persist genre pack and decade overlay separately (intersection must not collapse). */
export const matchPlaylistPersistence = (settings: {
  soundSelection?: string;
  playlistId?: string | null;
  decadePlaylistId?: string | null;
}): { playlistId: string | null; decadePlaylistId: string | null } => {
  if (settings.soundSelection !== 'playlist') {
    return { playlistId: null, decadePlaylistId: null };
  }
  return {
    playlistId: settings.playlistId ?? null,
    decadePlaylistId: settings.decadePlaylistId ?? null,
  };
};

export const publishedPlaylistSourceError = (
  requestedIds: string[],
  packs: Array<{ id: string; isPublished: boolean; snapshotCount: number }>,
): string | null => {
  const byId = new Map(packs.map((pack) => [pack.id, pack]));
  for (const id of requestedIds) {
    const pack = byId.get(id);
    if (!pack || !pack.isPublished || pack.snapshotCount <= 0) {
      return PLAYLIST_UNAVAILABLE_REASON;
    }
  }
  return null;
};

/** Stale count for combined packs: primary snapshot only (summing overlays double-counts). */
export const primaryPackStaleDropped = (
  packs: Array<{ snapshotCount: number; liveCompleted: number }>,
): number => {
  const primary = packs[0];
  if (!primary) return 0;
  return Math.max(0, primary.snapshotCount - primary.liveCompleted);
};

/** Minimal song row for membership tests / preview without Prisma. */
export interface PlaylistMembershipSong {
  id: number;
  downloadStatus: string;
  tags: string[];
  songType: string;
  difficulty: string;
  anime: {
    seasonYear: number | null;
    format: string | null;
    franchise: { genres: string[] } | null;
  };
}

export interface ThematicPlaylistSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: PlaylistCategory;
  snapshotCount: number;
  snapshotAt: string | null;
  sortOrder: number;
  /** Short labels for the picker chips (genres, tags, decade, format…). */
  chips: string[];
}

/** Live pool stats for a playlist source (optional Watched overlay). */
export interface PlaylistPoolStats {
  /** Pack ± optional decade overlay (snapshot intersection). */
  playlistId: string;
  decadePlaylistId?: string;
  /** Frozen snapshot size at last publish (includes later-stale rows). */
  snapshotCount: number;
  /** COMPLETED snapshot songs matching OP/ED + difficulty (before Watched). */
  filteredCount: number;
  /** Playable songs after Watched overlay (equals filteredCount when overlay is off). */
  playableSongs: number;
  animeCount: number;
  distinctNames: number;
  soundCount: number;
  /** playableSongs < soundCount — overlay too small unless fallback fills from the pack. */
  insufficient: boolean;
  /** filteredCount < soundCount — pack itself cannot fill the match. */
  packInsufficient: boolean;
  /** Snapshot rows skipped because the song is no longer COMPLETED. */
  staleDropped: number;
  playlistWatched: boolean;
  watchedMode?: 'union' | 'intersection';
  /**
   * Overlay Watched hit an AniList GraphQL failure (same as Watched pool stats).
   * Playable songs may still come from a last-success cache (`stale`).
   */
  listError?: 'anilist_blocked';
  /** Echoed from `playlist:get_pool_stats` so the client can drop stale replies. */
  requestId?: number;
}

/** Live pool for random / mix source (catalogue + OP/ED + difficulty). */
export interface CataloguePoolStats {
  playableSongs: number;
  animeCount: number;
  soundCount: number;
  /** Echoed from `catalogue:get_pool_stats` so the client can drop stale replies. */
  requestId?: number;
}

export const hasEnoughQcmNames = (distinctNames: number, responseType: string): boolean =>
  responseType === 'typing' || distinctNames >= MIN_QCM_DISTINCT_NAMES;

export const qcmPoolTooSmallReason = (precision?: unknown): string => {
  if (normalizePrecision(precision) === 'artist') {
    return (
      'Pas assez d\'artistes distincts dans ce pool pour le QCM (il en faut au moins 4). ' +
      'Passez en Typing ou élargissez les filtres.'
    );
  }
  return (
    'Pas assez d\'animes distincts dans ce pool pour le QCM (il en faut au moins 4). ' +
    'Passez en Typing ou élargissez les filtres.'
  );
};

const hasSome = (haystack: string[], needles: string[] | undefined): boolean => {
  if (!needles?.length) return true;
  const set = new Set(haystack);
  return needles.some((needle) => set.has(needle));
};

const yearMatches = (seasonYear: number | null, recipe: PlaylistRecipe): boolean => {
  if (recipe.yearMin == null && recipe.yearMax == null) return true;
  if (seasonYear == null) return false;
  if (recipe.yearMin != null && seasonYear < recipe.yearMin) return false;
  if (recipe.yearMax != null && seasonYear > recipe.yearMax) return false;
  return true;
};

/** True when every non-empty recipe dimension matches (excludes include/exclude). */
export const songMatchesRecipeDimensions = (
  song: PlaylistMembershipSong,
  recipe: PlaylistRecipe,
): boolean => {
  if (!hasSome(song.anime.franchise?.genres ?? [], recipe.genres)) return false;
  if (!hasSome(song.tags, recipe.tags)) return false;
  if (!yearMatches(song.anime.seasonYear, recipe)) return false;
  if (!hasSome(song.anime.format ? [song.anime.format] : [], recipe.formats)) return false;
  if (!hasSome([song.songType], recipe.songTypes)) return false;
  if (!hasSome([song.difficulty], recipe.difficulties)) return false;
  return true;
};

/**
 * Resolve membership: (dimensions OR includeSongIds) AND NOT excludeSongIds AND COMPLETED.
 * Include ids still require COMPLETED. Exclude always wins.
 */
export const resolveRecipeMembership = (
  songs: PlaylistMembershipSong[],
  recipe: PlaylistRecipe,
): number[] => {
  const include = new Set(recipe.includeSongIds ?? []);
  const exclude = new Set(recipe.excludeSongIds ?? []);
  const ids: number[] = [];

  for (const song of songs) {
    if (exclude.has(song.id)) continue;
    if (song.downloadStatus !== 'COMPLETED') continue;
    if (include.has(song.id) || songMatchesRecipeDimensions(song, recipe)) {
      ids.push(song.id);
    }
  }

  return ids;
};

const FORMAT_CHIP_LABELS: Record<string, string> = {
  MOVIE: 'Film',
  TV: 'TV',
  OVA: 'OVA',
  ONA: 'ONA',
  SPECIAL: 'Spécial',
  TV_SHORT: 'Court',
};

const DIFFICULTY_CHIP_LABELS: Record<string, string> = {
  EASY: 'Facile',
  MEDIUM: 'Moyen',
  HARD: 'Difficile',
};

/** Compact picker chips from a recipe — no category taxonomy, no song counts. */
export const playlistChipsFromRecipe = (recipe: PlaylistRecipe): string[] => {
  const chips: string[] = [];
  for (const tag of recipe.tags ?? []) chips.push(tag);
  for (const genre of recipe.genres ?? []) chips.push(genre);
  if (recipe.yearMin != null && recipe.yearMax != null) {
    chips.push(
      recipe.yearMin === recipe.yearMax ? String(recipe.yearMin) : `${recipe.yearMin}–${recipe.yearMax}`,
    );
  } else if (recipe.yearMin != null) {
    chips.push(`≥ ${recipe.yearMin}`);
  } else if (recipe.yearMax != null) {
    chips.push(`≤ ${recipe.yearMax}`);
  }
  for (const format of recipe.formats ?? []) {
    chips.push(FORMAT_CHIP_LABELS[format] ?? format);
  }
  for (const difficulty of recipe.difficulties ?? []) {
    chips.push(DIFFICULTY_CHIP_LABELS[difficulty] ?? difficulty);
  }
  return chips;
};

export interface PlaylistSourceIds {
  playlistId?: string | null;
  decadePlaylistId?: string | null;
}

/** Unique playlist ids to resolve (genre pack + optional decade overlay). */
export function playlistSourceIds(input: PlaylistSourceIds): string[] {
  const ids: string[] = [];
  if (input.playlistId) ids.push(input.playlistId);
  if (input.decadePlaylistId && input.decadePlaylistId !== input.playlistId) {
    ids.push(input.decadePlaylistId);
  }
  return ids;
}

export function hasPlaylistSource(input: PlaylistSourceIds): boolean {
  return playlistSourceIds(input).length > 0;
}

export function playlistSourceDisplayName(
  packs: Array<{ id: string; name: string }>,
  ids: PlaylistSourceIds,
): string | undefined {
  const names = playlistSourceIds(ids)
    .map((id) => packs.find((pack) => pack.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length ? names.join(' ∩ ') : undefined;
}

/** Intersection of snapshot song ids (combine decade × other pack). */
export function intersectPlaylistSongIds(sets: number[][]): number[] {
  if (!sets.length) return [];
  return sets.reduce((acc, next) => {
    const keep = new Set(next);
    return acc.filter((id) => keep.has(id));
  }, [...new Set(sets[0])]);
}

export const withPlaylistPoolSoundCount = (
  stats: PlaylistPoolStats | null | undefined,
  soundCount: number | undefined,
): PlaylistPoolStats | null | undefined => {
  if (!stats || soundCount == null || stats.soundCount === soundCount) return stats;
  return {
    ...stats,
    soundCount,
    insufficient: isWatchedPoolInsufficient(stats.playableSongs, soundCount),
    packInsufficient: isWatchedPoolInsufficient(stats.filteredCount, soundCount),
  };
};

/** Reuse Watched banner math when a playlist overlay is treated like a watched pool. */
export const toWatchedPoolStatsView = (
  stats: PlaylistPoolStats,
): WatchedPoolStats => ({
  animeCount: stats.animeCount,
  playableSongs: stats.playableSongs,
  soundCount: stats.soundCount,
  insufficient: stats.insufficient,
  watchedMode: stats.watchedMode,
  listError: stats.listError,
});
