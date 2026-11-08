import { memo } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeAttackClock } from '@aniquizz/shared';
import { useMatchCountdown } from '@/features/game/hooks/useMatchCountdown';
import { useTimeAttackClock, type TimeAttackClock } from '@/features/game/hooks/useTimeAttackClock';
import { CircularGameTimer } from './CircularGameTimer';
import type { GamePhase } from '@/features/game/components/modes/standard/parts/types';
import { GAME_COPY } from '@/features/game/copy/gameCopy';

/** Last stretch of the run where the budget clock turns red. */
const TIME_ATTACK_URGENT_MS = 10_000;

interface MatchCountdownOverlaysProps {
  phase: GamePhase;
  phaseEndsAt: number;
  phaseDurationSeconds: number;
  isGamePaused: boolean;
  isPausePending: boolean;
  useCenterTimer: boolean;
  useBottomBar: boolean;
  /** Solo time-attack: show the run budget instead of the per-clip countdown. */
  timeAttack?: TimeAttackClock | null;
}

interface StageTimerDisplay {
  timeLeft: number;
  progress: number;
  label?: string;
  ariaLabel?: string;
  urgent?: boolean;
}

function PausePendingBadge() {
  return (
    <div
      className="flex animate-fade-in items-center gap-2 whitespace-nowrap rounded-full border border-warning/40 bg-background/95 px-3 py-1.5 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <Clock className="h-3.5 w-3.5 animate-pulse text-warning" aria-hidden="true" />
      <span className="text-xs font-bold text-warning">{GAME_COPY.stage.pauseEndOfRound}</span>
    </div>
  );
}

/** Bottom progress bar when the video is visible during guessing (blurred / peek). */
function StageBottomTimer({ timeLeft, progress, label, ariaLabel, urgent }: StageTimerDisplay) {
  const isUrgent = urgent ?? (timeLeft <= 3 && timeLeft >= 0);

  return (
    <div
      role="timer"
      aria-label={ariaLabel ?? `Temps restant : ${timeLeft} secondes`}
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
          {label ?? `${timeLeft}s`}
        </span>
      </div>
    </div>
  );
}

function useTimeAttackDisplay(clock: TimeAttackClock | null | undefined): StageTimerDisplay | null {
  const live = useTimeAttackClock(
    clock?.remainingMs ?? null,
    clock?.syncedAt ?? 0,
    clock?.ticking ?? false,
  );
  if (!clock || live == null) return null;
  const label = formatTimeAttackClock(live);
  return {
    timeLeft: Math.ceil(live / 1000),
    progress: clock.budgetMs > 0 ? Math.min(100, (live / clock.budgetMs) * 100) : 0,
    label,
    ariaLabel: GAME_COPY.timeAttack.clockAria(label),
    urgent: live <= TIME_ATTACK_URGENT_MS,
  };
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
  timeAttack,
}: MatchCountdownOverlaysProps) {
  const { timeLeft, progress } = useMatchCountdown({
    phase,
    phaseEndsAt,
    phaseDurationSeconds,
    isGamePaused,
  });
  const budget = useTimeAttackDisplay(timeAttack);
  // The ready beat keeps its "À vous !" ring; from the first clip on, the run budget wins.
  const guessDisplay: StageTimerDisplay =
    budget && phase === 'guessing' ? budget : { timeLeft, progress };

  const showPauseBadge = isPausePending && !isGamePaused;

  return (
    <>
      {phase === 'revealed' && (
        <div
          className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-border/60 bg-background/95 px-3 py-1.5"
          role="status"
          aria-live="polite"
        >
          <div className={cn('h-2 w-2 animate-pulse rounded-full', 'bg-primary')} />
          <span className="font-mono font-bold tabular-nums text-foreground">{`${timeLeft}s`}</span>
        </div>
      )}

      {showPauseBadge && (
        <div
          className={cn(
            'pointer-events-none absolute left-1/2 z-40 -translate-x-1/2',
            useBottomBar ? 'bottom-14' : 'top-3',
          )}
        >
          <PausePendingBadge />
        </div>
      )}

      {useCenterTimer && (
        <CircularGameTimer
          timeLeft={guessDisplay.timeLeft}
          progress={guessDisplay.progress}
          label={guessDisplay.label}
          ariaLabel={guessDisplay.ariaLabel}
          urgent={guessDisplay.urgent}
          phase={phase}
          isPaused={isGamePaused}
        />
      )}

      {useBottomBar && <StageBottomTimer {...guessDisplay} />}
    </>
  );
});
