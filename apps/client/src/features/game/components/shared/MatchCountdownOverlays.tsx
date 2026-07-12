import { memo } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMatchCountdown } from '@/features/game/hooks/useMatchCountdown';
import { CircularGameTimer } from './CircularGameTimer';
import type { GamePhase } from '@/features/game/components/modes/standard/parts/types';

interface MatchCountdownOverlaysProps {
  phase: GamePhase;
  phaseEndsAt: number;
  phaseDurationSeconds: number;
  isGamePaused: boolean;
  isPausePending: boolean;
  useCenterTimer: boolean;
  useBottomBar: boolean;
}

/** Bottom progress bar when the video is visible during guessing (blurred / peek). */
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
        <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 animate-fade-in items-center gap-2 whitespace-nowrap rounded-full border border-warning/40 bg-background/95 px-3 py-1.5 shadow-lg">
          <Clock className="h-3.5 w-3.5 animate-pulse text-warning" aria-hidden="true" />
          <span className="text-xs font-bold text-warning">Pause en fin de round</span>
        </div>
      )}
      <div
        role="timer"
        aria-label={`Temps restant : ${timeLeft} secondes`}
        className="absolute inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95"
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-100 ease-linear',
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

/**
 * Timer UI isolated from VideoStage so countdown ticks do not re-render the video subtree.
 */
export const MatchCountdownOverlays = memo(function MatchCountdownOverlays({
  phase,
  phaseEndsAt,
  phaseDurationSeconds,
  isGamePaused,
  isPausePending,
  useCenterTimer,
  useBottomBar,
}: MatchCountdownOverlaysProps) {
  const { timeLeft, progress } = useMatchCountdown({
    phase,
    phaseEndsAt,
    phaseDurationSeconds,
    isGamePaused,
  });

  return (
    <>
      {phase === 'revealed' && (
        <div
          className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-border/60 bg-background/95 px-3 py-1.5"
          role="status"
          aria-live="polite"
        >
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
              <div className="flex animate-fade-in items-center gap-2 whitespace-nowrap rounded-full border border-warning/40 bg-background/95 px-3 py-1.5 shadow-lg">
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
    </>
  );
});
