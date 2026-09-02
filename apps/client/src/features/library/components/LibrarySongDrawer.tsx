import { useEffect, useRef } from 'react';
import { ExternalLink, Check } from 'lucide-react';
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
import { SongLikeButton } from '@/features/likes/components/SongLikeButton';
import { getVideoUrl } from '@/lib/video';
import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';

interface LibrarySongDrawerProps {
  song: LibrarySong | null;
  onOpenChange: (open: boolean) => void;
  /** Seek position (seconds) when opening after an inline preview handoff. */
  resumeAt?: number | null;
  /** Autoplay after seek when the inline preview was playing. */
  autoPlay?: boolean;
}

export function LibrarySongDrawer({
  song,
  onOpenChange,
  resumeAt = null,
  autoPlay = false,
}: LibrarySongDrawerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const baseUrl = song ? getVideoUrl(song.videoKey) : '';
  // Media Fragments (`#t=`) help the browser start near the handoff timestamp.
  const videoUrl =
    baseUrl && resumeAt != null && resumeAt > 0
      ? `${baseUrl}#t=${resumeAt.toFixed(2)}`
      : baseUrl;

  useEffect(() => {
    if (!song || !baseUrl) return;
    const el = videoRef.current;
    if (!el) return;

    const target = resumeAt != null && resumeAt > 0 ? resumeAt : 0;
    const shouldPlay = autoPlay;

    const apply = () => {
      try {
        if (target > 0 && Math.abs(el.currentTime - target) > 0.35) {
          el.currentTime = target;
        }
        if (shouldPlay) void el.play().catch(() => {});
      } catch {
        /* Ignore seek/play errors (media not ready yet / autoplay policy). */
      }
    };

    if (el.readyState >= 1) {
      apply();
      return;
    }

    el.addEventListener('loadedmetadata', apply, { once: true });
    return () => el.removeEventListener('loadedmetadata', apply);
  }, [song?.id, baseUrl, resumeAt, autoPlay, song]);

  if (!song) return null;

  const typeLabel = formatSongTypeLabel(song.songType, song.sequence);

  return (
    <Dialog open={!!song} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto custom-scrollbar bg-card p-0 gap-0">
        <div className="border-b border-border/60 bg-black">
          {videoUrl ? (
            <video
              key={`${song.id}-${resumeAt?.toFixed(1) ?? '0'}-${autoPlay ? '1' : '0'}`}
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay={autoPlay}
              playsInline
              preload="auto"
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

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <SongLikeButton songId={song.id} initialLiked={song.liked} size="md" />
            {song.anime.siteUrl && (
              <Button variant="outline" className="gap-2" asChild>
                <a href={song.anime.siteUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {LIBRARY_COPY.openAnilist}
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
