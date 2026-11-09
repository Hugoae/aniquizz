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

function tiedFaceMetrics(count: number, champion: boolean): { size: string; overlap: string } {
  if (count <= 2) {
    return {
      size: champion ? 'h-20 w-20 md:h-24 md:w-24' : 'h-14 w-14 md:h-16 md:w-16',
      overlap: champion ? '-ml-7 md:-ml-8' : '-ml-5 md:-ml-6',
    };
  }
  if (count === 3) {
    return {
      size: champion ? 'h-16 w-16 md:h-20 md:w-20' : 'h-12 w-12 md:h-14 md:w-14',
      overlap: champion ? '-ml-6 md:-ml-8' : '-ml-4 md:-ml-5',
    };
  }
  return {
    size: 'h-10 w-10 md:h-12 md:w-12',
    overlap: '-ml-4',
  };
}

function PodiumValue({
  entry,
  rank,
  champion,
  showDetail = true,
}: {
  entry: LeaderboardEntry;
  rank: number;
  champion: boolean;
  showDetail?: boolean;
}) {
  const MetricIcon = LEADERBOARD_METRIC_UI[entry.metric].icon;
  const detail = showDetail ? formatLeaderboardDetail(entry) : null;
  return (
    <>
      <span
        className={cn(
          'mt-1 flex items-center justify-center gap-1 font-display font-black tabular-nums',
          champion ? 'text-2xl' : 'text-lg',
          podiumScoreClass(rank),
        )}
      >
        <MetricIcon className="h-4 w-4" aria-hidden="true" />
        {formatLeaderboardValue(entry)}
      </span>
      {detail && (
        <span className="mt-0.5 block text-xs font-medium text-muted-foreground">{detail}</span>
      )}
    </>
  );
}

/** One shared step: faces overlap on a row so a tie does not stretch the card. */
function TiedPodiumFaces({
  entries,
  rank,
  champion,
  viewerId,
  hrefFor,
  linkState,
  onSelect,
}: {
  entries: LeaderboardEntry[];
  rank: number;
  champion: boolean;
  viewerId?: string | null;
  hrefFor?: (entry: LeaderboardEntry) => string;
  linkState?: ProfileFromLeaderboardState;
  onSelect?: (entry: LeaderboardEntry) => void;
}) {
  const { size, overlap } = tiedFaceMetrics(entries.length, champion);
  const details = entries.map((entry) => formatLeaderboardDetail(entry));
  const showDetail = details.every((detail) => detail === details[0]);

  return (
    <div className="flex flex-col items-center px-1 pb-1">
      <div className="flex items-center justify-center">
        {entries.map((entry, index) => (
          <span
            key={entry.id}
            className={cn('relative shrink-0 hover:!z-20', index > 0 && overlap)}
            style={{ zIndex: index }}
          >
            <LeaderboardPlayerControl
              entry={entry}
              href={hrefFor?.(entry)}
              linkState={linkState}
              onSelect={onSelect}
              className={cn(
                'relative block rounded-full',
                entry.id === viewerId && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
              )}
            >
              <span className="relative block">
                <UserAvatar
                  username={entry.username}
                  avatar={entry.avatar}
                  className={cn(
                    size,
                    'border-2 border-background',
                    podiumRingClass(rank),
                    'border-background',
                  )}
                />
              </span>
            </LeaderboardPlayerControl>
          </span>
        ))}
      </div>
      <p className="mt-3 flex w-full min-w-0 flex-wrap items-center justify-center gap-x-1.5 px-1 text-center text-sm font-semibold leading-tight">
        {entries.map((entry, index) => (
          <span key={entry.id} className="inline-flex min-w-0 max-w-full items-center gap-1">
            {index > 0 && <span className="font-normal text-muted-foreground">·</span>}
            <span className="truncate">{entry.username}</span>
            <LeaderboardLevelBadge level={entry.level} size="sm" inline />
          </span>
        ))}
      </p>
      <div className="w-full text-center">
        <PodiumValue entry={entries[0]} rank={rank} champion={champion} showDetail={showDetail} />
      </div>
    </div>
  );
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
            {group.entries.length > 1 ? (
              <TiedPodiumFaces
                entries={group.entries}
                rank={group.rank}
                champion={champion}
                viewerId={viewerId}
                hrefFor={hrefFor}
                linkState={linkState}
                onSelect={onSelect}
              />
            ) : (
              group.entries[0] && (
                <LeaderboardPlayerControl
                  entry={group.entries[0]}
                  href={hrefFor?.(group.entries[0])}
                  linkState={linkState}
                  onSelect={onSelect}
                  className={cn(
                    'flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-transparent p-3 text-center transition-colors',
                    'hover:border-primary/40 hover:bg-primary/10',
                    group.entries[0].id === viewerId && 'ring-1 ring-primary/50',
                  )}
                >
                  <span className="relative">
                    <UserAvatar
                      username={group.entries[0].username}
                      avatar={group.entries[0].avatar}
                      className={cn(
                        champion ? 'h-20 w-20 md:h-24 md:w-24' : 'h-14 w-14 md:h-16 md:w-16',
                        'border-2',
                        podiumRingClass(group.rank),
                      )}
                    />
                    <LeaderboardLevelBadge
                      level={group.entries[0].level}
                      size={champion ? 'md' : 'sm'}
                    />
                  </span>
                  <span className="min-w-0 w-full">
                    <span className="block truncate font-semibold">
                      {group.entries[0].username}
                    </span>
                    <PodiumValue entry={group.entries[0]} rank={group.rank} champion={champion} />
                  </span>
                </LeaderboardPlayerControl>
              )
            )}
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
