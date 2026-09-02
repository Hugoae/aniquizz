import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Music2,
  User,
  Film,
  Play,
  Pause,
  ChevronRight,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { LibrarySong } from '@aniquizz/shared';
import { formatSongTypeLabel } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { libraryApi, LibraryApiError } from '@/lib/libraryApi';
import { LibrarySongDrawer } from '@/features/library/components/LibrarySongDrawer';
import { SongLikeButton } from '@/features/likes/components/SongLikeButton';
import { useSongLikes } from '@/features/likes/context/SongLikesContext';
import { getVideoUrl } from '@/lib/video';
import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';
import {
  isRevealAccentColor,
} from '@/features/game/lib/revealMeta';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';
import { ProfilePinnedFavoritesDialog } from '@/features/profile/components/ProfilePinnedFavoritesDialog';

const PROFILE_FAVORITES_PAGE_SIZE = 5;

interface ProfileFavoriteSongsSectionProps {
  profileId: string;
  isOwn: boolean;
  username: string;
}

function FavoriteSongRow({
  song,
  isOwn,
  isPlaying,
  onTogglePlay,
  onOpen,
}: {
  song: LibrarySong;
  isOwn: boolean;
  isPlaying: boolean;
  onTogglePlay: (songId: number) => void;
  onOpen: (song: LibrarySong) => void;
}) {
  const typeLabel = formatSongTypeLabel(song.songType, song.sequence);
  const videoUrl = getVideoUrl(song.videoKey);
  const accent = isRevealAccentColor(song.anime.coverColor) ? song.anime.coverColor : null;

  return (
    <div
      className="overflow-hidden rounded-xl border border-border/60 bg-card/30 transition-colors hover:border-primary/20 hover:bg-card/50"
      style={
        accent
          ? { borderLeftWidth: 3, borderLeftColor: `${accent}99` }
          : undefined
      }
    >
      <div className="group flex items-center gap-3 p-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onTogglePlay(song.id)}
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

        <button
          type="button"
          onClick={() => onOpen(song)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4',
            'rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          )}
          aria-label={PROFILE_COPY.favoriteSongsOpenSong(song.title)}
        >
          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-secondary/40 shadow-sm">
            {song.anime.coverImage ? (
              <img
                src={song.anime.coverImage}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                <Music2 className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <Music2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <p className="min-w-0 truncate text-sm font-bold text-foreground">{song.title}</p>
              <span className="shrink-0 rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-foreground">
                {typeLabel}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Film className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden="true" />
              <p className="truncate text-xs text-muted-foreground/70">{song.anime.name}</p>
            </div>
          </div>
        </button>

        <div className="shrink-0 self-center">
          {isOwn ? (
            <SongLikeButton songId={song.id} initialLiked size="md" stopPropagation />
          ) : (
            <Heart className="h-5 w-5 fill-primary/40 text-primary/40" aria-hidden="true" />
          )}
        </div>
      </div>

      {isPlaying && (
        <div className="relative border-t border-border/30 bg-secondary/20 px-3 py-3 sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Fermer l'aperçu"
            onClick={() => onTogglePlay(song.id)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="flex justify-center pr-10">
            {videoUrl ? (
              <video
                key={song.id}
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
    </div>
  );
}

function FavoriteSongsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-xl border border-border/60 bg-card/30 p-3 sm:gap-4"
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-secondary/60" />
          <div className="h-24 w-16 shrink-0 rounded-lg bg-secondary/60" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 rounded bg-secondary/60" />
            <div className="h-3 w-1/2 rounded bg-secondary/40" />
            <div className="h-3 w-2/3 rounded bg-secondary/40" />
          </div>
          <div className="h-9 w-9 shrink-0 rounded-full bg-secondary/50" />
        </div>
      ))}
    </div>
  );
}

export function ProfileFavoriteSongsSection({
  profileId,
  isOwn,
  username,
}: ProfileFavoriteSongsSectionProps) {
  const { isLiked, ready: likesReady } = useSongLikes();
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(true);
  const [publicVisible, setPublicVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerSong, setDrawerSong] = useState<LibrarySong | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [isCurated, setIsCurated] = useState(false);
  const [inlinePlayingId, setInlinePlayingId] = useState<number | null>(null);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await libraryApi.userFavorites(profileId, {
        page: 1,
        pageSize: PROFILE_FAVORITES_PAGE_SIZE,
      });
      setSongs(res.songs);
      setTotalLikes(res.totalLikes ?? res.pagination.totalItems);
      setIsCurated(res.curated === true);
      setSectionVisible(res.visible !== false);
      if (res.publicVisible !== undefined) setPublicVisible(res.publicVisible);
    } catch (e) {
      const message =
        e instanceof LibraryApiError ? e.message : PROFILE_COPY.favoriteSongsLoadError;
      setError(message);
      setSongs([]);
      setTotalLikes(0);
      setIsCurated(false);
      setSectionVisible(true);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [profileId]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const visibleSongs = useMemo(() => {
    if (!isOwn || !likesReady) return songs;
    return songs.filter((s) => isLiked(s.id));
  }, [songs, isOwn, likesReady, isLiked]);

  const displayedCount = visibleSongs.length;
  const countLabel = useMemo(() => {
    if (totalLikes > displayedCount) {
      return PROFILE_COPY.favoriteSongsShownTotal(displayedCount, totalLikes);
    }
    return PROFILE_COPY.favoriteSongsCount(displayedCount);
  }, [displayedCount, totalLikes]);

  const openSong = useCallback((song: LibrarySong) => setDrawerSong(song), []);

  const toggleInlinePlay = useCallback((songId: number) => {
    setInlinePlayingId((prev) => (prev === songId ? null : songId));
  }, []);

  if (loaded && !isOwn && !sectionVisible) return null;

  return (
    <section className="space-y-4 animate-fade-in" style={{ animationDelay: '120ms' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">{PROFILE_COPY.favoriteSongsTitle}</h2>
          {!loading && !error && (
            <span className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-xs font-bold text-muted-foreground">
              {countLabel}
            </span>
          )}
          {!loading && !error && isCurated && (
            <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {PROFILE_COPY.favoriteSongsCuratedBadge}
            </span>
          )}
          {isOwn && !publicVisible && (
            <span className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-xs font-bold text-muted-foreground">
              {PROFILE_COPY.favoriteSongsHiddenBadge}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOwn && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setCustomizeOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {PROFILE_COPY.favoriteSongsCustomize}
            </Button>
          )}
          {isOwn && displayedCount > 0 && (
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary" asChild>
              <Link to="/library?liked=liked">
                {PROFILE_COPY.favoriteSongsViewAll}
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
        {loading && <FavoriteSongsSkeleton />}

        {!loading && error && (
          <p className="text-center text-sm text-muted-foreground">{error}</p>
        )}

        {!loading && !error && visibleSongs.length === 0 && (
          <div className="relative z-10 py-6 text-center">
            <Heart className="mx-auto h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              {isOwn
                ? PROFILE_COPY.favoriteSongsEmptyOwn
                : PROFILE_COPY.favoriteSongsEmptyPublic(username)}
            </p>
            {isOwn && (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  {PROFILE_COPY.favoriteSongsEmptyOwnHint}
                </p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link to="/library">{PROFILE_COPY.favoriteSongsBrowseLibrary}</Link>
                </Button>
              </>
            )}
          </div>
        )}

        {!loading && !error && visibleSongs.length > 0 && (
          <div className="relative z-10 flex flex-col gap-2">
            {visibleSongs.map((song) => (
              <FavoriteSongRow
                key={song.id}
                song={song}
                isOwn={isOwn}
                isPlaying={inlinePlayingId === song.id}
                onTogglePlay={toggleInlinePlay}
                onOpen={openSong}
              />
            ))}
          </div>
        )}

        <div className="pointer-events-none absolute -right-6 -top-8 opacity-[0.04]">
          <Heart className="h-48 w-48" aria-hidden="true" />
        </div>
      </div>

      <LibrarySongDrawer song={drawerSong} onOpenChange={(open) => !open && setDrawerSong(null)} />

      {isOwn && (
        <ProfilePinnedFavoritesDialog
          open={customizeOpen}
          onOpenChange={setCustomizeOpen}
          onSaved={() => void loadFavorites()}
          publicVisible={publicVisible}
          onPublicVisibleChange={setPublicVisible}
        />
      )}
    </section>
  );
}
