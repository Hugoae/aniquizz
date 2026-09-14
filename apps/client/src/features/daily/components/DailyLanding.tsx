import { useMemo, useState } from 'react';
import type { DailyTodayResponse } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DAILY_COPY } from '../copy/dailyCopy';
import { DailyTracks } from './DailyTracks';
import { DailyRuleChips } from './DailyRuleChips';
import { DailyStreakBadge } from './DailyStreakBadge';
import { DailyLeaderboard } from './DailyLeaderboard';

interface DailyLandingProps {
  today: DailyTodayResponse;
  onStart: () => void;
  onViewResult: () => void;
  onLogin: () => void;
  viewerId?: string | null;
}

function countdownLabel(resetsAt: string): string {
  const ms = Math.max(0, new Date(resetsAt).getTime() - Date.now());
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/** Calendar day as on news cards — not a raw ISO string. */
function formatChallengeDate(isoDay: string): string {
  const [year, month, day] = isoDay.split('-').map(Number);
  if (!year || !month || !day) return isoDay;
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function DailyLanding({ today, onStart, onViewResult, onLogin, viewerId }: DailyLandingProps) {
  const [confirm, setConfirm] = useState(false);
  const tracks = today.result?.tracks
    ?? Array.from({ length: today.roundCount }, () => 'empty' as const);
  const done = today.status === 'completed';
  const settling = today.status === 'in_progress';
  const cta =
    today.status === 'guest'
      ? DAILY_COPY.loginCta
      : settling
        ? DAILY_COPY.settlingCta
        : done
          ? DAILY_COPY.doneCta
          : DAILY_COPY.playCta;

  const handleCta = () => {
    if (today.status === 'guest') {
      onLogin();
      return;
    }
    if (today.status === 'in_progress') return;
    if (today.status === 'available') {
      setConfirm(true);
      return;
    }
    onViewResult();
  };

  const resetLabel = useMemo(() => countdownLabel(today.resetsAt), [today.resetsAt]);

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 pb-4 text-center lg:overflow-hidden">
        <div className="flex w-full max-w-3xl flex-col items-center gap-6 md:gap-8">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground md:text-base">{formatChallengeDate(today.challengeDate)}</p>
            <h1 className="flex flex-wrap items-center justify-center gap-3 text-5xl font-bold md:gap-4 md:text-6xl">
              {DAILY_COPY.titleLead} <span className="gradient-text">{DAILY_COPY.titleAccent}</span>
              {today.challengeNumber != null && (
                <span className="rounded-full bg-secondary px-3.5 py-1.5 text-base font-semibold tabular-nums text-muted-foreground md:text-lg">
                  #{today.challengeNumber}
                </span>
              )}
            </h1>
          </div>
          <DailyRuleChips className="justify-center" size="lg" stacked guessSeconds={today.guessSeconds} />
          <DailyTracks tracks={today.result?.tracks ?? tracks} size="xl" />
          {today.streak && <DailyStreakBadge current={today.streak.current} />}
          <p className="text-base text-muted-foreground" aria-live="polite">
            {DAILY_COPY.resetsIn} {resetLabel}
          </p>
          <Button
            variant="glow"
            size="xxl"
            className="min-w-[16rem] px-12"
            onClick={handleCta}
            disabled={today.status === 'unavailable' || settling}
          >
            {today.status === 'unavailable' ? DAILY_COPY.unavailable : cta}
          </Button>
        </div>

        <DailyLeaderboard
          activeRoundCount={today.result?.activeRoundCount ?? today.roundCount}
          viewerId={viewerId}
          className="h-72 w-full max-w-sm lg:absolute lg:right-4 lg:top-1/2 lg:h-[min(24rem,62vh)] lg:w-[17rem] lg:max-w-none lg:-translate-y-1/2 xl:right-8 xl:w-[18.5rem]"
        />
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{DAILY_COPY.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{DAILY_COPY.confirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{DAILY_COPY.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="shrink-0"
              onClick={() => {
                setConfirm(false);
                onStart();
              }}
            >
              {DAILY_COPY.playCta}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
