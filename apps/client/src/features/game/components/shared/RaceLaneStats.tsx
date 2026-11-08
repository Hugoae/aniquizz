import { Flame } from 'lucide-react';
import { formatTimeAttackClock } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { GAME_COPY } from '@/features/game/copy/gameCopy';
import { isRaceClockUrgent } from './raceLive';

/** Same threshold as the solo card: a flame appears from 3 correct answers in a row. */
const STREAK_FLAME_AT = 3;

export function StreakFlame({ streak }: { streak: number }) {
  if (streak < STREAK_FLAME_AT) return null;
  return (
    <span
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-warning/50 bg-warning/10 px-1.5 py-0.5"
      title={`Série de ${streak} bonnes réponses`}
      aria-label={`Série de ${streak}`}
    >
      <Flame
        className={cn('h-3 w-3 fill-warning text-warning', streak >= 5 && 'animate-pulse')}
        aria-hidden
      />
      <span className="text-[10px] font-black italic text-warning">{streak}</span>
    </span>
  );
}

/** Found in front, songs heard behind: `8` / `13`. */
export function FoundHeard({
  found,
  heard,
  prominent = false,
  className,
}: {
  found: number;
  heard: number;
  prominent?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn('tabular-nums', className)}
      aria-label={`${found} trouvé${found > 1 ? 's' : ''} sur ${heard} écouté${heard > 1 ? 's' : ''}`}
    >
      <span className={cn('font-semibold text-foreground', prominent && 'text-xl font-black')}>
        {found}
      </span>
      <span className={cn('font-medium text-muted-foreground', prominent && 'text-sm')}>
        {' '}
        / {heard}
      </span>
    </span>
  );
}

export function RaceClockLabel({
  remainingMs,
  finished,
  className,
}: {
  remainingMs: number;
  finished: boolean;
  className?: string;
}) {
  const urgent = isRaceClockUrgent(remainingMs, finished);
  return (
    <span
      className={cn(
        'font-mono tabular-nums',
        finished && 'text-muted-foreground',
        !finished && !urgent && 'text-foreground',
        urgent && 'animate-pulse font-bold text-destructive',
        className,
      )}
    >
      {finished ? GAME_COPY.race.finished : formatTimeAttackClock(remainingMs)}
    </span>
  );
}
