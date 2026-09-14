import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
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
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';
import {
  MAX_PINNED,
  usePinnedFavoritesDialog,
} from '@/features/profile/hooks/usePinnedFavoritesDialog';
import {
  PinnedFavoriteAddRow,
  PinnedFavoriteSelectedRow,
} from '@/features/profile/components/PinnedFavoriteSongRow';

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
  const d = usePinnedFavoritesDialog({
    open,
    onOpenChange,
    onSaved,
    onPublicVisibleChange,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
          <DialogTitle>{PROFILE_COPY.customizeTitle}</DialogTitle>
          <DialogDescription>{PROFILE_COPY.customizeHint}</DialogDescription>
          <p className="text-xs font-semibold text-primary">
            {PROFILE_COPY.customizeSelected(d.selectedIds.length, MAX_PINNED)}
          </p>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
          <span className="text-sm font-medium">{PROFILE_COPY.favoriteSongsPublicToggle}</span>
          <Switch
            checked={publicVisible}
            disabled={d.savingVisibility}
            onCheckedChange={d.togglePublicVisibility}
            aria-label={PROFILE_COPY.favoriteSongsPublicToggle}
          />
        </div>

        <div className="custom-scrollbar max-h-[min(62vh,520px)] space-y-4 overflow-y-auto px-5 py-4">
          {d.loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            </div>
          ) : d.totalLikes === 0 ? (
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
                {d.selectedIds.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/70 bg-card/20 px-3 py-4 text-center text-xs text-muted-foreground">
                    {PROFILE_COPY.customizeNoneSelected}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {d.selectedIds.map((songId, index) => {
                      const song = d.songCatalog.get(songId);
                      if (!song) return null;
                      return (
                        <PinnedFavoriteSelectedRow
                          key={songId}
                          song={song}
                          index={index}
                          isLast={index === d.selectedIds.length - 1}
                          isPlaying={d.inlinePlayingId === songId}
                          onTogglePlay={d.toggleInlinePlay}
                          onMove={d.moveSong}
                          onRemove={d.removeSong}
                        />
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{PROFILE_COPY.customizeAddTitle}</p>
                  {d.browseTotalItems > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {PROFILE_COPY.customizeBrowseTotal(d.browseTotalItems)}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={d.query}
                    onChange={(e) => d.setQuery(e.target.value)}
                    placeholder={PROFILE_COPY.customizeSearch}
                    className="pl-9"
                  />
                </div>

                {d.browseLoading ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  </div>
                ) : (
                  <>
                    <ul className="space-y-1">
                      {d.addableSongs.map((song) => (
                        <PinnedFavoriteAddRow
                          key={song.id}
                          song={song}
                          disabled={d.selectedIds.length >= MAX_PINNED}
                          isPlaying={d.inlinePlayingId === song.id}
                          onTogglePlay={d.toggleInlinePlay}
                          onAdd={d.addSong}
                        />
                      ))}
                      {d.addableSongs.length === 0 && (
                        <p className="py-6 text-center text-xs text-muted-foreground">
                          {PROFILE_COPY.customizeBrowseEmpty}
                        </p>
                      )}
                    </ul>

                    {d.browseTotalPages > 1 && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={d.browsePage <= 1 || d.browseLoading}
                          onClick={() => d.setBrowsePage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                          {PROFILE_COPY.customizePrevPage}
                        </Button>
                        <span className="text-xs font-medium text-muted-foreground tabular-nums">
                          {PROFILE_COPY.customizePage(d.browsePage, d.browseTotalPages)}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={d.browsePage >= d.browseTotalPages || d.browseLoading}
                          onClick={() =>
                            d.setBrowsePage((p) => Math.min(d.browseTotalPages, p + 1))
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
            disabled={d.saving || d.loading}
            onClick={() => void d.reset()}
          >
            {PROFILE_COPY.customizeReset}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={d.saving}
            >
              {PROFILE_COPY.customizeCancel}
            </Button>
            <Button type="button" onClick={() => void d.save()} disabled={d.saving || d.loading}>
              {d.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : PROFILE_COPY.customizeSave}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
