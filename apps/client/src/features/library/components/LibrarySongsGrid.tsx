import { Heart, Pause, Play, X } from 'lucide-react';
import { formatSongTypeLabel, type LibrarySong } from '@aniquizz/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getVideoUrl } from '@/lib/video';
import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';
import { SongLikeButton } from '@/features/likes/components/SongLikeButton';
import {
  libraryDifficultyClass,
  libraryDifficultyLabel,
} from '@/features/library/lib/libraryStyles';
import {
  useInlineLibraryPreview,
  type LibrarySongSelectOptions,
} from '@/features/library/hooks/useInlineLibraryPreview';

interface LibrarySongsGridProps {
  songs: LibrarySong[];
  onSelectSong: (song: LibrarySong, options?: LibrarySongSelectOptions) => void;
}

export function LibrarySongsGrid({ songs, onSelectSong }: LibrarySongsGridProps) {
  const { playingId, toggle, stop, stopAndCapture, videoRef } = useInlineLibraryPreview();

  return (
    <ul className="space-y-2" aria-label={LIBRARY_COPY.viewSongs}>
      {songs.map((song) => {
        const isInlinePlaying = playingId === song.id;
        const videoUrl = getVideoUrl(song.videoKey);
        return (
          <li key={song.id} className="glass-card overflow-hidden transition-colors hover:border-primary/40">
            <div className="group flex w-full items-center gap-3 p-3">
              <button
                type="button"
                onClick={() => toggle(song.id)}
                aria-label={isInlinePlaying ? 'Pause' : LIBRARY_COPY.playPreview}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                  isInlinePlaying
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
                )}
              >
                {isInlinePlaying ? (
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onSelectSong(song, stopAndCapture(song.id))}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-3 text-left',
                  'rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                {song.anime.coverImage ? (
                  <img
                    src={song.anime.coverImage}
                    alt=""
                    className="h-24 w-16 shrink-0 rounded-lg border border-border/60 object-cover shadow-sm"
                    loading="lazy"
                    decoding="async"
                    width={64}
                    height={96}
                  />
                ) : (
                  <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary/50 text-[10px] text-muted-foreground">
                    —
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="shrink-0 rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-foreground">
                      {formatSongTypeLabel(song.songType, song.sequence)}
                    </span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                        libraryDifficultyClass(song.difficulty),
                      )}
                    >
                      {libraryDifficultyLabel(song.difficulty)}
                    </span>
                    {song.discovered ? (
                      <Badge className="bg-aqua/20 text-aqua text-[10px]">
                        {LIBRARY_COPY.discoveredBadge}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="truncate font-semibold leading-tight">{song.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {song.artist}
                    <span className="text-muted-foreground/50"> · </span>
                    {song.anime.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span
                      className="inline-flex items-center gap-0.5"
                      title={LIBRARY_COPY.metaLikesAria(song.likeCount)}
                    >
                      <Heart className="h-3 w-3 fill-primary/40 text-primary" aria-hidden="true" />
                      {LIBRARY_COPY.metaLikes(song.likeCount)}
                    </span>
                  </div>
                </div>
              </button>

              <div className="shrink-0">
                <SongLikeButton songId={song.id} initialLiked={song.liked} size="md" stopPropagation />
              </div>
            </div>

            {isInlinePlaying && (
              <div className="relative border-t border-border/30 bg-secondary/20 px-3 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Fermer l'aperçu"
                  onClick={stop}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
                <div className="flex justify-center pr-10">
                  {videoUrl ? (
                    <video
                      key={song.id}
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      autoPlay
                      playsInline
                      preload="metadata"
                      className="aspect-video w-full max-w-xl rounded-lg border border-border/50 bg-card shadow-sm"
                      aria-label={`${LIBRARY_COPY.playPreview} — ${song.title}`}
                    />
                  ) : (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      {LIBRARY_COPY.videoUnavailable}
                    </p>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
