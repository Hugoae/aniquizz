import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  LibraryBrowseParams,
  LibraryDifficulty,
  LibraryDiscoveredFilter,
  LibrarySort,
  LibrarySong,
  LibrarySongType,
} from '@aniquizz/shared';
import { libraryApi, LibraryApiError } from '@/lib/libraryApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { LibraryMetaResponse, LibraryTreeResponse } from '@aniquizz/shared';

const DEBOUNCE_MS = 300;
const SONG_TYPES: LibrarySongType[] = ['OP', 'ED', 'INSERT'];
const DIFFICULTIES: LibraryDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

const parseSort = (raw: string | null): LibrarySort | undefined => {
  if (
    raw === 'franchise' ||
    raw === 'franchise_desc' ||
    raw === 'popularity' ||
    raw === 'anime' ||
    raw === 'title'
  ) {
    return raw;
  }
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

export interface LibraryBrowseState {
  rawQuery: string;
  setRawQuery: (q: string) => void;
  songTypes: LibrarySongType[];
  toggleSongType: (t: LibrarySongType) => void;
  difficulties: LibraryDifficulty[];
  toggleDifficulty: (d: LibraryDifficulty) => void;
  discovered: LibraryDiscoveredFilter | '';
  setDiscovered: (d: LibraryDiscoveredFilter | '') => void;
  sort: LibrarySort;
  setSort: (s: LibrarySort) => void;
  page: number;
  setPage: (p: number) => void;
  songId: number | null;
  setSongId: (id: number | null) => void;
  meta: LibraryMetaResponse | null;
  tree: LibraryTreeResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
  deepLinkSong: LibrarySong | null;
}

export function useLibraryBrowse(): LibraryBrowseState {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

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
  const [sort, setSort] = useState<LibrarySort>(() => parseSort(searchParams.get('sort')) ?? 'franchise');
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
      sort,
      page,
      pageSize: query ? 24 : 20,
    }),
    [query, songTypes, difficulties, discovered, sort, page],
  );

  const setSongId = useCallback((id: number | null) => {
    setSongIdState(id);
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (songTypes.length) next.set('songType', songTypes.join(','));
    if (difficulties.length) next.set('difficulty', difficulties.join(','));
    if (discovered) next.set('discovered', discovered);
    if (sort !== 'franchise') next.set('sort', sort);
    if (page > 1) next.set('page', String(page));
    if (songId) next.set('songId', String(songId));
    setSearchParams(next, { replace: true });
  }, [query, songTypes, difficulties, discovered, sort, page, songId, setSearchParams]);

  useEffect(() => {
    if (!discovered || user) return;
    setDiscovered('');
  }, [discovered, user]);

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
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (hasLoadedOnce.current) setRefreshing(true);
    else setLoading(true);
    setError(null);

    libraryApi
      .tree(browseParams)
      .then((treeData) => {
        if (cancelled) return;
        setTree(treeData);
        hasLoadedOnce.current = true;
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof LibraryApiError ? e.message : 'Erreur réseau.');
        if (!hasLoadedOnce.current) setTree(null);
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
  }, [browseParams, fetchKey, user?.id]);

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

  const wrapSetSort = useCallback((s: LibrarySort) => {
    setSort(s);
    setPage(1);
  }, []);

  return {
    rawQuery,
    setRawQuery,
    songTypes,
    toggleSongType,
    difficulties,
    toggleDifficulty,
    discovered,
    setDiscovered: wrapSetDiscovered,
    sort,
    setSort: wrapSetSort,
    page,
    setPage,
    songId,
    setSongId,
    meta,
    tree,
    loading,
    refreshing,
    error,
    reload,
    deepLinkSong,
  };
}

export { parseSort };
