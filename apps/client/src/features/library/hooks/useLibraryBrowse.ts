import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  LibraryAnimesResponse,
  LibraryBrowseParams,
  LibraryBrowseView,
  LibraryDifficulty,
  LibraryDiscoveredFilter,
  LibraryLikedFilter,
  LibraryMetaResponse,
  LibrarySort,
  LibrarySong,
  LibrarySongType,
  LibrarySongsResponse,
  LibraryTreeResponse,
} from '@aniquizz/shared';
import {
  defaultSortForView,
  LIBRARY_ANIME_SONGS_PAGE_SIZE,
  libraryBrowseNeedsActor,
} from '@aniquizz/shared';
import { libraryApi, LibraryApiError } from '@/lib/libraryApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';
import {
  buildLibrarySearchParams,
  isSortAllowed,
  libraryPageHref,
  nextDebouncedLibraryQuery,
  parseAnimeId,
  parseDifficulties,
  parseDiscovered,
  parseLiked,
  parsePage,
  parseSongId,
  parseSongTypes,
  parseSort,
  parseView,
  viewFromSearchParams,
} from '@/features/library/lib/libraryBrowseParams';

const DEBOUNCE_MS = 300;

export interface LibraryBrowseState {
  rawQuery: string;
  setRawQuery: (q: string) => void;
  songTypes: LibrarySongType[];
  toggleSongType: (t: LibrarySongType) => void;
  difficulties: LibraryDifficulty[];
  toggleDifficulty: (d: LibraryDifficulty) => void;
  discovered: LibraryDiscoveredFilter | '';
  setDiscovered: (d: LibraryDiscoveredFilter | '') => void;
  liked: LibraryLikedFilter | '';
  setLiked: (d: LibraryLikedFilter | '') => void;
  view: LibraryBrowseView;
  setView: (v: LibraryBrowseView) => void;
  sort: LibrarySort;
  setSort: (s: LibrarySort) => void;
  page: number;
  setPage: (p: number) => void;
  songId: number | null;
  setSongId: (id: number | null) => void;
  meta: LibraryMetaResponse | null;
  tree: LibraryTreeResponse | null;
  songs: LibrarySongsResponse | null;
  animes: LibraryAnimesResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
  deepLinkSong: LibrarySong | null;
  resultCount: number | null;
  totalPages: number;
  searchMode: boolean;
  pageHref: (page: number) => string;
}

export function useLibraryBrowse(): LibraryBrowseState {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, authReady } = useAuth();
  const isAuthenticated = !!user;

  const [rawQuery, setRawQuery] = useState(() => searchParams.get('q') ?? '');
  const [query, setQuery] = useState(() => searchParams.get('q')?.trim() ?? '');
  const [songTypes, setSongTypes] = useState<LibrarySongType[]>(() =>
    parseSongTypes(searchParams.get('songType')),
  );
  const [difficulties, setDifficulties] = useState<LibraryDifficulty[]>(() =>
    parseDifficulties(searchParams.get('difficulty')),
  );
  const [discovered, setDiscovered] = useState<LibraryDiscoveredFilter | ''>(() =>
    parseDiscovered(searchParams.get('discovered')),
  );
  const [liked, setLiked] = useState<LibraryLikedFilter | ''>(() =>
    parseLiked(searchParams.get('liked')),
  );
  const [view, setViewState] = useState<LibraryBrowseView>(() =>
    viewFromSearchParams(searchParams),
  );
  const [sort, setSortState] = useState<LibrarySort>(() => {
    const fromUrl = parseSort(searchParams.get('sort'));
    const initialView = viewFromSearchParams(searchParams);
    if (fromUrl && isSortAllowed(fromUrl, initialView, !!user)) return fromUrl;
    return defaultSortForView(initialView);
  });
  const [page, setPage] = useState(() => parsePage(searchParams.get('page')));
  const [songId, setSongIdState] = useState<number | null>(() =>
    parseSongId(searchParams.get('songId')),
  );
  const [animeId, setAnimeId] = useState<number | null>(() =>
    parseAnimeId(searchParams.get('animeId')),
  );

  const [meta, setMeta] = useState<LibraryMetaResponse | null>(null);
  const [tree, setTree] = useState<LibraryTreeResponse | null>(null);
  const [songs, setSongs] = useState<LibrarySongsResponse | null>(null);
  const [animes, setAnimes] = useState<LibraryAnimesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [deepLinkSong, setDeepLinkSong] = useState<LibrarySong | null>(null);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = nextDebouncedLibraryQuery(rawQuery, query);
      if (next.query !== query) setQuery(next.query);
      if (next.resetPage) {
        setPage(1);
        setAnimeId(null);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawQuery, query]);

  const browseParams: LibraryBrowseParams = useMemo(
    () => ({
      q: animeId ? undefined : query || undefined,
      animeId: animeId ?? undefined,
      songType: songTypes.length ? songTypes : undefined,
      difficulty: difficulties.length ? difficulties : undefined,
      discovered: discovered || undefined,
      liked: liked || undefined,
      sort,
      view,
      page,
      pageSize: animeId ? LIBRARY_ANIME_SONGS_PAGE_SIZE : view === 'songs' || query ? 24 : 20,
    }),
    [query, animeId, songTypes, difficulties, discovered, liked, sort, view, page],
  );

  const needsActor = libraryBrowseNeedsActor(browseParams);
  const waitForAuth = needsActor && !authReady;

  const setSongId = useCallback((id: number | null) => {
    setSongIdState(id);
  }, []);

  const setView = useCallback(
    (next: LibraryBrowseView) => {
      setViewState(next);
      if (next !== 'songs') setAnimeId(null);
      setSortState((prev) => {
        if (next === 'songs') return defaultSortForView('songs');
        return isSortAllowed(prev, next, isAuthenticated) ? prev : defaultSortForView(next);
      });
      setPage(1);
    },
    [isAuthenticated],
  );

  const setSort = useCallback((s: LibrarySort) => {
    setSortState(s);
    setPage(1);
  }, []);

  useEffect(() => {
    setSearchParams(
      buildLibrarySearchParams({
        query,
        songTypes,
        difficulties,
        discovered,
        liked,
        view,
        sort,
        page,
        songId,
        animeId,
      }),
      { replace: true },
    );
  }, [
    query,
    songTypes,
    difficulties,
    discovered,
    liked,
    view,
    sort,
    page,
    songId,
    animeId,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!authReady) return;
    if (!discovered || user) return;
    setDiscovered('');
  }, [discovered, user, authReady]);

  useEffect(() => {
    if (!authReady) return;
    if (!liked || user) return;
    setLiked('');
  }, [liked, user, authReady]);

  useEffect(() => {
    if (!authReady) return;
    if (sort === 'liked_recent' && !user) {
      setSortState(defaultSortForView(view));
    }
  }, [sort, user, view, authReady]);

  const reload = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    libraryApi
      .meta()
      .then((m) => {
        if (!cancelled) setMeta(m);
      })
      .catch(() => {
        /* meta is best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (waitForAuth) return;
    if (needsActor && !user?.id) return;

    let cancelled = false;
    if (hasLoadedOnce.current) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const run = async () => {
      if (view === 'songs') {
        const data = await libraryApi.songs(browseParams);
        if (cancelled) return;
        setSongs(data);
        setTree(null);
        setAnimes(null);
      } else if (view === 'anime') {
        const data = await libraryApi.animes(browseParams);
        if (cancelled) return;
        setAnimes(data);
        setTree(null);
        setSongs(null);
      } else {
        const data = await libraryApi.tree(browseParams);
        if (cancelled) return;
        setTree(data);
        setSongs(null);
        setAnimes(null);
      }
      hasLoadedOnce.current = true;
    };

    run()
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof LibraryApiError ? e.message : LIBRARY_COPY.networkError);
        if (!hasLoadedOnce.current) {
          setTree(null);
          setSongs(null);
          setAnimes(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [browseParams, fetchKey, user?.id, view, waitForAuth, needsActor]);

  useEffect(() => {
    if (!songId) {
      setDeepLinkSong(null);
      return;
    }
    let cancelled = false;
    libraryApi
      .song(songId)
      .then((song) => {
        if (!cancelled) setDeepLinkSong(song);
      })
      .catch(() => {
        if (!cancelled) setDeepLinkSong(null);
      });
    return () => {
      cancelled = true;
    };
  }, [songId, user?.id]);

  const toggleSongType = useCallback((t: LibrarySongType) => {
    setSongTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    setPage(1);
  }, []);

  const toggleDifficulty = useCallback((d: LibraryDifficulty) => {
    setDifficulties((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
    setPage(1);
  }, []);

  const wrapSetDiscovered = useCallback((d: LibraryDiscoveredFilter | '') => {
    setDiscovered(d);
    setPage(1);
  }, []);

  const wrapSetLiked = useCallback(
    (d: LibraryLikedFilter | '') => {
      setLiked(d);
      setPage(1);
      if (d === 'liked') {
        setViewState('songs');
        setSortState(defaultSortForView('songs'));
      } else if (d === '') {
        setViewState('franchise');
        setSortState((prev) =>
          isSortAllowed(prev, 'franchise', !!user) ? prev : defaultSortForView('franchise'),
        );
      }
    },
    [user],
  );

  const resultCount =
    view === 'songs'
      ? (songs?.pagination.totalItems ?? null)
      : view === 'anime'
        ? (animes?.totalSongs ?? null)
        : (tree?.totalSongs ?? null);

  const totalPages =
    view === 'songs'
      ? (songs?.pagination.totalPages ?? 1)
      : view === 'anime'
        ? (animes?.pagination.totalPages ?? 1)
        : (tree?.pagination.totalPages ?? 1);

  const searchMode = view === 'franchise' && tree?.view === 'search';

  const pageHref = useCallback(
    (nextPage: number) =>
      libraryPageHref(
        {
          query,
          songTypes,
          difficulties,
          discovered,
          liked,
          view,
          sort,
          page: nextPage,
          songId,
          animeId,
        },
        nextPage,
      ),
    [query, songTypes, difficulties, discovered, liked, view, sort, songId, animeId],
  );

  return {
    rawQuery,
    setRawQuery,
    songTypes,
    toggleSongType,
    difficulties,
    toggleDifficulty,
    discovered,
    setDiscovered: wrapSetDiscovered,
    liked,
    setLiked: wrapSetLiked,
    view,
    setView,
    sort,
    setSort,
    page,
    setPage,
    songId,
    setSongId,
    meta,
    tree,
    songs,
    animes,
    loading,
    refreshing,
    error,
    reload,
    deepLinkSong,
    resultCount,
    totalPages,
    searchMode,
    pageHref,
  };
}

export { isSortAllowed, parseSort, parseView };
