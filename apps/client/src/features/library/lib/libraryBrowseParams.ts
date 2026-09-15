import type {
  LibraryBrowseView,
  LibraryDifficulty,
  LibraryDiscoveredFilter,
  LibraryLikedFilter,
  LibrarySort,
  LibrarySongType,
} from '@aniquizz/shared';
import { defaultSortForView, LIBRARY_SORTS_BY_VIEW } from '@aniquizz/shared';

export const LIBRARY_SONG_TYPES: LibrarySongType[] = ['OP', 'ED', 'INSERT'];
const DIFFICULTIES: LibraryDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

export const parseSort = (raw: string | null): LibrarySort | undefined => {
  if (
    raw === 'franchise' ||
    raw === 'franchise_desc' ||
    raw === 'popularity' ||
    raw === 'anime' ||
    raw === 'title' ||
    raw === 'likes' ||
    raw === 'liked_recent'
  ) {
    return raw;
  }
  return undefined;
};

export const parseView = (raw: string | null): LibraryBrowseView | undefined => {
  if (raw === 'franchise' || raw === 'anime' || raw === 'songs') return raw;
  return undefined;
};

export const parseSongTypes = (raw: string | null): LibrarySongType[] => {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((p) => p.trim().toUpperCase())
    .filter((p): p is LibrarySongType => LIBRARY_SONG_TYPES.includes(p as LibrarySongType));
};

export const parseDifficulties = (raw: string | null): LibraryDifficulty[] => {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((p) => p.trim().toUpperCase())
    .filter((p): p is LibraryDifficulty => DIFFICULTIES.includes(p as LibraryDifficulty));
};

export const parseDiscovered = (raw: string | null): LibraryDiscoveredFilter | '' => {
  if (raw === 'heard' || raw === 'unheard') return raw;
  return '';
};

export const parseLiked = (raw: string | null): LibraryLikedFilter | '' => {
  if (raw === 'liked' || raw === 'unliked') return raw;
  return '';
};

export const parsePage = (raw: string | null): number => {
  const p = Number(raw);
  return Number.isFinite(p) && p >= 1 ? p : 1;
};

export const parseSongId = (raw: string | null): number | null => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const parseAnimeId = parseSongId;

/** URL view: explicit `view`, else liked-only, else an anime deep-link, else franchise. */
export const viewFromSearchParams = (sp: URLSearchParams): LibraryBrowseView => {
  if (parseLiked(sp.get('liked')) === 'liked') return 'songs';
  const view = parseView(sp.get('view'));
  if (view) return view;
  if (parseAnimeId(sp.get('animeId'))) return 'songs';
  return 'franchise';
};

export const isSortAllowed = (
  sort: LibrarySort,
  view: LibraryBrowseView,
  isAuthenticated: boolean,
): boolean => {
  if (!LIBRARY_SORTS_BY_VIEW[view].includes(sort)) return false;
  if (sort === 'liked_recent' && !isAuthenticated) return false;
  return true;
};

/** Debounced search: reset pagination only when the trimmed query actually changes. */
export const nextDebouncedLibraryQuery = (
  rawQuery: string,
  currentQuery: string,
): { query: string; resetPage: boolean } => {
  const query = rawQuery.trim();
  if (query === currentQuery) return { query: currentQuery, resetPage: false };
  return { query, resetPage: true };
};

export interface LibraryUrlState {
  query: string;
  songTypes: LibrarySongType[];
  difficulties: LibraryDifficulty[];
  discovered: LibraryDiscoveredFilter | '';
  liked: LibraryLikedFilter | '';
  view: LibraryBrowseView;
  sort: LibrarySort;
  page: number;
  songId: number | null;
  animeId: number | null;
}

export const buildLibrarySearchParams = (state: LibraryUrlState): URLSearchParams => {
  const next = new URLSearchParams();
  if (state.animeId) {
    next.set('animeId', String(state.animeId));
  } else if (state.query) {
    next.set('q', state.query);
  }
  if (state.songTypes.length) next.set('songType', state.songTypes.join(','));
  if (state.difficulties.length) next.set('difficulty', state.difficulties.join(','));
  if (state.discovered) next.set('discovered', state.discovered);
  if (state.liked) next.set('liked', state.liked);
  if (state.view !== 'franchise') next.set('view', state.view);
  if (state.sort !== defaultSortForView(state.view)) next.set('sort', state.sort);
  if (state.page > 1) next.set('page', String(state.page));
  if (state.songId) next.set('songId', String(state.songId));
  return next;
};

export const libraryPageHref = (state: LibraryUrlState, page: number): string => {
  const qs = buildLibrarySearchParams({ ...state, page }).toString();
  return qs ? `/library?${qs}` : '/library';
};

export const libraryAnimeSongsHref = (animeId: number): string =>
  `/library?view=songs&animeId=${animeId}`;
