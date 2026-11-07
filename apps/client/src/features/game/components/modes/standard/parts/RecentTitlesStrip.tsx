import { memo } from 'react';
import { Check, SkipForward, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecentTitle, RecentTitleOutcome } from '@/features/game/state/gameReducer';
import { GAME_COPY } from '@/features/game/copy/gameCopy';

const OUTCOME_STYLE: Record<
  RecentTitleOutcome,
  { icon: typeof Check; row: string; badge: string }
> = {
  found: {
    icon: Check,
    row: 'border-success/40 bg-success/10',
    badge: 'bg-success text-success-foreground',
  },
  missed: {
    icon: X,
    row: 'border-destructive/40 bg-destructive/10',
    badge: 'bg-destructive text-destructive-foreground',
  },
  skipped: {
    icon: SkipForward,
    row: 'border-warning/40 bg-warning/10',
    badge: 'bg-warning text-warning-foreground',
  },
};

interface RecentTitlesStripProps {
  titles: RecentTitle[];
  className?: string;
}

/** Last few titles of the run, newest first, coloured by outcome. */
export const RecentTitlesStrip = memo(function RecentTitlesStrip({
  titles,
  className,
}: RecentTitlesStripProps) {
  const copy = GAME_COPY.recentTitles;
  return (
    <section
      className={cn('glass-card flex flex-col gap-2 p-3', className)}
      aria-label={copy.heading}
    >
      <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {copy.heading}
      </h2>
      {titles.length === 0 ? (
        <p className="px-1 py-2 text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {titles.map((t, i) => {
            const style = OUTCOME_STYLE[t.outcome];
            const Icon = style.icon;
            return (
              <li
                key={t.key}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-2.5 py-1.5',
                  style.row,
                  i === 0 && 'animate-fade-in',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    style.badge,
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {t.anime}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{t.title}</span>
                </span>
                <span className="sr-only">{copy.outcome[t.outcome]}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
});
