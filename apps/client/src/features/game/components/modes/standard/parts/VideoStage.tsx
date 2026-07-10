import { useState, useEffect, useMemo } from 'react';

import { AlertCircle, Clock, Pause, SkipForward, Volume2, VolumeX } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { Slider } from '@/components/ui/slider';

import type { CurrentSong } from '@/features/game/state/gameReducer';

import { peekClipPath, peekWindowRect, type VideoMode } from '@aniquizz/shared';

import { CircularGameTimer } from '../../../shared/CircularGameTimer';

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



/** Bottom progress bar used when the video is visible during guessing (blurred / peek). */

function StageBottomTimer({

  timeLeft,

  progress,

  isPausePending,

  isGamePaused,

}: {

  timeLeft: number;

  progress: number;

  isPausePending: boolean;

  isGamePaused: boolean;

}) {

  const isUrgent = timeLeft <= 3 && timeLeft >= 0;



  return (

    <>

      {isPausePending && !isGamePaused && (

        <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 animate-fade-in items-center gap-2 whitespace-nowrap rounded-full border border-warning/40 bg-background/80 px-3 py-1.5 shadow-lg backdrop-blur-md">

          <Clock className="h-3.5 w-3.5 animate-pulse text-warning" aria-hidden="true" />

          <span className="text-xs font-bold text-warning">Pause en fin de round</span>

        </div>

      )}

      <div

        role="timer"

        aria-label={`Temps restant : ${timeLeft} secondes`}

        className="absolute inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-md"

      >

        <div className="flex items-center gap-3 px-4 py-2.5">

          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">

            <div

              className={cn(

                'h-full rounded-full transition-[width] duration-200 ease-linear',

                isUrgent ? 'bg-destructive' : 'bg-primary',

              )}

              style={{ width: `${progress}%` }}

            />

          </div>

          <span

            className={cn(

              'min-w-[2.5rem] text-right font-mono text-sm font-bold tabular-nums',

              isUrgent && 'text-destructive',

            )}

          >

            {timeLeft}s

          </span>

        </div>

      </div>

    </>

  );

}



export function VideoStage({

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



  const isRevealed = phase === 'revealed' && isVideoReady;

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

      return 'absolute inset-0 z-0 h-full w-full object-cover opacity-100 transition-opacity duration-500';

    }

    if (!isGuessing) {

      return 'absolute inset-0 z-0 h-full w-full object-cover opacity-0';

    }

    switch (videoMode) {

      case 'blurred':

        return 'absolute inset-0 z-0 h-full w-full scale-105 object-cover opacity-100 blur-xl';

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
        'group relative aspect-video max-h-[40vh] w-full max-w-[850px] shrink-0 overflow-hidden rounded-xl border border-border shadow-2xl transition-all duration-500',
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

            ? "Extrait musical — réponse révélée"

            : "Extrait musical en cours — devinez l'anime"

        }

        disablePictureInPicture

        controlsList="nodownload noplaybackrate noremoteplayback"

        onSeeked={markVideoReady}

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

        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">

          <Button onClick={onSafePlay} variant="glow" size="lg" className="animate-bounce gap-2">

            <AlertCircle className="h-5 w-5" /> Activer le son

          </Button>

        </div>

      )}



      {isGamePaused && (

        <div

          className="absolute inset-0 z-50 flex animate-fade-in flex-col items-center justify-center bg-background/80 backdrop-blur-sm"

          role="status"

          aria-live="assertive"

        >

          <Pause className="mb-4 h-16 w-16 text-foreground" />

          <h3 className="mb-2 text-2xl font-bold text-foreground">Pause</h3>

        </div>

      )}



      {resumeCountdown !== null && resumeCountdown > 0 && (

        <div

          className="absolute inset-0 z-50 flex animate-fade-in items-center justify-center bg-background/80 backdrop-blur-sm"

          role="status"

          aria-live="assertive"

          aria-label={`Reprise dans ${resumeCountdown} secondes`}

        >

          <span className="animate-pulse text-9xl font-black text-foreground" aria-hidden="true">{resumeCountdown}</span>

        </div>

      )}



      <div className="absolute right-4 top-4 z-50 flex items-center gap-2 opacity-60 transition-opacity duration-300 focus-within:opacity-100 group-hover:opacity-100">

        <div className="flex items-center rounded-lg border border-border/60 bg-background/70 p-1 backdrop-blur-md">

          <Button variant="ghost" size="icon" onClick={onToggleMute} aria-label={isMuted ? 'Activer le son' : 'Couper le son'} className="h-8 w-8 rounded-md">

            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}

          </Button>

          <Slider value={[isMuted ? 0 : volume]} onValueChange={([v]) => onVolumeChange(v)} max={100} aria-label="Volume" className="mr-3 w-20" />

        </div>

      </div>



      {gameMode === 'solo' && phase === 'guessing' && !isGamePaused && submittedAnswer && (

        <div className={cn('absolute right-4 z-50', useBottomBar ? 'bottom-14' : 'bottom-4')}>

          <Button variant="default" onClick={onSoloSkip} className="gap-2 shadow-glow">

            <SkipForward className="h-4 w-4" /> Passer

          </Button>

        </div>

      )}



      {phase === 'revealed' && (

        <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-3 py-1.5 backdrop-blur-md" role="status" aria-live="polite">

          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />

          <span className="font-mono font-bold text-foreground">{timeLeft}s</span>

        </div>

      )}



      {useCenterTimer && (

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

      )}



      {useBottomBar && (

        <StageBottomTimer

          timeLeft={timeLeft}

          progress={progress}

          isPausePending={isPausePending}

          isGamePaused={isGamePaused}

        />

      )}



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


