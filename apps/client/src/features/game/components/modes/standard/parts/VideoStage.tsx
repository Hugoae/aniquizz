import { memo, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, Eye, Pause, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { DevRenderProfiler } from '@/components/dev/DevRenderProfiler';
import type { CurrentSong } from '@/features/game/state/gameReducer';
import { peekClipPath, peekWindowRect, type VideoMode } from '@aniquizz/shared';
import { MatchCountdownOverlays } from '../../../shared/MatchCountdownOverlays';
import { cn } from '@/lib/utils';
import type { GamePhase } from './types';

interface VideoStageProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  phase: GamePhase;
  currentSong: CurrentSong;
  videoMode: VideoMode;
  autoplayBlocked: boolean;
  onSafePlay: () => void;
  isGamePaused: boolean;
  isPausePending: boolean;
  resumeCountdown: number | null;
  isMuted: boolean;
  volume: number;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
  phaseEndsAt: number;
  phaseDurationSeconds: number;
  gameMode: 'solo' | 'multiplayer';
  submittedAnswer: string | null;
  onSoloSkip: () => void;
  playersCount: number;
  skipVotes: number;
  skipRequired: number;
  onVoteSkip: () => void;
}

export const VideoStage = memo(function VideoStage({
  videoRef,
  phase,
  currentSong,
  videoMode,
  autoplayBlocked,
  onSafePlay,
  isGamePaused,
  isPausePending,
  resumeCountdown,
  isMuted,
  volume,
  onToggleMute,
  onVolumeChange,
  phaseEndsAt,
  phaseDurationSeconds,
  gameMode,
  submittedAnswer,
  onSoloSkip,
  playersCount,
  skipVotes,
  skipRequired,
  onVoteSkip,
}: VideoStageProps) {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasPaintedFrame, setHasPaintedFrame] = useState(false);
  const currentVideoKey = currentSong?.videoKey ?? null;

  useEffect(() => {
    setIsVideoReady(false);
    setHasPaintedFrame(false);
  }, [currentVideoKey]);

  const markVideoReady = () => setIsVideoReady(true);
  const markPaintedFrame = () => setHasPaintedFrame(true);

  const isRevealed = phase === 'revealed' && isVideoReady && hasPaintedFrame;
  const isGuessing = phase === 'guessing';
  const visualGuessMode = videoMode === 'blurred' || videoMode === 'peek';
  const useCenterTimer = phase === 'loading' || phase === 'ready' || (isGuessing && !visualGuessMode);
  const useBottomBar = isGuessing && visualGuessMode;

  const peekWindow = currentSong && 'peekWindow' in currentSong ? currentSong.peekWindow : undefined;
  const peekRect = useMemo(
    () => (peekWindow ? peekWindowRect(peekWindow) : null),
    [peekWindow],
  );

  const videoClassName = useMemo(() => {
    if (isRevealed) {
      return 'absolute inset-0 z-0 h-full w-full object-cover object-center opacity-100 transition-opacity duration-500';
    }
    if (!isGuessing) {
      return 'absolute inset-0 z-0 h-full w-full object-cover opacity-0';
    }
    switch (videoMode) {
      case 'blurred':
        // blur-xl = 24px; +5% for stronger concealment in blurred video mode
        return 'absolute inset-0 z-0 h-full w-full scale-105 object-cover opacity-100 blur-[25.2px]';
      case 'peek':
        return 'absolute inset-0 z-0 h-full w-full object-cover opacity-100';
      case 'hidden':
        return 'absolute inset-0 z-0 h-full w-full object-cover opacity-0';
      default:
        return 'absolute inset-0 z-0 h-full w-full object-cover opacity-0';
    }
  }, [isRevealed, isGuessing, videoMode]);

  const videoStyle = useMemo(() => {
    if (isGuessing && videoMode === 'peek' && peekWindow) {
      return { clipPath: peekClipPath(peekWindow) };
    }
    return undefined;
  }, [isGuessing, videoMode, peekWindow]);

  return (
    <div
      className={cn(
        'group relative aspect-video max-h-[42vh] w-full max-w-[850px] shrink-0 overflow-hidden rounded-xl border border-border shadow-2xl transition-all duration-500',
        isGuessing && videoMode === 'peek' ? 'bg-background' : 'bg-black',
      )}
    >
      <video
        ref={videoRef}
        className={videoClassName}
        style={videoStyle}
        playsInline
        preload="auto"
        aria-label={
          phase === 'revealed'
            ? 'Extrait musical — réponse révélée'
            : "Extrait musical en cours — devinez l'anime"
        }
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        onSeeked={markVideoReady}
        onPlaying={markPaintedFrame}
        onLoadedData={() => {
          if ((currentSong?.videoStartTime ?? 0) === 0) markVideoReady();
        }}
      />

      {isGuessing && videoMode === 'peek' && peekRect && (
        <div
          className="pointer-events-none absolute z-10 rounded-sm border-2 border-primary shadow-[0_0_14px_hsl(var(--primary)/0.45)]"
          style={{
            left: `${peekRect.left}%`,
            top: `${peekRect.top}%`,
            width: `${peekRect.width}%`,
            height: `${peekRect.height}%`,
          }}
          aria-hidden="true"
        />
      )}

      {autoplayBlocked && phase === 'guessing' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90">
          <Button onClick={onSafePlay} variant="glow" size="lg" className="animate-bounce gap-2">
            <AlertCircle className="h-5 w-5" /> Activer le son
          </Button>
        </div>
      )}

      {isGamePaused && (
        <div
          className="absolute inset-0 z-50 flex animate-fade-in flex-col items-center justify-center bg-background/90"
          role="status"
          aria-live="assertive"
        >
          <Pause className="mb-4 h-16 w-16 text-foreground" />
          <h3 className="mb-2 text-2xl font-bold text-foreground">Pause</h3>
        </div>
      )}

      {resumeCountdown !== null && resumeCountdown > 0 && (
        <div
          className="absolute inset-0 z-50 flex animate-fade-in items-center justify-center bg-background/90"
          role="status"
          aria-live="assertive"
          aria-label={`Reprise dans ${resumeCountdown} secondes`}
        >
          <span className="animate-pulse text-9xl font-black text-foreground" aria-hidden="true">
            {resumeCountdown}
          </span>
        </div>
      )}

      <div className="absolute right-4 top-4 z-50 flex items-center gap-2 opacity-60 transition-opacity duration-300 focus-within:opacity-100 group-hover:opacity-100">
        <div className="flex items-center rounded-lg border border-border/60 bg-background/95 p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
            className="h-8 w-8 rounded-md"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            onValueChange={([v]) => onVolumeChange(v)}
            max={100}
            aria-label="Volume"
            className="mr-3 w-20"
          />
        </div>
      </div>

      {gameMode === 'solo' && phase === 'guessing' && !isGamePaused && submittedAnswer && (
        <div className={cn('absolute right-4 z-50', useBottomBar ? 'bottom-14' : 'bottom-4')}>
          <Button variant="default" onClick={onSoloSkip} className="gap-2 shadow-glow">
            <Eye className="h-4 w-4" /> Révéler
          </Button>
        </div>
      )}

      <DevRenderProfiler id="MatchCountdownOverlays">
        {isPausePending && !isGamePaused && (
          <div
            className="pointer-events-none absolute left-4 top-3 z-40 flex animate-fade-in items-center gap-2 whitespace-nowrap rounded-full border border-warning/40 bg-background/95 px-3 py-1.5 shadow-lg"
            role="status"
            aria-live="polite"
          >
            <Clock className="h-3.5 w-3.5 animate-pulse text-warning" aria-hidden="true" />
            <span className="text-xs font-bold text-warning">Pause en fin de round</span>
          </div>
        )}
        <MatchCountdownOverlays
          phase={phase}
          phaseEndsAt={phaseEndsAt}
          phaseDurationSeconds={phaseDurationSeconds}
          isGamePaused={isGamePaused}
          useCenterTimer={useCenterTimer}
          useBottomBar={useBottomBar}
        />
      </DevRenderProfiler>

      {phase === 'revealed' && (
        <div className="absolute bottom-4 right-4 z-30">
          <Button variant="default" onClick={onVoteSkip} className="gap-2 shadow-glow">
            <SkipForward className="h-4 w-4" /> Suivant {playersCount > 1 && ` (${skipVotes}/${skipRequired})`}
          </Button>
        </div>
      )}
    </div>
  );
});
