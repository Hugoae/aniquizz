import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import type { DailyLeaderboardResponse } from '@aniquizz/shared';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { RankPill } from '@/features/game/components/shared/RankPill';
import { dailyApi } from '@/lib/dailyApi';
import { cn } from '@/lib/utils';
import { DAILY_COPY } from '../copy/dailyCopy';
import { formatDailyClock } from '../lib/dailyRecap';

interface DailyLeaderboardProps {
  activeRoundCount: number;
  viewerId?: string | null;
  className?: string;
}

/** Compact daily ranking — correct answers first, then cumulative time. */
export function DailyLeaderboard({ activeRoundCount, viewerId, className }: DailyLeaderboardProps) {
  const [board, setBoard] = useState<DailyLeaderboardResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void dailyApi
      .leaderboard()
      .then((next) => {
        if (!cancelled) {
          setBoard(next);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBoard(null);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={cn('glass-card flex min-h-0 flex-col overflow-hidden bg-card/30', className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-secondary/20 px-3 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Trophy className="h-4 w-4 text-primary" aria-hidden />
          {DAILY_COPY.leaderboard}
        </h2>
        {board && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {board.participantCount} {DAILY_COPY.participants}
          </span>
        )}
      </div>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2.5">
        {failed ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            {DAILY_COPY.leaderboardUnavailable}
          </p>
        ) : !board ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">…</p>
        ) : board.entries.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            {DAILY_COPY.leaderboardEmpty}
          </p>
        ) : (
          <ol className="space-y-1.5">
            {board.entries.map((entry) => {
              const isViewer = Boolean(viewerId) && entry.profileId === viewerId;
              return (
                <li
                  key={entry.profileId}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-2.5 py-2',
                    isViewer && 'border-primary/40 bg-primary/10',
                  )}
                >
                  <RankPill rank={entry.rank} size="sm" />
                  <UserAvatar username={entry.username} avatar={entry.avatar} className="h-7 w-7" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {entry.username}
                  </span>
                  <span className="shrink-0 font-mono text-sm font-bold tabular-nums">
                    {entry.correctCount}/{activeRoundCount}
                  </span>
                  <span className="hidden shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">
                    {formatDailyClock(entry.totalResponseMs)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
