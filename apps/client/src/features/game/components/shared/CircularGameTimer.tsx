import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AudioVisualizer } from '../core/AudioVisualizer';

interface CircularGameTimerProps {
  timeLeft: number;
  maxTime?: number;
  /** 0 to 100. Derived from `timeLeft`/`maxTime` when not provided. */
  progress?: number;
  phase: 'loading' | 'ready' | 'guessing' | 'revealed' | 'ended';
  isPaused?: boolean;
  showVisualizer?: boolean;
  /** Small element pinned just above the ring (e.g. the pause-pending pill). */
  topBadge?: ReactNode;
  className?: string;
}

export function CircularGameTimer({
  timeLeft,
  maxTime = 30,
  progress,
  phase,
  isPaused = false,
  showVisualizer = true,
  topBadge,
  className,
}: CircularGameTimerProps) {
  const calculatedProgress = progress ?? Math.min((timeLeft / maxTime) * 100, 100);
  const isUrgent = timeLeft <= 3 && timeLeft >= 0;
  const isReady = phase === 'ready';

  // Anchor above the ring — shared between guessing (with ring) and reveal (badge only).
  const badgeAnchor = topBadge ? (
    <div className="absolute bottom-full left-1/2 mb-4 -translate-x-1/2">{topBadge}</div>
  ) : null;

  return (
    <>
      {/* Reveal: timer overlay is hidden but the pending-pause pill stays at the
          exact same spot as during guessing (above the ring centre). */}
      {phase === 'revealed' && badgeAnchor && (
        <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center">
          <div className="relative">
            {badgeAnchor}
            <div className="h-32 w-32" aria-hidden="true" />
          </div>
          {/* Invisible spacers matching the guessing layout (visualizer + hint). */}
          <div className="mt-6 h-8 w-1/2" aria-hidden="true" />
          <p className="mt-4 invisible text-sm font-medium" aria-hidden="true">
            Écoutez bien…
          </p>
        </div>
      )}

    <div
      role="timer"
      aria-label={`Temps restant : ${timeLeft} secondes`}
      className={cn(
        'absolute inset-0 z-20 flex flex-col items-center justify-center bg-background transition-all duration-500',
        phase === 'revealed' ? 'pointer-events-none z-10 opacity-0' : 'opacity-100',
        className,
      )}
    >
      <div className={cn('relative transition-transform duration-200', (isUrgent || isReady) && 'scale-110')}>
        {badgeAnchor}
        <svg className={cn('h-32 w-32 -rotate-90', isReady && 'animate-pulse')}>
          <circle cx="50%" cy="50%" r="45%" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke={isReady ? 'hsl(var(--primary))' : isUrgent ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
            strokeWidth="6"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={isReady ? 0 : (100 - calculatedProgress) * -1}
            className={cn('transition-[stroke-dashoffset] duration-100 ease-linear', isReady && 'drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]')}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isReady ? (
            <span className="animate-pulse text-lg font-black text-primary">À vous !</span>
          ) : (
            <span
              className={cn(
                'text-4xl font-black tabular-nums transition-colors duration-200',
                isUrgent ? 'text-destructive drop-shadow-[0_0_15px_hsl(var(--destructive)/0.8)] animate-pulse' : 'text-foreground',
              )}
            >
              {timeLeft}
            </span>
          )}
        </div>
      </div>

      {showVisualizer && phase === 'guessing' && (
        <div className="mt-6 flex h-8 w-1/2 items-center justify-center">
          <AudioVisualizer isPlaying={!isPaused} className={cn('h-8', isUrgent ? 'text-destructive' : 'text-primary')} />
        </div>
      )}

      <p className="mt-4 animate-pulse text-sm font-medium text-muted-foreground">
        {phase === 'loading' ? 'Chargement…' : phase === 'ready' ? 'Préparez-vous…' : 'Écoutez bien…'}
      </p>
    </div>
    </>
  );
}
