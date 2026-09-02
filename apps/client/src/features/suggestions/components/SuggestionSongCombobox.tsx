import { Loader2, Music2, Search } from 'lucide-react';
import { formatSongTypeLabel } from '@aniquizz/shared';
import type { SuggestionSongOption } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';
import { SUGGESTIONS_COPY } from '@/features/suggestions/copy/suggestionsCopy';
import { cn } from '@/lib/utils';

const SONG_LIST_ID = 'suggestion-song-options';

interface SuggestionSongComboboxProps {
  query: string;
  onQueryChange: (value: string) => void;
  songs: SuggestionSongOption[];
  selectedSong: SuggestionSongOption | null;
  onSelect: (song: SuggestionSongOption) => void;
  onClear: () => void;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  error: string | null;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
}

export function SuggestionSongCombobox({
  query,
  onQueryChange,
  songs,
  selectedSong,
  onSelect,
  onClear,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  error,
  activeIndex,
  onActiveIndexChange,
  panelOpen,
  onPanelOpenChange,
}: SuggestionSongComboboxProps) {
  const showPanel = panelOpen && query.trim().length >= 2 && !selectedSong;
  const activeSong = songs[activeIndex];

  const selectSong = (song: SuggestionSongOption) => {
    onSelect(song);
    onPanelOpenChange(false);
  };

  if (selectedSong) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-aqua/30 bg-card px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{selectedSong.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {selectedSong.animeName} ·{' '}
            {formatSongTypeLabel(selectedSong.songType, selectedSong.sequence)} ·{' '}
            {selectedSong.artist}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          {SUGGESTIONS_COPY.changeSong}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
          onPanelOpenChange(event.target.value.trim().length >= 2);
          onActiveIndexChange(0);
        }}
        onFocus={() => {
          if (query.trim().length >= 2) onPanelOpenChange(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onPanelOpenChange(false);
            return;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            onPanelOpenChange(true);
            if (!songs.length) return;
            onActiveIndexChange(Math.min(activeIndex + 1, songs.length - 1));
            return;
          }
          if (event.key === 'ArrowUp' && showPanel) {
            event.preventDefault();
            onActiveIndexChange(Math.max(activeIndex - 1, 0));
            return;
          }
          if (event.key === 'Enter' && showPanel && activeSong) {
            event.preventDefault();
            selectSong(activeSong);
          }
        }}
        placeholder={SUGGESTIONS_COPY.songSearchPlaceholder}
        role="combobox"
        aria-label={SUGGESTIONS_COPY.songSearchAria}
        aria-expanded={showPanel}
        aria-controls={SONG_LIST_ID}
        aria-activedescendant={showPanel && activeSong ? `${SONG_LIST_ID}-${activeSong.id}` : undefined}
        autoComplete="off"
        className={cn('pl-9', FOCUS_RING)}
      />
      {loading ? (
        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
      ) : null}

      {showPanel ? (
        <div className="mt-1 rounded-lg border border-border bg-popover p-1">
          <div
            id={SONG_LIST_ID}
            role="listbox"
            aria-label={SUGGESTIONS_COPY.songListAria}
            className="max-h-52 overflow-y-auto"
          >
            {loading && !songs.length ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {SUGGESTIONS_COPY.searching}
              </div>
            ) : error ? (
              <p className="px-3 py-6 text-center text-xs text-destructive">
                {SUGGESTIONS_COPY.songSearchError}
              </p>
            ) : songs.length ? (
              songs.map((song, index) => (
                <button
                  key={song.id}
                  id={`${SONG_LIST_ID}-${song.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => onActiveIndexChange(index)}
                  onClick={() => selectSong(song)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                    FOCUS_RING,
                    index === activeIndex ? 'bg-secondary' : 'hover:bg-secondary/70',
                  )}
                >
                  <div className="h-11 w-8 shrink-0 overflow-hidden rounded border border-border/60 bg-secondary/40">
                    {song.coverImage ? (
                      <img
                        src={song.coverImage}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Music2 className="m-auto h-full w-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{song.title}</span>
                      <span className="shrink-0 rounded border border-aqua/30 bg-aqua/10 px-1.5 py-0.5 font-mono text-xs font-bold text-aqua">
                        {formatSongTypeLabel(song.songType, song.sequence)}
                      </span>
                    </span>
                    <span className="block truncate text-xs font-medium text-foreground/80">
                      {song.animeName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{song.artist}</span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {SUGGESTIONS_COPY.noSongs(query.trim())}
              </p>
            )}
          </div>
          {hasMore ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 w-full"
              disabled={loadingMore}
              onClick={onLoadMore}
            >
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : SUGGESTIONS_COPY.loadMoreSongs}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
