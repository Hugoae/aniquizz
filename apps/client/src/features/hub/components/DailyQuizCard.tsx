import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { DAILY_ROUND_COUNT, type DailyTodayResponse, type DailyTrackState } from '@aniquizz/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { dailyApi } from '@/lib/dailyApi';
import { prefetchRoute, routeIntentHandlers } from '@/lib/routePrefetch';
import { DAILY_COPY } from '@/features/daily/copy/dailyCopy';
import { DailyTracks } from '@/features/daily/components/DailyTracks';
import { DailyRuleChips } from '@/features/daily/components/DailyRuleChips';

function tracksForCard(today: DailyTodayResponse): DailyTrackState[] {
  if (today.result?.tracks?.length) return today.result.tracks;
  return Array.from({ length: today.roundCount || DAILY_ROUND_COUNT }, () => 'empty' as const);
}

/** Live Quiz du jour entry on the Play hub. */
export function DailyQuizCard() {
  const [today, setToday] = useState<DailyTodayResponse | null>(() => dailyApi.peekToday());

  useEffect(() => {
    let cancelled = false;
    void dailyApi
      .today()
      .then((payload) => {
        if (!cancelled) setToday(payload);
      })
      .catch(() => {
        if (!cancelled) setToday(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tracks = today ? tracksForCard(today) : null;
  const cta =
    today?.status === 'completed' || today?.status === 'in_progress'
      ? DAILY_COPY.doneCta
      : DAILY_COPY.playCta;

  return (
    <div className="mx-auto mt-10 w-full max-w-4xl animate-fade-in px-0">
      <Link
        to="/daily"
        {...routeIntentHandlers(() => prefetchRoute('daily'))}
        className={cn(
          'group relative flex w-full items-center gap-5 overflow-hidden p-5 text-left md:p-6',
          'glass-card border border-border/50 transition-all duration-300',
          'hover:border-primary/30 hover:shadow-xl hover:translate-y-[-2px]',
        )}
        aria-label={`${DAILY_COPY.title} — ${cta}`}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          aria-hidden
        />

        <div
          className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-warning to-warning/70"
          aria-hidden
        >
          <Calendar className="h-7 w-7 text-foreground" />
        </div>

        <div className="relative min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black tracking-tight text-foreground transition-colors group-hover:text-primary">
              {DAILY_COPY.title}
            </h2>
            {today?.challengeNumber != null ? (
              <span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                #{today.challengeNumber}
              </span>
            ) : (
              <Skeleton className="h-5 w-10 rounded-full" />
            )}
          </div>
          <DailyRuleChips guessSeconds={today?.guessSeconds} />
        </div>
        <div className="relative hidden min-w-[7.5rem] justify-end sm:flex">
          {tracks ? (
            <DailyTracks tracks={tracks} />
          ) : (
            <div className="flex items-end gap-2" aria-hidden>
              {Array.from({ length: DAILY_ROUND_COUNT }, (_, index) => (
                <Skeleton key={index} className="h-12 w-3 rounded-sm" />
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
