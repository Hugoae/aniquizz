import { Check, ChevronDown, ChevronUp, Music2, Pause, Play, X } from 'lucide-react';
import type { LibrarySong } from '@aniquizz/shared';
import { formatSongTypeLabel } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getVideoUrl } from '@/lib/video';
import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';
import { PrefVolumeVideo } from '@/features/settings/components/PrefVolumeVideo';

export function PinnedFavoritePlayButton({
  songId,
  isPlaying,
  onToggle,
}: {
  songId: number;
  isPlaying: boolean;
  onToggle: (songId: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(songId)}
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
}

export function PinnedFavoriteInlinePreview({
  song,
  playing,
  onClose,
}: {
  song: LibrarySong;
  playing: boolean;
  onClose: () => void;
}) {
  if (!playing) return null;
  const videoUrl = getVideoUrl(song.videoKey);
  return (
    <div className="relative border-t border-border/30 bg-secondary/20 px-2 py-2 sm:px-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
        aria-label="Fermer l'aperçu"
        onClick={onClose}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      <div className="flex justify-center pr-8">
        {videoUrl ? (
          <PrefVolumeVideo
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
}

export function PinnedFavoriteSelectedRow({
  song,
  index,
  isLast,
  isPlaying,
  onTogglePlay,
  onMove,
  onRemove,
}: {
  song: LibrarySong;
  index: number;
  isLast: boolean;
  isPlaying: boolean;
  onTogglePlay: (songId: number) => void;
  onMove: (songId: number, direction: -1 | 1) => void;
  onRemove: (songId: number) => void;
}) {
  const typeLabel = formatSongTypeLabel(song.songType, song.sequence);
  return (
    <li className="overflow-hidden rounded-lg border border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 px-2 py-2">
        <PinnedFavoritePlayButton songId={song.id} isPlaying={isPlaying} onToggle={onTogglePlay} />
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
            onClick={() => onMove(song.id, -1)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isLast}
            aria-label="Descendre"
            onClick={() => onMove(song.id, 1)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            aria-label="Retirer"
            onClick={() => onRemove(song.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <PinnedFavoriteInlinePreview
        song={song}
        playing={isPlaying}
        onClose={() => onTogglePlay(song.id)}
      />
    </li>
  );
}

export function PinnedFavoriteAddRow({
  song,
  disabled,
  isPlaying,
  onTogglePlay,
  onAdd,
}: {
  song: LibrarySong;
  disabled: boolean;
  isPlaying: boolean;
  onTogglePlay: (songId: number) => void;
  onAdd: (songId: number) => void;
}) {
  const typeLabel = formatSongTypeLabel(song.songType, song.sequence);
  return (
    <li className="overflow-hidden rounded-lg border border-border/60 bg-card/30">
      <div className="flex items-center gap-2 px-2 py-2">
        <PinnedFavoritePlayButton songId={song.id} isPlaying={isPlaying} onToggle={onTogglePlay} />
        <button
          type="button"
          onClick={() => onAdd(song.id)}
          disabled={disabled}
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
      <PinnedFavoriteInlinePreview
        song={song}
        playing={isPlaying}
        onClose={() => onTogglePlay(song.id)}
      />
    </li>
  );
}
