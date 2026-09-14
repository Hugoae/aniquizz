import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DAILY_COPY } from '../copy/dailyCopy';

/** Same warning flame chip as in-match answer streaks, sized for the Daily landing. */
export function DailyStreakBadge({ current }: { current: number }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-lg border border-warning/50 bg-warning/10 px-4 py-2"
      title={`${DAILY_COPY.streak} ${current}`}
      aria-label={`${DAILY_COPY.streak} ${current}`}
    >
      <Flame
        className={cn('h-6 w-6 fill-warning text-warning', current >= 5 && 'animate-pulse')}
        aria-hidden
      />
      <span className="text-xl font-black italic text-warning">{current}</span>
    </span>
  );
}
