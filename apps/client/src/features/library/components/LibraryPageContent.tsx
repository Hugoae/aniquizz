import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import type { LibrarySong } from '@aniquizz/shared';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/context/AuthContext';
import { LibraryHero } from '@/features/library/components/LibraryHero';
import { LibraryFilters } from '@/features/library/components/LibraryFilters';
import { LibraryTreeView } from '@/features/library/components/LibraryTreeView';
import { LibrarySongsGrid } from '@/features/library/components/LibrarySongsGrid';
import { LibraryAnimeList } from '@/features/library/components/LibraryAnimeList';
import { LibrarySongDrawer } from '@/features/library/components/LibrarySongDrawer';
import {
  LibraryEmptyState,
  LibraryListSkeleton,
  LibraryPaginationBar,
} from '@/features/library/components/LibraryPagination';
import { useLibraryBrowse } from '@/features/library/hooks/useLibraryBrowse';
import type { LibrarySongSelectOptions } from '@/features/library/hooks/useInlineLibraryPreview';

export function LibraryPageContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const browse = useLibraryBrowse();
  const [selected, setSelected] = useState<LibrarySong | null>(null);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);

  const handleSelect = useCallback(
    (song: LibrarySong, options?: LibrarySongSelectOptions) => {
      setResumeAt(options?.resumeAt ?? null);
      setAutoPlay(!!options?.autoPlay);
      setSelected(song);
      browse.setSongId(song.id);
    },
    [browse],
  );

  const handleDrawerClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setSelected(null);
        setResumeAt(null);
        setAutoPlay(false);
        browse.setSongId(null);
      }
    },
    [browse],
  );

  useEffect(() => {
    if (browse.deepLinkSong) {
      setResumeAt(null);
      setAutoPlay(false);
      setSelected(browse.deepLinkSong);
    }
  }, [browse.deepLinkSong]);

  const hasContent =
    browse.view === 'songs'
      ? (browse.songs?.songs.length ?? 0) > 0
      : browse.view === 'anime'
        ? (browse.animes?.animes.length ?? 0) > 0
        : (browse.tree?.groups.length ?? 0) > 0;

  const showInitialSkeleton =
    browse.loading && !browse.tree && !browse.songs && !browse.animes;
  const showEmpty = !browse.loading && !hasContent;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-16 pt-24 md:px-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="-ml-2 gap-2 pl-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Retour à l&apos;accueil
        </Button>

        <LibraryHero meta={browse.meta} />

        <LibraryFilters
          rawQuery={browse.rawQuery}
          onQueryChange={browse.setRawQuery}
          songTypes={browse.songTypes}
          onToggleSongType={browse.toggleSongType}
          difficulties={browse.difficulties}
          onToggleDifficulty={browse.toggleDifficulty}
          discovered={browse.discovered}
          onDiscoveredChange={browse.setDiscovered}
          liked={browse.liked}
          onLikedChange={browse.setLiked}
          isAuthenticated={!!user}
          view={browse.view}
          onViewChange={browse.setView}
          sort={browse.sort}
          onSortChange={browse.setSort}
          resultCount={browse.resultCount}
          searchMode={browse.searchMode}
        />

        {browse.error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {browse.error}
            </div>
            <Button variant="outline" size="sm" onClick={browse.reload}>
              Réessayer
            </Button>
          </div>
        )}

        {showInitialSkeleton ? (
          <LibraryListSkeleton />
        ) : showEmpty ? (
          <LibraryEmptyState />
        ) : (
          <div className="relative space-y-4">
            {browse.refreshing && (
              <div
                className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-background/40 backdrop-blur-[1px]"
                aria-hidden="true"
              />
            )}
            <div className={cn(browse.refreshing && 'opacity-60 transition-opacity')}>
              {browse.view === 'songs' && browse.songs ? (
                <LibrarySongsGrid songs={browse.songs.songs} onSelectSong={handleSelect} />
              ) : browse.view === 'anime' && browse.animes ? (
                <LibraryAnimeList
                  animes={browse.animes.animes}
                  onSelectSong={handleSelect}
                  focusSongId={browse.songId}
                />
              ) : browse.tree ? (
                <LibraryTreeView
                  groups={browse.tree.groups}
                  onSelectSong={handleSelect}
                  focusSongId={browse.songId}
                />
              ) : null}
            </div>
            <LibraryPaginationBar
              page={browse.page}
              totalPages={browse.totalPages}
              onPageChange={browse.setPage}
            />
          </div>
        )}
      </main>

      <LibrarySongDrawer
        song={selected}
        onOpenChange={handleDrawerClose}
        resumeAt={resumeAt}
        autoPlay={autoPlay}
      />
    </div>
  );
}
