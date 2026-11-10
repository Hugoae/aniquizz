import { memo, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Eye, Pause, Play, Repeat, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { DevRenderProfiler } from '@/components/dev/DevRenderProfiler';
import type { CurrentSong } from '@/features/game/state/gameReducer';
import { peekClipPath, peekWindowRect, type VideoMode } from '@aniquizz/shared';
import { MatchCountdownOverlays } from '../../../shared/MatchCountdownOverlays';
import { AudioVisualizer } from '../../../core/AudioVisualizer';
import { cn } from '@/lib/utils';
import type { TimeAttackClock } from '@/features/game/hooks/useTimeAttackClock';
import type { GamePhase } from './types';
import { guessingClipPaintKey } from './videoStagePaint';

/** Center play control for Evolving. Play restarts the excerpt, unless replays are capped. */
function EvolvingListenControl({
  videoRef,
  startTime,
  clipSeconds,
  stepKey,
  replayLimit,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  startTime: number;
  clipSeconds: number;
  stepKey: number;
  /** Null means unlimited. A number is extra restarts after the first listen. */
  replayLimit: number | null;
}) {
  const [playing, setPlaying] = useState(true);
  const [clipFinished, setClipFinished] = useState(false);
  const [replaysLeft, setReplaysLeft] = useState(replayLimit ?? 0);

  useEffect(() => {
    setReplaysLeft(replayLimit ?? 0);
    setClipFinished(false);
  }, [replayLimit, stepKey, startTime]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const end = startTime + clipSeconds;
    const sync = () => {
      setPlaying(!el.paused && !el.ended);
      setClipFinished(el.currentTime >= end - 0.08);
    };
    sync();
    el.addEventListener('play', sync);
    el.addEventListener('pause', sync);
    el.addEventListener('ended', sync);
    el.addEventListener('timeupdate', sync);
    return () => {
      el.removeEventListener('play', sync);
      el.removeEventListener('pause', sync);
      el.removeEventListener('ended', sync);
      el.removeEventListener('timeupdate', sync);
    };
  }, [videoRef, startTime, clipSeconds, stepKey]);

  const replayBlocked = replayLimit != null && clipFinished && replaysLeft <= 0;

  const toggle = () => {
    const el = videoRef.current;
    if (!el) return;
    const end = startTime + clipSeconds;
    const atEnd = el.currentTime >= end - 0.08;
    if (!el.paused && !el.ended) {
      el.pause();
      return;
    }
    if (!atEnd) {
      void el.play().catch(() => undefined);
      return;
    }
    if (replayLimit != null && replaysLeft <= 0) return;
    if (replayLimit != null) setReplaysLeft((left) => Math.max(0, left - 1));
    el.currentTime = startTime;
    void el.play().catch(() => undefined);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-background">
      <button
        type="button"
        onClick={toggle}
        disabled={replayBlocked}
        aria-label={playing ? 'Pause' : replayBlocked ? 'Plus de réécoute' : "Lire l'extrait"}
        className="pointer-events-auto flex h-32 w-32 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40"
      >
        {playing ? (
          <Pause className="h-12 w-12" aria-hidden="true" />
        ) : (
          <Play className="h-12 w-12 fill-current" aria-hidden="true" />
        )}
      </button>
      <div className="mt-6 flex h-8 w-1/2 items-center justify-center">
        <AudioVisualizer isPlaying={playing} className="h-8 text-primary" />
      </div>
      <p className="mt-4 animate-pulse text-sm font-medium text-muted-foreground">Écoutez bien…</p>
      {replayLimit != null ? (
        <p
          aria-live="polite"
          className={cn(
            'mt-3 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5',
            replaysLeft === 0
              ? 'border-warning/40 bg-warning/15 text-warning'
              : 'border-primary/40 bg-primary/15 text-primary shadow-glow',
          )}
        >
          <Repeat className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {replaysLeft === 0 ? (
            <span className="text-xs font-semibold">Plus de réécoute</span>
          ) : (
            <>
              <span className="font-mono text-lg font-black leading-none tabular-nums">
                {replaysLeft}
              </span>
              <span className="text-xs font-semibold">
                {replaysLeft > 1 ? 'réécoutes' : 'réécoute'}
              </span>
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}

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
  /** Versus time-attack: skip and "Suivant" are individual, never a vote. */
  race?: boolean;
  submittedAnswer: string | null;
  onSoloSkip: () => void;
  soloSkipAlways?: boolean;
  soloSkipLabel?: string;
  playersCount: number;
  skipVotes: number;
  skipRequired: number;
  onVoteSkip: () => void;
  /** Must be referentially stable (memoised) — this component is memo'd. */
  timeAttackClock?: TimeAttackClock | null;
  /** Evolving: play/pause replaces the guess ring. Reveal still shows its timer pill. */
  evolvingMode?: boolean;
  /** Null is unlimited. A number is extra replays after the first listen. */
  evolvingReplayLimit?: number | null;
  evolvingClipSeconds?: number;
  evolvingStep?: number;
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
  race = false,
  submittedAnswer,
  onSoloSkip,
  soloSkipAlways = false,
  soloSkipLabel = 'Révéler',
  playersCount,
  skipVotes,
  skipRequired,
  onVoteSkip,
  timeAttackClock = null,
  evolvingMode = false,
  evolvingReplayLimit = null,
  evolvingClipSeconds = 0,
  evolvingStep = 0,
}: VideoStageProps) {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasPaintedFrame, setHasPaintedFrame] = useState(false);
  const paintKey = guessingClipPaintKey(phase, currentSong);

  useEffect(() => {
    if (paintKey === null) return;
    setIsVideoReady(false);
    setHasPaintedFrame(false);
  }, [paintKey]);

  const markVideoReady = () => setIsVideoReady(true);
  const markPaintedFrame = () => setHasPaintedFrame(true);

  const isRevealed = phase === 'revealed' && isVideoReady && hasPaintedFrame;
  const isGuessing = phase === 'guessing';
  const visualGuessMode = videoMode === 'blurred' || videoMode === 'peek';
  const useCenterTimer =
    phase === 'loading' || phase === 'ready' || (isGuessing && !visualGuessMode);
  const useBottomBar = isGuessing && visualGuessMode;

  const peekWindow =
    currentSong && 'peekWindow' in currentSong ? currentSong.peekWindow : undefined;
  const peekRect = useMemo(() => (peekWindow ? peekWindowRect(peekWindow) : null), [peekWindow]);

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
        // Do not use bare `landscape:` — that media query matches every
        // landscape monitor and crushed the stage to 11rem on desktop.
        // Tighten only when the viewport is actually short (phone on its side).
        'group relative aspect-video max-h-[42vh] w-full max-w-[850px] shrink-0 overflow-hidden rounded-xl border border-border shadow-2xl transition-all duration-500 [@media(orientation:landscape)_and_(max-height:500px)]:max-h-[36vh]',
        isGuessing && (videoMode === 'peek' || evolvingMode) ? 'bg-background' : 'bg-black',
      )}
    >
      {/* Music excerpt — no dialogue captions to ship; aria-label already describes the clip. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- guessing clip is audio/video without a caption track */}
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
            value={[volume]}
            onValueChange={([v]) => onVolumeChange(v)}
            max={100}
            aria-label="Volume"
            className="mr-3 w-20"
          />
        </div>
      </div>

      {(gameMode === 'solo' || race) &&
        phase === 'guessing' &&
        !isGamePaused &&
        (soloSkipAlways || submittedAnswer) && (
          <div className={cn('absolute right-4 z-50', useBottomBar ? 'bottom-14' : 'bottom-4')}>
            <Button variant="default" onClick={onSoloSkip} className="gap-2 shadow-glow">
              {soloSkipAlways ? <SkipForward className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {soloSkipLabel}
            </Button>
          </div>
        )}

      {!isGamePaused && evolvingMode && phase === 'guessing' ? (
        <EvolvingListenControl
          videoRef={videoRef}
          startTime={
            currentSong && 'videoKey' in currentSong ? (currentSong.videoStartTime ?? 0) : 0
          }
          clipSeconds={evolvingClipSeconds}
          stepKey={evolvingStep}
          replayLimit={evolvingReplayLimit}
        />
      ) : null}

      <DevRenderProfiler id="MatchCountdownOverlays">
        <MatchCountdownOverlays
          phase={phase}
          phaseEndsAt={phaseEndsAt}
          phaseDurationSeconds={phaseDurationSeconds}
          isGamePaused={isGamePaused}
          isPausePending={isPausePending}
          useCenterTimer={useCenterTimer && !evolvingMode}
          useBottomBar={useBottomBar}
          timeAttack={timeAttackClock}
        />
      </DevRenderProfiler>

      {phase === 'revealed' && (
        <div className="absolute bottom-4 right-4 z-30">
          <Button
            variant="default"
            onClick={race ? onSoloSkip : onVoteSkip}
            className="gap-2 shadow-glow"
          >
            <SkipForward className="h-4 w-4" /> Suivant
            {!race && playersCount > 1 && ` (${skipVotes}/${skipRequired})`}
          </Button>
        </div>
      )}
    </div>
  );
});
