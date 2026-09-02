import { ChevronRight } from 'lucide-react';
import type { LeaderboardEntry } from '@aniquizz/shared';
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
import { podiumScoreClass, rowRankFrameClass } from '@/features/leaderboard/lib/leaderboardPodiumStyles';
import { cn } from '@/lib/utils';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isViewer: boolean;
  href?: string;
  linkState?: ProfileFromLeaderboardState;
  onSelect?: (entry: LeaderboardEntry) => void;
}

export function LeaderboardRow({ entry, isViewer, href, linkState, onSelect }: LeaderboardRowProps) {
  const detail = formatLeaderboardDetail(entry);
  const MetricIcon = LEADERBOARD_METRIC_UI[entry.metric].icon;
  const topThree = entry.rank <= 3;

  return (
    <LeaderboardPlayerControl
      entry={entry}
      href={href}
      linkState={linkState}
      onSelect={onSelect}
      className={cn(
        'glass-card flex w-full cursor-pointer items-center gap-3 overflow-visible p-3 text-left hover-lift',
        entry.metric === 'xp' && 'pb-4',
        rowRankFrameClass(entry.rank),
        isViewer && 'border-primary/40 bg-primary/10',
      )}
    >
      <RankPill rank={entry.rank} size={topThree ? 'md' : 'sm'} />
      <span className="relative shrink-0">
        <UserAvatar username={entry.username} avatar={entry.avatar} className="h-9 w-9" />
        {entry.metric === 'xp' && <LeaderboardLevelBadge level={entry.level} size="sm" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{entry.username}</span>
          {isViewer && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              {LEADERBOARD_COPY.you}
            </span>
          )}
        </span>
        {detail && <span className="block text-xs text-muted-foreground">{detail}</span>}
      </span>
      <span
        className={cn(
          'flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums',
          topThree ? podiumScoreClass(entry.rank) : LEADERBOARD_METRIC_UI[entry.metric].color,
        )}
      >
        <MetricIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {formatLeaderboardValue(entry)}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </LeaderboardPlayerControl>
  );
}
