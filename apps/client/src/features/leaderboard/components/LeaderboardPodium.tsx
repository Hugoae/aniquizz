import { Crown } from 'lucide-react';
import type { LeaderboardEntry, LeaderboardPodiumGroup } from '@aniquizz/shared';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { RankPill } from '@/features/game/components/shared/RankPill';
import { LeaderboardLevelBadge } from '@/features/leaderboard/components/LeaderboardLevelBadge';
import { LeaderboardPlayerControl } from '@/features/leaderboard/components/LeaderboardPlayerControl';
import {
  formatLeaderboardDetail,
  formatLeaderboardValue,
  LEADERBOARD_COPY,
} from '@/features/leaderboard/copy/leaderboardCopy';
import type { ProfileFromLeaderboardState } from '@/features/leaderboard/lib/leaderboardNavigation';
import { LEADERBOARD_METRIC_UI } from '@/features/leaderboard/lib/leaderboardMetricUi';
import {
  podiumFrameClass,
  podiumOrderClass,
  podiumRingClass,
  podiumScoreClass,
} from '@/features/leaderboard/lib/leaderboardPodiumStyles';
import { cn } from '@/lib/utils';

interface LeaderboardPodiumProps {
  groups: LeaderboardPodiumGroup[];
  viewerId?: string | null;
  hrefFor?: (entry: LeaderboardEntry) => string;
  linkState?: ProfileFromLeaderboardState;
  onSelect?: (entry: LeaderboardEntry) => void;
}

export function LeaderboardPodium({
  groups,
  viewerId,
  hrefFor,
  linkState,
  onSelect,
}: LeaderboardPodiumProps) {
  if (!groups.length) return null;

  return (
    <ol className="relative z-0 mt-3 flex flex-col items-stretch gap-3 md:flex-row md:items-end md:justify-center md:gap-4">
      {groups.map((group) => {
        const extra = Math.max(0, group.count - group.entries.length);
        const champion = group.rank === 1;
        return (
          <li
            key={group.rank}
            className={cn(
              'glass-card relative flex flex-col overflow-hidden p-4 md:w-1/3',
              podiumFrameClass(group.rank),
              podiumOrderClass(group.rank),
              champion && 'md:pb-6',
            )}
          >
            {champion && (
              <Crown
                className="absolute right-3 top-3 h-7 w-7 text-warning drop-shadow-[0_0_10px_hsl(var(--warning)/0.55)]"
                aria-hidden="true"
              />
            )}
            <div className="mb-3 flex items-center justify-between">
              <RankPill rank={group.rank} size={champion ? 'md' : 'sm'} />
              {group.count > 1 && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {LEADERBOARD_COPY.tied} · {group.count}
                </span>
              )}
            </div>
            <ul className="space-y-3">
              {group.entries.map((entry) => {
                const MetricIcon = LEADERBOARD_METRIC_UI[entry.metric].icon;
                const detail = formatLeaderboardDetail(entry);
                return (
                  <li key={entry.id}>
                    <LeaderboardPlayerControl
                      entry={entry}
                      href={hrefFor?.(entry)}
                      linkState={linkState}
                      onSelect={onSelect}
                      className={cn(
                        'flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-transparent p-3 text-center transition-colors',
                        'hover:border-primary/40 hover:bg-primary/10',
                        entry.id === viewerId && 'ring-1 ring-primary/50',
                      )}
                    >
                      <span className="relative">
                        <UserAvatar
                          username={entry.username}
                          avatar={entry.avatar}
                          className={cn(
                            champion ? 'h-20 w-20 md:h-24 md:w-24' : 'h-14 w-14 md:h-16 md:w-16',
                            'border-2',
                            podiumRingClass(group.rank),
                          )}
                        />
                        <LeaderboardLevelBadge level={entry.level} size={champion ? 'md' : 'sm'} />
                      </span>
                      <span className="min-w-0 w-full">
                        <span className="block truncate font-semibold">{entry.username}</span>
                        <span
                          className={cn(
                            'mt-1 flex items-center justify-center gap-1 font-display font-black tabular-nums',
                            champion ? 'text-2xl' : 'text-lg',
                            podiumScoreClass(group.rank),
                          )}
                        >
                          <MetricIcon className="h-4 w-4" aria-hidden="true" />
                          {formatLeaderboardValue(entry)}
                        </span>
                        {detail && (
                          <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                            {detail}
                          </span>
                        )}
                      </span>
                    </LeaderboardPlayerControl>
                  </li>
                );
              })}
            </ul>
            {extra > 0 && (
              <p className="mt-2 text-center text-xs font-semibold text-muted-foreground">
                {LEADERBOARD_COPY.moreTied(extra)}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
