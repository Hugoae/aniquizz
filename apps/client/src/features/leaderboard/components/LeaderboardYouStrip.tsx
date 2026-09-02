import type { LeaderboardEntry, LeaderboardViewer } from '@aniquizz/shared';
import { LeaderboardRow } from '@/features/leaderboard/components/LeaderboardRow';
import { LEADERBOARD_COPY } from '@/features/leaderboard/copy/leaderboardCopy';
import type { ProfileFromLeaderboardState } from '@/features/leaderboard/lib/leaderboardNavigation';

interface LeaderboardYouStripProps {
  viewer: LeaderboardViewer | null;
  session: boolean;
  visibleIds: Set<string>;
  hrefFor?: (entry: LeaderboardEntry) => string;
  linkState?: ProfileFromLeaderboardState;
  onSelect?: (entry: LeaderboardEntry) => void;
}

export function LeaderboardYouStrip({
  viewer,
  session,
  visibleIds,
  hrefFor,
  linkState,
  onSelect,
}: LeaderboardYouStripProps) {
  if (!session) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 px-4 py-3 text-sm text-muted-foreground">
        {LEADERBOARD_COPY.loginToCompare}
      </p>
    );
  }
  if (!viewer || viewer.status === 'unranked') {
    return (
      <p className="rounded-xl border border-dashed border-border/80 px-4 py-3 text-sm text-muted-foreground">
        {LEADERBOARD_COPY.unranked}
      </p>
    );
  }
  if (viewer.status === 'ineligible') {
    return (
      <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
        {LEADERBOARD_COPY.ineligible(viewer.totalGuesses, viewer.requiredGuesses)}
      </p>
    );
  }
  if (visibleIds.has(viewer.entry.id)) return null;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-primary">
        {LEADERBOARD_COPY.outsideTop}
      </p>
      <LeaderboardRow
        entry={viewer.entry}
        isViewer
        href={hrefFor?.(viewer.entry)}
        linkState={linkState}
        onSelect={onSelect}
      />
    </div>
  );
}
