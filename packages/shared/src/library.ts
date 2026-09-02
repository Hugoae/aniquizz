// Public music library browse contract (v26.2 / v26.4 views).

export type LibrarySongType = 'OP' | 'ED' | 'INSERT';
export type LibraryDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type LibrarySort =
  | 'franchise'
  | 'franchise_desc'
  | 'popularity'
  | 'anime'
  | 'title'
  | 'likes'
  | 'liked_recent';

/** UI browse layout (URL `view=`). Independent of server `LibraryTreeResponse.view`. */
export type LibraryBrowseView = 'franchise' | 'anime' | 'songs';

export interface LibraryAnimeRef {
  id: number;
  name: string;
  coverImage: string | null;
  coverColor: string | null;
  seasonYear: number | null;
  format: string | null;
  siteUrl: string | null;
  /** AniList popularity score. */
  popularity: number;
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
  /** Present when the caller is authenticated and liked this song. */
  liked?: boolean;
  /** Total users who liked this song (catalogue-wide). */
  likeCount: number;
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
  /** True when songs are the profile owner's pinned showcase selection. */
  curated?: boolean;
  /** Total liked songs for the profile owner (may exceed `songs.length`). */
  totalLikes?: number;
  /** False when the owner hid favorites from public viewers. */
  visible?: boolean;
  /** Owner setting: whether favorites appear on the public profile. */
  publicVisible?: boolean;
}

export interface LibraryMetaResponse {
  totalSongs: number;
  totalAnimes: number;
  totalFranchises: number;
  byType: Record<LibrarySongType, number>;
  byDifficulty: Record<LibraryDifficulty, number>;
  /** Present when the caller is authenticated. */
  likedCount?: number;
}

export type LibraryDiscoveredFilter = 'heard' | 'unheard';
export type LibraryLikedFilter = 'liked' | 'unliked';

export interface SongLikeToggleResponse {
  songId: number;
  liked: boolean;
}

export interface SongLikesIdsResponse {
  songIds: number[];
  total: number;
}

/** Ordered song ids pinned for profile showcase (max 10). */
export interface ProfilePinnedSongsResponse {
  songIds: number[];
}

export interface ProfilePinnedSongsInput {
  songIds: number[];
}

export interface LibraryBrowseParams {
  q?: string;
  songType?: LibrarySongType[];
  difficulty?: LibraryDifficulty[];
  franchiseId?: number;
  animeId?: number;
  sort?: LibrarySort;
  view?: LibraryBrowseView;
  /** Requires auth — filter songs the user has / has not heard in a match. */
  discovered?: LibraryDiscoveredFilter;
  /** Requires auth — filter songs the user liked / did not like. */
  liked?: LibraryLikedFilter;
  page?: number;
  pageSize?: number;
}

/** Anime node inside a franchise group (GET /library/tree) or anime browse. */
export interface LibraryAnimeGroup {
  id: number;
  name: string;
  coverImage: string | null;
  coverColor: string | null;
  seasonYear: number | null;
  format: string | null;
  siteUrl: string | null;
  popularity: number;
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

/** Paginated anime list (GET /library/animes). */
export interface LibraryAnimesResponse {
  animes: LibraryAnimeGroup[];
  pagination: LibraryPagination;
  totalSongs: number;
}

/** Sorts enabled per browse layout (client disables the rest). */
export const LIBRARY_SORTS_BY_VIEW: Record<LibraryBrowseView, readonly LibrarySort[]> = {
  franchise: ['franchise', 'franchise_desc', 'popularity'],
  anime: ['anime', 'popularity'],
  songs: ['title', 'anime', 'popularity', 'likes', 'liked_recent'],
};

export const defaultSortForView = (view: LibraryBrowseView): LibrarySort => {
  switch (view) {
    case 'anime':
      return 'anime';
    case 'songs':
      return 'title';
    default:
      return 'franchise';
  }
};
