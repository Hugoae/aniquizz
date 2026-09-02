import { useCallback, useEffect, useState } from 'react';

import { Check, ChevronDown, ChevronRight, Pause, Play, X } from 'lucide-react';

import {
  formatSongTypeLabel,
  type LibraryFranchiseGroup,
  type LibrarySong,
} from '@aniquizz/shared';

import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getVideoUrl } from '@/lib/video';

import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';
import { SongLikeButton } from '@/features/likes/components/SongLikeButton';

import {
  libraryDifficultyClass,
  libraryDifficultyLabel,
} from '@/features/library/lib/libraryStyles';

import {
  loadExpandedAnimes,
  loadExpandedFranchises,
  saveExpandedAnimes,
  saveExpandedFranchises,
} from '@/features/library/lib/libraryStorage';
import {
  useInlineLibraryPreview,
  type LibrarySongSelectOptions,
} from '@/features/library/hooks/useInlineLibraryPreview';

interface LibraryTreeViewProps {
  groups: LibraryFranchiseGroup[];
  onSelectSong: (song: LibrarySong, options?: LibrarySongSelectOptions) => void;
  focusSongId?: number | null;
}



const groupKey = (g: LibraryFranchiseGroup): string => (g.id === null ? 'orphan' : String(g.id));



export function LibraryTreeView({ groups, onSelectSong, focusSongId }: LibraryTreeViewProps) {

  const [expandedFranchises, setExpandedFranchises] = useState<Set<string>>(() => loadExpandedFranchises());

  const [expandedAnimes, setExpandedAnimes] = useState<Set<number>>(() => loadExpandedAnimes());

  const { playingId, toggle, stop, stopAndCapture, videoRef } = useInlineLibraryPreview();



  useEffect(() => {

    saveExpandedFranchises(expandedFranchises);

  }, [expandedFranchises]);



  useEffect(() => {

    saveExpandedAnimes(expandedAnimes);

  }, [expandedAnimes]);



  useEffect(() => {

    if (!focusSongId) return;

    for (const group of groups) {

      for (const anime of group.animes) {

        if (anime.songs.some((s) => s.id === focusSongId)) {

          setExpandedFranchises((prev) => new Set(prev).add(groupKey(group)));

          setExpandedAnimes((prev) => new Set(prev).add(anime.id));

          return;

        }

      }

    }

  }, [focusSongId, groups]);



  const toggleFranchise = useCallback((key: string) => {

    setExpandedFranchises((prev) => {

      const next = new Set(prev);

      if (next.has(key)) next.delete(key);

      else next.add(key);

      return next;

    });

  }, []);



  const toggleAnime = useCallback((id: number) => {

    setExpandedAnimes((prev) => {

      const next = new Set(prev);

      if (next.has(id)) next.delete(id);

      else next.add(id);

      return next;

    });

  }, []);



  return (

    <div className="space-y-2 animate-fade-in">

      {groups.map((group) => {

        const fKey = groupKey(group);

        const fOpen = expandedFranchises.has(fKey);



        return (

          <div key={fKey} className="glass-card overflow-hidden">

            <button

              type="button"

              onClick={() => toggleFranchise(fKey)}

              aria-expanded={fOpen}

              className={cn(

                'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors',

                'hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',

              )}

            >

              <span className="text-muted-foreground shrink-0" aria-hidden="true">

                {fOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}

              </span>

              <span className="min-w-0 flex-1 font-display text-base font-bold tracking-tight text-foreground truncate">

                {group.name}

              </span>

              <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">

                {LIBRARY_COPY.franchiseSongs(group.songCount, group.animes.length)}

              </span>

              <Badge variant="secondary" className="sm:hidden shrink-0 tabular-nums">

                {group.songCount}

              </Badge>

            </button>



            {fOpen && (

              <div className="border-t border-border/50">

                {group.animes.map((anime) => {

                  const aOpen = expandedAnimes.has(anime.id);

                  return (

                    <div key={anime.id} className="border-b border-border/40 last:border-0">

                      <button

                        type="button"

                        onClick={() => toggleAnime(anime.id)}

                        aria-expanded={aOpen}

                        className={cn(

                          'flex w-full items-center gap-3 bg-secondary/15 px-4 py-2.5 pl-10 text-left transition-colors',

                          'hover:bg-secondary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',

                        )}

                      >

                        <span className="text-muted-foreground shrink-0" aria-hidden="true">

                          {aOpen ? (

                            <ChevronDown className="h-3.5 w-3.5" />

                          ) : (

                            <ChevronRight className="h-3.5 w-3.5" />

                          )}

                        </span>

                        {anime.coverImage ? (

                          <img

                            src={anime.coverImage}

                            alt=""

                            loading="lazy"

                            decoding="async"

                            className="h-9 w-7 shrink-0 rounded object-cover shadow-sm"

                          />

                        ) : (

                          <div className="flex h-9 w-7 shrink-0 items-center justify-center rounded bg-primary/15 text-[10px] font-bold text-primary">

                            {anime.name.slice(0, 2).toUpperCase()}

                          </div>

                        )}

                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">

                          {anime.name}

                        </span>

                        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">

                          {anime.songs.length} son{anime.songs.length > 1 ? 's' : ''}

                        </span>

                      </button>



                      {aOpen && (

                        <ul className="divide-y divide-border/30">

                          {anime.songs.map((song) => {

                            const isInlinePlaying = playingId === song.id;

                            const videoUrl = getVideoUrl(song.videoKey);

                            return (

                              <li key={song.id}>

                                <div

                                  className={cn(

                                    'group flex w-full items-center gap-3 px-4 py-2.5 pl-16 text-left transition-colors',

                                    focusSongId === song.id && 'bg-primary/10 ring-1 ring-inset ring-primary/30',

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

                                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"

                                  >

                                    <div className="flex flex-wrap items-center gap-2">

                                      <span className="rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-foreground">

                                        {formatSongTypeLabel(song.songType, song.sequence)}

                                      </span>

                                    </div>

                                    <p className="mt-0.5 truncate text-sm font-semibold text-foreground">

                                      {song.title}

                                    </p>

                                    <p className="truncate text-xs text-muted-foreground">{song.artist}</p>

                                  </button>

                                  <div className="flex shrink-0 items-center gap-2">

                                    <SongLikeButton
                                      songId={song.id}
                                      initialLiked={song.liked}
                                      size="sm"
                                      stopPropagation
                                    />

                                    {song.discovered && (

                                      <span

                                        className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success"

                                        title={LIBRARY_COPY.discoveredBadge}

                                      >

                                        <Check className="h-3 w-3 shrink-0" aria-hidden="true" />

                                        <span className="hidden sm:inline">{LIBRARY_COPY.discoveredBadge}</span>

                                      </span>

                                    )}

                                    <span

                                      className={cn(

                                        'hidden sm:inline shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',

                                        libraryDifficultyClass(song.difficulty),

                                      )}

                                    >

                                      {libraryDifficultyLabel(song.difficulty)}

                                    </span>

                                  </div>

                                </div>

                                {isInlinePlaying && (
                                  <div className="relative border-t border-border/30 bg-secondary/20 px-4 py-3 pl-16">
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

                      )}

                    </div>

                  );

                })}

              </div>

            )}

          </div>

        );

      })}

    </div>

  );

}


