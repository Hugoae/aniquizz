import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DAILY_COPY } from '../copy/dailyCopy';
import { DailyRuleChips } from './DailyRuleChips';

interface DailyConfigHeaderProps {
  className?: string;
}

/** Game-over settings strip — calendar rail + the same daily capsules as the lobby card. */
export function DailyConfigHeader({ className }: DailyConfigHeaderProps) {
  return (
    <div
      className={cn(
        'flex w-full overflow-hidden rounded-lg border border-border/60 bg-secondary/20',
        className,
      )}
    >
      <div
        className="flex shrink-0 flex-col items-center justify-center gap-0.5 self-stretch bg-primary px-3 text-primary-foreground shadow-sm"
        aria-label={DAILY_COPY.title}
      >
        <Calendar className="h-4 w-4" aria-hidden />
        <span className="text-[10px] font-black uppercase tracking-wider">{DAILY_COPY.modeRail}</span>
      </div>
      <DailyRuleChips className="flex-1 px-4 py-3" />
    </div>
  );
}
