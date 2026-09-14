import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { LibrarySong } from '@aniquizz/shared';
import { libraryApi, LibraryApiError } from '@/lib/libraryApi';
import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';
import {
  addPinnedSong,
  movePinnedSong,
  removePinnedSong,
} from '@/features/profile/lib/pinnedFavoritesOrder';

export const MAX_PINNED = 5;
const BROWSE_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const PROFILE_VISIBILITY_ACK_TIMEOUT_MS = 8_000;

interface UsePinnedFavoritesDialogArgs {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onPublicVisibleChange: (visible: boolean) => void;
}

export function usePinnedFavoritesDialog({
  open,
  onOpenChange,
  onSaved,
  onPublicVisibleChange,
}: UsePinnedFavoritesDialogArgs) {
  const { refreshProfile } = useAuth();
  const [songCatalog, setSongCatalog] = useState<Map<number, LibrarySong>>(new Map());
  const [browseSongs, setBrowseSongs] = useState<LibrarySong[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [browsePage, setBrowsePage] = useState(1);
  const [browseTotalPages, setBrowseTotalPages] = useState(1);
  const [browseTotalItems, setBrowseTotalItems] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [inlinePlayingId, setInlinePlayingId] = useState<number | null>(null);

  const fetchBrowsePage = useCallback(async (page: number, q: string) => {
    setBrowseLoading(true);
    try {
      const res = await libraryApi.songs({
        liked: 'liked',
        page,
        pageSize: BROWSE_PAGE_SIZE,
        sort: 'title',
        ...(q ? { q } : {}),
      });
      setBrowsePage(res.pagination.page);
      setBrowseTotalPages(res.pagination.totalPages);
      setBrowseTotalItems(res.pagination.totalItems);
      setBrowseSongs(res.songs);
      setSongCatalog((prev) => {
        const next = new Map(prev);
        for (const song of res.songs) next.set(song.id, song);
        return next;
      });
    } catch (e) {
      const message = e instanceof LibraryApiError ? e.message : PROFILE_COPY.customizeErrorToast;
      toast.error(message);
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  const initDialog = useCallback(async () => {
    setLoading(true);
    setInitialized(false);
    try {
      const [pinned, likedMeta] = await Promise.all([
        libraryApi.pinnedIds(),
        libraryApi.likedIds(),
      ]);
      setSelectedIds(pinned.songIds);
      setTotalLikes(likedMeta.total);

      const catalog = new Map<number, LibrarySong>();
      for (const song of pinned.songs ?? []) catalog.set(song.id, song);
      setSongCatalog(catalog);
      setInitialized(true);
    } catch (e) {
      const message = e instanceof LibraryApiError ? e.message : PROFILE_COPY.customizeErrorToast;
      toast.error(message);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      setInlinePlayingId(null);
      setInitialized(false);
      return;
    }
    setQuery('');
    setDebouncedQuery('');
    setBrowsePage(1);
    setInlinePlayingId(null);
    void initDialog();
  }, [open, initDialog]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open || !initialized) return;
    setBrowsePage(1);
  }, [debouncedQuery, open, initialized]);

  useEffect(() => {
    if (!open || !initialized || totalLikes === 0) return;
    void fetchBrowsePage(browsePage, debouncedQuery);
  }, [browsePage, debouncedQuery, fetchBrowsePage, initialized, open, totalLikes]);

  const toggleInlinePlay = useCallback((songId: number) => {
    setInlinePlayingId((prev) => (prev === songId ? null : songId));
  }, []);

  const addableSongs = useMemo(
    () => browseSongs.filter((s) => !selectedIds.includes(s.id)),
    [browseSongs, selectedIds],
  );

  const addSong = useCallback((songId: number) => {
    setSelectedIds((prev) => {
      const next = addPinnedSong(prev, songId, MAX_PINNED);
      if (next.rejected === 'max') toast.message(PROFILE_COPY.customizeMaxReached(MAX_PINNED));
      return next.ids;
    });
  }, []);

  const removeSong = useCallback((songId: number) => {
    setSelectedIds((prev) => removePinnedSong(prev, songId));
  }, []);

  const moveSong = useCallback((songId: number, direction: -1 | 1) => {
    setSelectedIds((prev) => movePinnedSong(prev, songId, direction));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await libraryApi.setPinnedSongs(selectedIds);
      toast.success(PROFILE_COPY.customizeSavedToast);
      onSaved();
      onOpenChange(false);
    } catch (e) {
      const message = e instanceof LibraryApiError ? e.message : PROFILE_COPY.customizeErrorToast;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await libraryApi.setPinnedSongs([]);
      toast.success(PROFILE_COPY.customizeSavedToast);
      onSaved();
      onOpenChange(false);
    } catch (e) {
      const message = e instanceof LibraryApiError ? e.message : PROFILE_COPY.customizeErrorToast;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublicVisibility = (checked: boolean) => {
    setSavingVisibility(true);
    onPublicVisibleChange(checked);
    socket.emit('profile:update_privacy', { showFavoriteSongs: checked });

    let settled = false;
    const timeoutId = setTimeout(() => settle(true), PROFILE_VISIBILITY_ACK_TIMEOUT_MS);

    function settle(revert: boolean) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      socket.off('profile:privacy', onSuccess);
      socket.off('error', onError);
      if (revert) onPublicVisibleChange(!checked);
      setSavingVisibility(false);
    }

    function onSuccess() {
      settle(false);
      void refreshProfile();
    }

    function onError() {
      settle(true);
    }

    socket.on('profile:privacy', onSuccess);
    socket.on('error', onError);
  };

  return {
    songCatalog,
    selectedIds,
    totalLikes,
    query,
    setQuery,
    browsePage,
    setBrowsePage,
    browseTotalPages,
    browseTotalItems,
    loading,
    browseLoading,
    saving,
    savingVisibility,
    inlinePlayingId,
    addableSongs,
    toggleInlinePlay,
    addSong,
    removeSong,
    moveSong,
    save,
    reset,
    togglePublicVisibility,
  };
}
