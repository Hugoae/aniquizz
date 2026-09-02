import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Film, Pause, Play, X } from 'lucide-react';
import {
  formatSongTypeLabel,
  type LibraryAnimeGroup,
  type LibrarySong,
} from '@aniquizz/shared';
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
import { formatCompactCount } from '@/features/library/utils/format';
import {
  useInlineLibraryPreview,
  type LibrarySongSelectOptions,
} from '@/features/library/hooks/useInlineLibraryPreview';

interface LibraryAnimeListProps {
  animes: LibraryAnimeGroup[];
  onSelectSong: (song: LibrarySong, options?: LibrarySongSelectOptions) => void;
  focusSongId?: number | null;
}

export function LibraryAnimeList({ animes, onSelectSong, focusSongId }: LibraryAnimeListProps) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const { playingId, toggle, stop, stopAndCapture, videoRef } = useInlineLibraryPreview();

  useEffect(() => {
    if (!focusSongId) return;
    const host = animes.find((a) => a.songs.some((s) => s.id === focusSongId));
    if (host) setExpanded((prev) => new Set(prev).add(host.id));
  }, [focusSongId, animes]);

  const toggleAnime = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ul className="space-y-2" aria-label={LIBRARY_COPY.viewAnime}>
      {animes.map((anime) => {
        const open = expanded.has(anime.id);
        const pop = formatCompactCount(anime.popularity);
        return (
          <li key={anime.id} className="glass-card overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <button
                type="button"
                onClick={() => toggleAnime(anime.id)}
                aria-expanded={open}
                aria-label={`${open ? 'Réduire' : 'Développer'} ${anime.name}`}
                className="text-muted-foreground"
              >
                {open ? (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              {anime.coverImage ? (
                <img
                  src={anime.coverImage}
                  alt=""
                  className="h-10 w-7 rounded object-cover"
                  loading="lazy"
                  decoding="async"
                  width={28}
                  height={40}
                />
              ) : (
                <div className="flex h-10 w-7 items-center justify-center rounded bg-secondary/50">
                  <Film className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{anime.name}</p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {anime.seasonYear ? <span>{anime.seasonYear}</span> : null}
                  <span>{LIBRARY_COPY.metaPopularity(pop)}</span>
                  <Badge className="bg-secondary text-[10px]">
                    {LIBRARY_COPY.animeSongCount(anime.songs.length)}
                  </Badge>
                </div>
              </div>
            </div>

            {open ? (
              <ul className="border-t border-border/50 divide-y divide-border/40">
                {anime.songs.map((song) => {
                  const isInlinePlaying = playingId === song.id;
                  const videoUrl = getVideoUrl(song.videoKey);
                  return (
                    <li key={song.id}>
                      <div
                        className={cn(
                          'group flex w-full items-center gap-3 px-3 py-2.5 pl-12 text-left transition-colors',
                          'hover:bg-secondary/30',
                          focusSongId === song.id && 'bg-primary/10',
                        )}
                      >
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
                            'min-w-0 flex-1 space-y-0.5 text-left rounded-sm',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          )}
                        >
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
                          </div>
                          <p className="truncate text-sm font-medium">{song.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {song.artist}
                            <span className="text-muted-foreground/50"> · </span>
                            ♥ {song.likeCount}
                          </p>
                        </button>

                        <div className="shrink-0">
                          <SongLikeButton
                            songId={song.id}
                            initialLiked={song.liked}
                            size="sm"
                            stopPropagation
                          />
                        </div>
                      </div>

                      {isInlinePlaying && (
                        <div className="relative border-t border-border/30 bg-secondary/20 px-3 py-3 pl-12">
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
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
