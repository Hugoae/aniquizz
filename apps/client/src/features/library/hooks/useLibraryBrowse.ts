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
import { defaultSortForView, LIBRARY_SORTS_BY_VIEW } from '@aniquizz/shared';
import { libraryApi, LibraryApiError } from '@/lib/libraryApi';
import { useAuth } from '@/features/auth/context/AuthContext';

const DEBOUNCE_MS = 300;
const SONG_TYPES: LibrarySongType[] = ['OP', 'ED', 'INSERT'];
const DIFFICULTIES: LibraryDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

const parseSort = (raw: string | null): LibrarySort | undefined => {
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

const parseView = (raw: string | null): LibraryBrowseView | undefined => {
  if (raw === 'franchise' || raw === 'anime' || raw === 'songs') return raw;
  return undefined;
};

const parseSongTypes = (raw: string | null): LibrarySongType[] => {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((p) => p.trim().toUpperCase())
    .filter((p): p is LibrarySongType => SONG_TYPES.includes(p as LibrarySongType));
};

const parseDifficulties = (raw: string | null): LibraryDifficulty[] => {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((p) => p.trim().toUpperCase())
    .filter((p): p is LibraryDifficulty => DIFFICULTIES.includes(p as LibraryDifficulty));
};

const parseDiscovered = (raw: string | null): LibraryDiscoveredFilter | '' => {
  if (raw === 'heard' || raw === 'unheard') return raw;
  return '';
};

const parseLiked = (raw: string | null): LibraryLikedFilter | '' => {
  if (raw === 'liked' || raw === 'unliked') return raw;
  return '';
};

const isSortAllowed = (
  sort: LibrarySort,
  view: LibraryBrowseView,
  isAuthenticated: boolean,
): boolean => {
  if (!LIBRARY_SORTS_BY_VIEW[view].includes(sort)) return false;
  if (sort === 'liked_recent' && !isAuthenticated) return false;
  return true;
};

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
}

export function useLibraryBrowse(): LibraryBrowseState {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
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
  const [view, setViewState] = useState<LibraryBrowseView>(() => {
    if (parseLiked(searchParams.get('liked')) === 'liked') return 'songs';
    return parseView(searchParams.get('view')) ?? 'franchise';
  });
  const [sort, setSortState] = useState<LibrarySort>(() => {
    const fromUrl = parseSort(searchParams.get('sort'));
    const initialView =
      parseLiked(searchParams.get('liked')) === 'liked'
        ? 'songs'
        : (parseView(searchParams.get('view')) ?? 'franchise');
    if (fromUrl && isSortAllowed(fromUrl, initialView, !!user)) return fromUrl;
    return defaultSortForView(initialView);
  });
  const [page, setPage] = useState(() => {
    const p = Number(searchParams.get('page'));
    return Number.isFinite(p) && p >= 1 ? p : 1;
  });
  const [songId, setSongIdState] = useState<number | null>(() => {
    const id = Number(searchParams.get('songId'));
    return Number.isInteger(id) && id > 0 ? id : null;
  });

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
      setQuery(rawQuery.trim());
      setPage(1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const browseParams: LibraryBrowseParams = useMemo(
    () => ({
      q: query || undefined,
      songType: songTypes.length ? songTypes : undefined,
      difficulty: difficulties.length ? difficulties : undefined,
      discovered: discovered || undefined,
      liked: liked || undefined,
      sort,
      view,
      page,
      pageSize: view === 'songs' || query ? 24 : 20,
    }),
    [query, songTypes, difficulties, discovered, liked, sort, view, page],
  );

  const setSongId = useCallback((id: number | null) => {
    setSongIdState(id);
  }, []);

  const setView = useCallback(
    (next: LibraryBrowseView) => {
      setViewState(next);
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
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (songTypes.length) next.set('songType', songTypes.join(','));
    if (difficulties.length) next.set('difficulty', difficulties.join(','));
    if (discovered) next.set('discovered', discovered);
    if (liked) next.set('liked', liked);
    if (view !== 'franchise') next.set('view', view);
    if (sort !== defaultSortForView(view)) next.set('sort', sort);
    if (page > 1) next.set('page', String(page));
    if (songId) next.set('songId', String(songId));
    setSearchParams(next, { replace: true });
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
    setSearchParams,
  ]);

  useEffect(() => {
    if (!discovered || user) return;
    setDiscovered('');
  }, [discovered, user]);

  useEffect(() => {
    if (!liked || user) return;
    setLiked('');
  }, [liked, user]);

  useEffect(() => {
    if (sort === 'liked_recent' && !user) {
      setSortState(defaultSortForView(view));
    }
  }, [sort, user, view]);

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
        setError(e instanceof LibraryApiError ? e.message : 'Erreur réseau.');
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
  }, [browseParams, fetchKey, user?.id, view]);

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

  const wrapSetLiked = useCallback((d: LibraryLikedFilter | '') => {
    setLiked(d);
    setPage(1);
    if (d === 'liked') {
      setViewState('songs');
      // Favoris → Sons defaults to title A–Z (profile "voir tout" and filter toggle).
      setSortState(defaultSortForView('songs'));
    } else if (d === '') {
      setViewState('franchise');
      setSortState((prev) =>
        isSortAllowed(prev, 'franchise', !!user) ? prev : defaultSortForView('franchise'),
      );
    }
  }, [user]);

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
  };
}

export { parseSort, parseView, isSortAllowed };
