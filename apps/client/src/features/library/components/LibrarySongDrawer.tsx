import { ExternalLink, Play, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LibrarySong } from '@aniquizz/shared';
import { formatSongTypeLabel } from '@aniquizz/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SongInfoCard } from '@/features/game/components/shared/SongInfoCard';
import { getVideoUrl } from '@/lib/video';
import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';
import { prefetchGameHub } from '@/lib/routePrefetch';

interface LibrarySongDrawerProps {
  song: LibrarySong | null;
  onOpenChange: (open: boolean) => void;
}

export function LibrarySongDrawer({ song, onOpenChange }: LibrarySongDrawerProps) {
  const navigate = useNavigate();
  const videoUrl = song ? getVideoUrl(song.videoKey) : '';

  if (!song) return null;

  const typeLabel = formatSongTypeLabel(song.songType, song.sequence);

  return (
    <Dialog open={!!song} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto custom-scrollbar bg-card p-0 gap-0">
        <div className="border-b border-border/60 bg-black">
          {videoUrl ? (
            <video
              key={song.id}
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full bg-black"
              aria-label={`${LIBRARY_COPY.playPreview} — ${song.title}`}
            />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-secondary/30 px-6 text-center text-sm text-muted-foreground">
              {LIBRARY_COPY.videoUnavailable}
            </div>
          )}
        </div>

        <div className="space-y-4 p-5 md:p-6">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="font-display text-xl">{song.title}</DialogTitle>
              {song.discovered && (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {LIBRARY_COPY.discoveredBadge}
                </span>
              )}
            </div>
            <DialogDescription className="text-sm">
              {song.artist} · {song.anime.name}
            </DialogDescription>
          </DialogHeader>

          <SongInfoCard
            animeName={song.anime.name}
            songTitle={song.title}
            artist={song.artist}
            type={typeLabel}
            difficulty={song.difficulty.toLowerCase()}
            franchise={song.franchise?.name}
            year={song.anime.seasonYear ?? undefined}
            format={song.anime.format}
            episodeRange={song.episodeRange}
            coverColor={song.anime.coverColor}
            coverImage={song.anime.coverImage ?? undefined}
            siteUrl={song.anime.siteUrl ?? undefined}
            isRevealed
            tags={song.tags}
            variant="band"
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {song.anime.siteUrl && (
              <Button variant="outline" className="gap-2" asChild>
                <a href={song.anime.siteUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {LIBRARY_COPY.openAnilist}
                </a>
              </Button>
            )}
            <Button
              variant="glow"
              className="gap-2"
              onMouseEnter={prefetchGameHub}
              onFocus={prefetchGameHub}
              onClick={() => {
                onOpenChange(false);
                navigate('/play');
              }}
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              {LIBRARY_COPY.playCta}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{LIBRARY_COPY.playCtaHint}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
