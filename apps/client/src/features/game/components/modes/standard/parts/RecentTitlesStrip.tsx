import { memo, useEffect, useRef, useState } from 'react';
import { Disc3, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecentTitle } from '@/features/game/state/gameReducer';
import { GAME_COPY } from '@/features/game/copy/gameCopy';
import { OUTCOME_STYLE } from './recentTitleStyle';

/** Matches the `recent-out` keyframe duration in index.css. */
const EXIT_MS = 400;

function difficultyClass(difficulty: string): string {
  if (difficulty === 'easy') return 'text-success border-success/30 bg-success/10';
  if (difficulty === 'hard') return 'text-destructive border-destructive/30 bg-destructive/10';
  return 'text-info border-info/30 bg-info/10';
}

function TitleRow({ title, leaving = false }: { title: RecentTitle; leaving?: boolean }) {
  const style = OUTCOME_STYLE[title.outcome];
  const Icon = style.icon;
  const type = title.type.replace(/(\d+)$/, ' $1');
  return (
    <li
      aria-hidden={leaving || undefined}
      className={cn('overflow-hidden', leaving ? 'animate-recent-out' : 'animate-recent-in')}
    >
      <div className={cn('flex items-center gap-2 rounded-md border px-2.5 py-1.5', style.row)}>
        <span
          className={cn('w-6 shrink-0 font-mono text-[10px] font-bold tabular-nums', style.number)}
        >
          #{title.round}
        </span>
        <span
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
            style.badge,
          )}
          aria-hidden="true"
        >
          <Icon className="h-2.5 w-2.5" strokeWidth={3} />
        </span>

        {title.cover ? (
          <img
            src={title.cover}
            alt=""
            loading="lazy"
            className="h-10 w-7 shrink-0 rounded-sm border border-border/60 object-cover"
          />
        ) : (
          <span
            className="flex h-10 w-7 shrink-0 items-center justify-center rounded-sm border border-border/60 bg-secondary text-muted-foreground"
            aria-hidden="true"
          >
            <Disc3 className="h-3 w-3" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold leading-tight text-foreground">
            {title.anime}
          </span>
          <span className="block truncate text-[10px] leading-tight text-muted-foreground">
            {title.title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {title.bonusMs != null && title.bonusMs > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded border border-primary/40 bg-primary/15 px-1 py-0.5 font-mono text-[10px] font-bold tabular-nums leading-none text-primary">
              <Flame className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
              {GAME_COPY.recentTitles.bonus(Math.round(title.bonusMs / 1000))}
            </span>
          )}
          {title.type && (
            <span className="rounded border border-border bg-secondary px-1 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground">
              {type}
            </span>
          )}
          {title.difficulty && (
            <span
              className={cn(
                'rounded border px-1 py-0.5 text-[10px] font-bold uppercase leading-none',
                difficultyClass(title.difficulty),
              )}
            >
              {title.difficulty}
            </span>
          )}
        </div>
        <span className="sr-only">
          {GAME_COPY.recentTitles.outcome[title.outcome]}
          {title.bonusMs != null && title.bonusMs > 0
            ? `, ${GAME_COPY.recentTitles.bonusSpoken(Math.round(title.bonusMs / 1000))}`
            : ''}
        </span>
      </div>
    </li>
  );
}

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
  // Titles that just dropped out of the window keep rendering while they slide away.
  const [leaving, setLeaving] = useState<RecentTitle[]>([]);
  const previousRef = useRef<RecentTitle[]>(titles);

  useEffect(() => {
    const kept = new Set(titles.map((t) => t.key));
    const dropped = previousRef.current.filter((t) => !kept.has(t.key));
    previousRef.current = titles;
    if (dropped.length === 0) return;
    setLeaving((current) => [...current, ...dropped]);
    const timer = window.setTimeout(() => {
      setLeaving((current) => current.filter((t) => !dropped.some((d) => d.key === t.key)));
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [titles]);

  return (
    <section
      className={cn('glass-card flex min-h-0 flex-col gap-1.5 overflow-hidden p-2.5', className)}
      aria-label={copy.heading}
    >
      <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {copy.heading}
      </h2>
      {titles.length === 0 ? (
        <p className="px-1 py-2 text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <ol className="flex min-h-0 flex-col gap-1 overflow-hidden">
          {titles.map((t) => (
            <TitleRow key={t.key} title={t} />
          ))}
          {leaving.map((t) => (
            <TitleRow key={`out-${t.key}`} title={t} leaving />
          ))}
        </ol>
      )}
    </section>
  );
});
