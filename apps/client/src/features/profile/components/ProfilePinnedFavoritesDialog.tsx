import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  Music2,
  Pause,
  Play,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LibrarySong } from '@aniquizz/shared';
import { formatSongTypeLabel } from '@aniquizz/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { libraryApi, LibraryApiError } from '@/lib/libraryApi';
import { getVideoUrl } from '@/lib/video';
import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';
import { useAuth } from '@/features/auth/context/AuthContext';
import { socket } from '@/lib/socket';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';

const MAX_PINNED = 5;
const BROWSE_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const PROFILE_VISIBILITY_ACK_TIMEOUT_MS = 8_000;

interface ProfilePinnedFavoritesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  publicVisible: boolean;
  onPublicVisibleChange: (visible: boolean) => void;
}

export function ProfilePinnedFavoritesDialog({
  open,
  onOpenChange,
  onSaved,
  publicVisible,
  onPublicVisibleChange,
}: ProfilePinnedFavoritesDialogProps) {
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
      const message =
        e instanceof LibraryApiError ? e.message : PROFILE_COPY.customizeErrorToast;
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
      if (pinned.songIds.length) {
        const pinnedSongs = await Promise.all(
          pinned.songIds.map((id) => libraryApi.song(id).catch(() => null)),
        );
        for (const song of pinnedSongs) {
          if (song) catalog.set(song.id, song);
        }
      }
      setSongCatalog(catalog);
      setInitialized(true);
    } catch (e) {
      const message =
        e instanceof LibraryApiError ? e.message : PROFILE_COPY.customizeErrorToast;
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

  const renderInlinePreview = (song: LibrarySong) => {
    if (inlinePlayingId !== song.id) return null;
    const videoUrl = getVideoUrl(song.videoKey);
    return (
      <div className="relative border-t border-border/30 bg-secondary/20 px-2 py-2 sm:px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label="Fermer l'aperçu"
          onClick={() => setInlinePlayingId(null)}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <div className="flex justify-center pr-8">
          {videoUrl ? (
            <video
              key={song.id}
              src={videoUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="aspect-video w-full max-w-md rounded-lg border border-border/50 bg-card shadow-sm"
              aria-label={`${LIBRARY_COPY.playPreview} — ${song.title}`}
            />
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {LIBRARY_COPY.videoUnavailable}
            </p>
          )}
        </div>
      </div>
    );
  };

  const playButton = (songId: number) => {
    const isPlaying = inlinePlayingId === songId;
    return (
      <button
        type="button"
        onClick={() => toggleInlinePlay(songId)}
        aria-label={isPlaying ? 'Pause' : LIBRARY_COPY.playPreview}
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
          isPlaying
            ? 'bg-primary text-primary-foreground'
            : 'bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground',
        )}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
        )}
      </button>
    );
  };

  const addableSongs = useMemo(
    () => browseSongs.filter((s) => !selectedIds.includes(s.id)),
    [browseSongs, selectedIds],
  );

  const addSong = useCallback((songId: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(songId) || prev.length >= MAX_PINNED) {
        if (prev.length >= MAX_PINNED) toast.message(PROFILE_COPY.customizeMaxReached(MAX_PINNED));
        return prev;
      }
      return [...prev, songId];
    });
  }, []);

  const removeSong = useCallback((songId: number) => {
    setSelectedIds((prev) => prev.filter((id) => id !== songId));
  }, []);

  const moveSong = useCallback((songId: number, direction: -1 | 1) => {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(songId);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[target]!;
      next[target] = next[idx]!;
      next[idx] = tmp;
      return next;
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await libraryApi.setPinnedSongs(selectedIds);
      toast.success(PROFILE_COPY.customizeSavedToast);
      onSaved();
      onOpenChange(false);
    } catch (e) {
      const message =
        e instanceof LibraryApiError ? e.message : PROFILE_COPY.customizeErrorToast;
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
      const message =
        e instanceof LibraryApiError ? e.message : PROFILE_COPY.customizeErrorToast;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublicVisibility = (checked: boolean) => {
    setSavingVisibility(true);
    onPublicVisibleChange(checked);
    socket.emit('update_profile_data', { showFavoriteSongs: checked });

    // `update_profile_data` has no ack: settle on the first matching event, then drop both
    // listeners so a later unrelated `error` cannot revert the toggle.
    let settled = false;
    const timeoutId = setTimeout(() => settle(true), PROFILE_VISIBILITY_ACK_TIMEOUT_MS);

    function settle(revert: boolean) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      socket.off('user_profile', onSuccess);
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

    socket.on('user_profile', onSuccess);
    socket.on('error', onError);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
          <DialogTitle>{PROFILE_COPY.customizeTitle}</DialogTitle>
          <DialogDescription>{PROFILE_COPY.customizeHint}</DialogDescription>
          <p className="text-xs font-semibold text-primary">
            {PROFILE_COPY.customizeSelected(selectedIds.length, MAX_PINNED)}
          </p>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
          <span className="text-sm font-medium">{PROFILE_COPY.favoriteSongsPublicToggle}</span>
          <Switch
            checked={publicVisible}
            disabled={savingVisibility}
            onCheckedChange={togglePublicVisibility}
            aria-label={PROFILE_COPY.favoriteSongsPublicToggle}
          />
        </div>

        <div className="custom-scrollbar max-h-[min(62vh,520px)] space-y-4 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            </div>
          ) : totalLikes === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {PROFILE_COPY.customizeEmptyLikes}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-semibold">{PROFILE_COPY.customizeOrderTitle}</p>
                  <p className="text-xs text-muted-foreground">{PROFILE_COPY.customizeOrderHint}</p>
                </div>
                {selectedIds.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/70 bg-card/20 px-3 py-4 text-center text-xs text-muted-foreground">
                    {PROFILE_COPY.customizeNoneSelected}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {selectedIds.map((songId, index) => {
                      const song = songCatalog.get(songId);
                      if (!song) return null;
                      const typeLabel = formatSongTypeLabel(song.songType, song.sequence);
                      return (
                        <li
                          key={songId}
                          className="overflow-hidden rounded-lg border border-primary/30 bg-primary/5"
                        >
                          <div className="flex items-center gap-2 px-2 py-2">
                            {playButton(songId)}
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{song.title}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {song.anime.name} · {typeLabel}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === 0}
                                aria-label="Monter"
                                onClick={() => moveSong(songId, -1)}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === selectedIds.length - 1}
                                aria-label="Descendre"
                                onClick={() => moveSong(songId, 1)}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                aria-label="Retirer"
                                onClick={() => removeSong(songId)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {renderInlinePreview(song)}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{PROFILE_COPY.customizeAddTitle}</p>
                  {browseTotalItems > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {PROFILE_COPY.customizeBrowseTotal(browseTotalItems)}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={PROFILE_COPY.customizeSearch}
                    className="pl-9"
                  />
                </div>

                {browseLoading ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  </div>
                ) : (
                  <>
                    <ul className="space-y-1">
                      {addableSongs.map((song) => {
                        const typeLabel = formatSongTypeLabel(song.songType, song.sequence);
                        return (
                          <li
                            key={song.id}
                            className="overflow-hidden rounded-lg border border-border/60 bg-card/30"
                          >
                            <div className="flex items-center gap-2 px-2 py-2">
                              {playButton(song.id)}
                              <button
                                type="button"
                                onClick={() => addSong(song.id)}
                                disabled={selectedIds.length >= MAX_PINNED}
                                className={cn(
                                  'flex min-w-0 flex-1 items-center gap-3 text-left transition-colors',
                                  'hover:opacity-90 disabled:opacity-50',
                                )}
                              >
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground">
                                  <Check className="h-3.5 w-3.5" />
                                </div>
                                <div className="h-10 w-7 shrink-0 overflow-hidden rounded border border-border/60 bg-secondary/40">
                                  {song.anime.coverImage ? (
                                    <img
                                      src={song.anime.coverImage}
                                      alt=""
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <Music2 className="h-3 w-3 text-muted-foreground/40" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold">{song.title}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {song.anime.name} · {typeLabel}
                                  </p>
                                </div>
                              </button>
                            </div>
                            {renderInlinePreview(song)}
                          </li>
                        );
                      })}
                      {addableSongs.length === 0 && (
                        <p className="py-6 text-center text-xs text-muted-foreground">
                          {PROFILE_COPY.customizeBrowseEmpty}
                        </p>
                      )}
                    </ul>

                    {browseTotalPages > 1 && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={browsePage <= 1 || browseLoading}
                          onClick={() => setBrowsePage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                          {PROFILE_COPY.customizePrevPage}
                        </Button>
                        <span className="text-xs font-medium text-muted-foreground tabular-nums">
                          {PROFILE_COPY.customizePage(browsePage, browseTotalPages)}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={browsePage >= browseTotalPages || browseLoading}
                          onClick={() =>
                            setBrowsePage((p) => Math.min(browseTotalPages, p + 1))
                          }
                        >
                          {PROFILE_COPY.customizeNextPage}
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={saving || loading}
            onClick={() => void reset()}
          >
            {PROFILE_COPY.customizeReset}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || loading}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : PROFILE_COPY.customizeSave}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
