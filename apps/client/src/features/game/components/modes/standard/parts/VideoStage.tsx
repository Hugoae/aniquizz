import { useState, useEffect } from 'react';
import { AlertCircle, Clock, Pause, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { CurrentSong } from '@/features/game/state/gameReducer';
import { CircularGameTimer } from '../../../shared/CircularGameTimer';
import type { GamePhase } from './types';

interface VideoStageProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  phase: GamePhase;
  currentSong: CurrentSong;
  autoplayBlocked: boolean;
  onSafePlay: () => void;
  isGamePaused: boolean;
  isPausePending: boolean;
  resumeCountdown: number | null;
  isMuted: boolean;
  volume: number;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
  timeLeft: number;
  progress: number;
  gameMode: 'solo' | 'multiplayer';
  submittedAnswer: string | null;
  onSoloSkip: () => void;
  playersCount: number;
  skipVotes: number;
  skipRequired: number;
  onVoteSkip: () => void;
}

export function VideoStage({
  videoRef,
  phase,
  currentSong,
  autoplayBlocked,
  onSafePlay,
  isGamePaused,
  isPausePending,
  resumeCountdown,
  isMuted,
  volume,
  onToggleMute,
  onVolumeChange,
  timeLeft,
  progress,
  gameMode,
  submittedAnswer,
  onSoloSkip,
  playersCount,
  skipVotes,
  skipRequired,
  onVoteSkip,
}: VideoStageProps) {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const currentVideoKey = currentSong?.videoKey ?? null;

  // A new song resets the reveal fade until the frame is decoded.
  useEffect(() => {
    setIsVideoReady(false);
  }, [currentVideoKey]);

  const markVideoReady = () => setIsVideoReady(true);

  return (
    <div className="group relative aspect-video max-h-[40vh] w-full max-w-[850px] shrink-0 overflow-hidden rounded-xl border border-border bg-black shadow-2xl transition-all duration-500">
      <video
        ref={videoRef}
        className={cn(
          'absolute inset-0 z-0 h-full w-full object-cover',
          phase === 'revealed' && isVideoReady ? 'opacity-100 transition-opacity duration-500' : 'opacity-0',
        )}
        playsInline
        // Disable Picture-in-Picture: Firefox's native PiP pops the video into a
        // floating window, bypassing our opacity-based hiding and revealing the
        // anime during the blind-test guessing phase.
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        onSeeked={markVideoReady}
        onLoadedData={() => {
          if ((currentSong?.videoStartTime ?? 0) === 0) markVideoReady();
        }}
      />

      {autoplayBlocked && phase === 'guessing' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Button onClick={onSafePlay} variant="glow" size="lg" className="animate-bounce gap-2">
            <AlertCircle className="h-5 w-5" /> Activer le son
          </Button>
        </div>
      )}

      {isGamePaused && (
        <div className="absolute inset-0 z-50 flex animate-fade-in flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Pause className="mb-4 h-16 w-16 text-foreground" />
          <h3 className="mb-2 text-2xl font-bold text-foreground">Pause</h3>
        </div>
      )}

      {resumeCountdown !== null && resumeCountdown > 0 && (
        <div className="absolute inset-0 z-50 flex animate-fade-in items-center justify-center bg-background/80 backdrop-blur-sm">
          <span className="animate-pulse text-9xl font-black text-foreground">{resumeCountdown}</span>
        </div>
      )}

      {/* Kept partly visible by default so the control is discoverable on touch
          devices (no hover); fully opaque on hover/focus. */}
      <div className="absolute right-4 top-4 z-50 flex items-center gap-2 opacity-60 transition-opacity duration-300 focus-within:opacity-100 group-hover:opacity-100">
        <div className="flex items-center rounded-lg border border-border/60 bg-background/70 p-1 backdrop-blur-md">
          <Button variant="ghost" size="icon" onClick={onToggleMute} aria-label={isMuted ? 'Activer le son' : 'Couper le son'} className="h-8 w-8 rounded-md">
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider value={[isMuted ? 0 : volume]} onValueChange={([v]) => onVolumeChange(v)} max={100} aria-label="Volume" className="mr-3 w-20" />
        </div>
      </div>

      {/* Skip is only offered in solo (once you've answered): it reveals the answer
          immediately. In multiplayer the guess intentionally runs the full timer so
          everyone can still change their pick — there is deliberately no guess skip.
          The reveal wait, on the other hand, can be shortened by the "Suivant" vote. */}
      {gameMode === 'solo' && phase === 'guessing' && !isGamePaused && submittedAnswer && (
        <div className="absolute bottom-4 right-4 z-50">
          <Button variant="default" onClick={onSoloSkip} className="gap-2 shadow-glow">
            <SkipForward className="h-4 w-4" /> Passer
          </Button>
        </div>
      )}

      {phase === 'revealed' && (
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-3 py-1.5 backdrop-blur-md" role="timer">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="font-mono font-bold text-foreground">{timeLeft}s</span>
        </div>
      )}

      <CircularGameTimer
        timeLeft={timeLeft}
        progress={progress}
        phase={phase}
        isPaused={isGamePaused}
        topBadge={
          isPausePending && !isGamePaused ? (
            <div className="flex animate-fade-in items-center gap-2 whitespace-nowrap rounded-full border border-warning/40 bg-background/80 px-3 py-1.5 shadow-lg backdrop-blur-md">
              <Clock className="h-3.5 w-3.5 animate-pulse text-warning" aria-hidden="true" />
              <span className="text-xs font-bold text-warning">Pause en fin de round</span>
            </div>
          ) : undefined
        }
      />

      {phase === 'revealed' && (
        <div className="absolute bottom-4 right-4 z-30">
          <Button variant="default" onClick={onVoteSkip} className="gap-2 shadow-glow">
            <SkipForward className="h-4 w-4" /> Suivant {playersCount > 1 && ` (${skipVotes}/${skipRequired})`}
          </Button>
        </div>
      )}

    </div>
  );
}
