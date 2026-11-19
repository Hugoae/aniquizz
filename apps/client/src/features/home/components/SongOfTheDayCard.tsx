import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { SongInfoCard } from '@/features/game/components/shared/SongInfoCard';
import { SongLikeButton } from '@/features/likes/components/SongLikeButton';
import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import { PrefVolumeVideo } from '@/features/settings/components/PrefVolumeVideo';
import { useHomeCopy } from '@/features/home/copy/homeCopy';
import { useAuth } from '@/features/auth/context/AuthContext';
import { discoverApi } from '@/lib/discoverApi';
import { pick } from '@/lib/i18n/text';
import { getVideoUrl } from '@/lib/video';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import type { SongOfTheDayResponse } from '@aniquizz/shared';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * The clip source stays empty until Listen. A site with a high media-engagement
 * score will otherwise start a <video> that already has a src.
 */
export function SongOfTheDayCard() {
  const copy = useHomeCopy();
  const { user } = useAuth();
  const { audioMuted, audioVolume, toggleMute, setAudioVolume, setAudioMuted } = usePlayerPrefs();
  const videoRef = useRef<HTMLVideoElement>(null);
  const heardOnce = useRef(false);
  const armPlay = useRef(false);
  const [song, setSong] = useState<SongOfTheDayResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    discoverApi
      .today()
      .then((payload) => {
        if (!cancelled) setSong(payload);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    armPlay.current = false;
    setSrc(null);
    setPlaying(false);
    setElapsed(0);
    heardOnce.current = false;
  }, [song?.song.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!src || !video || !song || !armPlay.current) return;
    const startAt = song.videoStartTime;
    const begin = () => {
      if (!armPlay.current) return;
      if (video.currentTime < startAt) video.currentTime = startAt;
      void video.play().catch(() => {
        armPlay.current = false;
        setPlaying(false);
      });
    };
    if (video.readyState >= 1) begin();
    else {
      // preload=none will not fetch until load() or play(). Seek before play so
      // the excerpt does not start at the opening of the file.
      video.load();
      video.addEventListener('loadedmetadata', begin, { once: true });
    }
  }, [src, song]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      video?.pause();
    };
  }, [song?.song.id]);

  if (failed || !song) return null;

  const excerpt = song.excerptSeconds;
  const end = song.videoStartTime + excerpt;
  const progress = Math.min(100, (elapsed / excerpt) * 100);
  const difficulty = song.song.difficulty.toLowerCase();

  const markHeard = () => {
    if (!user || song.heard || heardOnce.current) return;
    heardOnce.current = true;
    discoverApi.heard().catch(() => {
      heardOnce.current = false;
    });
  };

  const toggle = () => {
    const video = videoRef.current;
    if (src && video && !video.paused) {
      armPlay.current = false;
      video.pause();
      setPlaying(false);
      return;
    }
    armPlay.current = true;
    if (!src) {
      setSrc(getVideoUrl(song.playbackUrl));
      return;
    }
    if (video && video.currentTime < song.videoStartTime) video.currentTime = song.videoStartTime;
    void video?.play().catch(() => {
      armPlay.current = false;
      setPlaying(false);
    });
  };

  return (
    <aside
      className="pointer-events-none fixed right-4 top-1/2 z-20 hidden w-72 -translate-y-1/2 lg:block"
      aria-label={copy.songOfDayTitle}
    >
      <div className="pointer-events-auto max-h-[calc(100dvh-8rem)] space-y-2 overflow-y-auto">
        <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {copy.songOfDayTitle}
        </p>
        <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <PrefVolumeVideo
            mediaRef={videoRef}
            className="aspect-video w-full bg-background object-cover"
            src={src ?? undefined}
            poster={song.song.coverImage ?? undefined}
            autoPlay={false}
            preload={src ? 'metadata' : 'none'}
            playsInline
            aria-hidden="true"
            disablePictureInPicture
            onPlay={(event) => {
              if (!armPlay.current) {
                event.currentTarget.pause();
                return;
              }
              setPlaying(true);
              markHeard();
            }}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              if (!armPlay.current) {
                if (!video.paused) video.pause();
                return;
              }
              const played = Math.max(0, video.currentTime - song.videoStartTime);
              setElapsed(Math.min(excerpt, played));
              if (video.currentTime >= end - 0.05) {
                armPlay.current = false;
                video.pause();
                setElapsed(excerpt);
              }
            }}
          />
          {!playing && (
            <button
              type="button"
              className={cn(
                'absolute inset-0 z-10 flex items-center justify-center bg-background/35',
                FOCUS_RING,
              )}
              aria-label={copy.songOfDayPlay}
              onClick={toggle}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Play className="h-5 w-5 fill-current" aria-hidden="true" />
              </span>
            </button>
          )}
          <div className="absolute left-2 top-2 z-20 flex items-center gap-1 rounded-lg border border-border/60 bg-background/95 p-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={
                audioMuted
                  ? pick('Activer le son', 'Turn the sound on')
                  : pick('Couper le son', 'Mute')
              }
              onClick={(event) => {
                event.stopPropagation();
                toggleMute();
              }}
            >
              {audioMuted ? (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <Slider
              value={[audioMuted ? 0 : audioVolume]}
              max={100}
              className="w-16"
              aria-label={pick('Volume', 'Volume')}
              onValueChange={([value]) => {
                setAudioVolume(value);
                if (value > 0 && audioMuted) setAudioMuted(false);
                if (value === 0) setAudioMuted(true);
              }}
              onPointerDown={(event) => event.stopPropagation()}
            />
          </div>
          <div className="absolute right-2 top-2 z-20">
            <SongLikeButton songId={song.song.id} size="sm" stopPropagation className="shadow-lg" />
          </div>
          {playing && (
            <button
              type="button"
              className={cn(
                'absolute bottom-2 left-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground',
                FOCUS_RING,
              )}
              aria-label={copy.songOfDayPause}
              onClick={toggle}
            >
              <Pause className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <div
            className="h-1 bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={excerpt}
            aria-valuenow={Math.floor(elapsed)}
            aria-label={pick("Progression de l'extrait", 'Excerpt progress')}
          >
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <SongInfoCard
          variant="band"
          isRevealed
          showLikeButton={false}
          animeName={song.song.animeTitle}
          songTitle={song.song.title}
          artist={song.song.artist}
          type={song.song.typeLabel}
          difficulty={difficulty}
          year={song.song.seasonYear ?? undefined}
          season={song.song.season}
          format={song.song.format}
          episodeRange={song.song.episodeRange}
          coverColor={song.song.coverColor}
          coverImage={song.song.coverImage ?? undefined}
          siteUrl={song.song.siteUrl ?? undefined}
          franchise={song.song.franchise ?? undefined}
          songId={song.song.id}
        />
      </div>
    </aside>
  );
}
