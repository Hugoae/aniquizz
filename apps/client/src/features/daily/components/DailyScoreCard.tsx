import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailyResultDto } from '@aniquizz/shared';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { XpEarnedBadge } from '@/features/game/components/modes/standard/gameover/XpEarnedBadge';
import { DAILY_COPY } from '../copy/dailyCopy';
import { formatDailyClock, formatDailyClockValue } from '../lib/dailyRecap';
import { DailyTracks } from './DailyTracks';

interface DailyScoreCardProps {
  result: DailyResultDto;
  isSuccess: boolean;
  username: string;
  avatar: string;
}

/** Left column of the daily recap — same chrome as solo, tracks instead of medals. */
export function DailyScoreCard({ result, isSuccess, username, avatar }: DailyScoreCardProps) {
  const clock = formatDailyClock(result.totalResponseMs);

  return (
    <div
      className={cn(
        'relative flex w-full min-w-[17.5rem] flex-col items-center gap-4 rounded-xl border-2 px-6 pb-4 pt-7 shadow-[var(--shadow-card)] transition-colors duration-500 lg:min-w-[20rem]',
        isSuccess
          ? 'overflow-visible border-success/40 bg-card bg-success/5 shadow-[0_0_40px_hsl(var(--success)/0.15)]'
          : 'overflow-hidden border-destructive/30 bg-card shadow-[0_0_40px_hsl(var(--destructive)/0.12)]',
      )}
    >
      {isSuccess ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden rounded-[inherit] bg-gradient-to-b from-success/15 to-transparent"
          aria-hidden
        />
      ) : (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
          aria-hidden
        >
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-destructive/15 via-destructive/5 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--destructive)/0.08),transparent_55%)]" />
        </div>
      )}

      {result.xpAwarded > 0 && (
        <XpEarnedBadge xp={result.xpAwarded} className="absolute right-3 top-3 z-20" />
      )}

      <div className="z-10 text-center">
        <h1
          className={cn(
            'font-display text-4xl font-black uppercase italic tracking-tight',
            isSuccess
              ? 'text-success drop-shadow-[0_0_12px_hsl(var(--success)/0.45)]'
              : 'text-destructive drop-shadow-[0_0_12px_hsl(var(--destructive)/0.35)]',
          )}
        >
          {isSuccess ? DAILY_COPY.victory : DAILY_COPY.defeat}
        </h1>
      </div>

      <div className="relative z-10 isolate overflow-hidden rounded-full">
        <UserAvatar
          avatar={avatar}
          username={username}
          loading="eager"
          className={cn(
            'h-32 w-32 border-0 shadow-2xl transition-all duration-500',
            isSuccess
              ? 'ring-4 ring-success shadow-[0_0_24px_hsl(var(--success)/0.35)]'
              : 'ring-4 ring-destructive/50 shadow-[0_0_20px_hsl(var(--destructive)/0.2)] [&_img]:grayscale-[0.5]',
          )}
        />
      </div>

      <div className="z-10 w-full px-1">
        <DailyTracks tracks={result.tracks} size="lg" />
      </div>

      <div
        className="z-10 flex w-full items-center justify-center gap-2.5 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2"
        aria-label={`${DAILY_COPY.time} ${clock}`}
      >
        <Clock
          className={cn('h-4 w-4 shrink-0', isSuccess ? 'text-success' : 'text-muted-foreground')}
          aria-hidden
        />
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          {DAILY_COPY.time}
        </span>
        <span className="font-display text-xl font-black tabular-nums tracking-tight">
          {formatDailyClockValue(result.totalResponseMs)}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          s {DAILY_COPY.timeCumulative}
        </span>
      </div>
    </div>
  );
}
