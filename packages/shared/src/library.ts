// Public music library browse contract (v26.2).

export type LibrarySongType = 'OP' | 'ED' | 'INSERT';
export type LibraryDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type LibrarySort = 'franchise' | 'franchise_desc' | 'popularity' | 'anime' | 'title';

export interface LibraryAnimeRef {
  id: number;
  name: string;
  coverImage: string | null;
  coverColor: string | null;
  seasonYear: number | null;
  format: string | null;
  siteUrl: string | null;
}

export interface LibraryFranchiseRef {
  id: number;
  name: string;
  genres: string[];
}

/** Playable catalogue row exposed by GET /library/songs. */
export interface LibrarySong {
  id: number;
  title: string;
  artist: string;
  songType: LibrarySongType;
  sequence: number;
  videoKey: string;
  difficulty: LibraryDifficulty;
  episodeRange: string | null;
  duration: number | null;
  tags: string[];
  anime: LibraryAnimeRef;
  franchise: LibraryFranchiseRef | null;
  /** Present when the caller is authenticated and has heard this song in a match. */
  discovered?: boolean;
}

export interface LibraryPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface LibrarySongsResponse {
  songs: LibrarySong[];
  pagination: LibraryPagination;
}

export interface LibraryMetaResponse {
  totalSongs: number;
  totalAnimes: number;
  totalFranchises: number;
  byType: Record<LibrarySongType, number>;
  byDifficulty: Record<LibraryDifficulty, number>;
}

export type LibraryDiscoveredFilter = 'heard' | 'unheard';

export interface LibraryBrowseParams {
  q?: string;
  songType?: LibrarySongType[];
  difficulty?: LibraryDifficulty[];
  franchiseId?: number;
  animeId?: number;
  sort?: LibrarySort;
  /** Requires auth — filter songs the user has / has not heard in a match. */
  discovered?: LibraryDiscoveredFilter;
  page?: number;
  pageSize?: number;
}

/** Anime node inside a franchise group (GET /library/tree). */
export interface LibraryAnimeGroup {
  id: number;
  name: string;
  coverImage: string | null;
  coverColor: string | null;
  seasonYear: number | null;
  format: string | null;
  siteUrl: string | null;
  songs: LibrarySong[];
}

/** Franchise row in the hierarchical library browse view. */
export interface LibraryFranchiseGroup {
  /** null = virtual "Sans franchise" bucket. */
  id: number | null;
  name: string;
  genres: string[];
  animes: LibraryAnimeGroup[];
  songCount: number;
}

export interface LibraryTreeResponse {
  groups: LibraryFranchiseGroup[];
  pagination: LibraryPagination;
  /** Total playable songs matching the current filters (all pages). */
  totalSongs: number;
  /** `search` = flat song pagination regrouped for the tree UI when `q` is set. */
  view?: 'tree' | 'search';
}
