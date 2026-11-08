import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { RecentTitle } from '@/features/game/state/gameReducer';
import { GAME_COPY } from '@/features/game/copy/gameCopy';
import { OUTCOME_STYLE } from './recentTitleStyle';

/** Latest titles shown on small screens, where the side strip is hidden. */
const MAX_PILLS = 5;

interface RecentTitlesPillsProps {
  titles: RecentTitle[];
  className?: string;
}

/** Compact one-line history (outcome + round + anime), newest first. */
export const RecentTitlesPills = memo(function RecentTitlesPills({
  titles,
  className,
}: RecentTitlesPillsProps) {
  if (titles.length === 0) return null;
  return (
    <section aria-label={GAME_COPY.recentTitles.heading} className={cn('w-full', className)}>
      <ol className="custom-scrollbar flex gap-1.5 overflow-x-auto pb-1">
        {titles.slice(0, MAX_PILLS).map((t) => {
          const style = OUTCOME_STYLE[t.outcome];
          const Icon = style.icon;
          return (
            <li
              key={t.key}
              className={cn(
                'flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-2.5',
                style.row,
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                  style.badge,
                )}
                aria-hidden="true"
              >
                <Icon className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              <span className={cn('font-mono text-[10px] font-bold tabular-nums', style.number)}>
                #{t.round}
              </span>
              <span className="truncate text-xs font-semibold text-foreground">{t.anime}</span>
              <span className="sr-only">{GAME_COPY.recentTitles.outcome[t.outcome]}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
});
