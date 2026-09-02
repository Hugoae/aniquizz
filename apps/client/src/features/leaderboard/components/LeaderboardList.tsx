import type { LeaderboardEntry } from '@aniquizz/shared';
import { LeaderboardRow } from '@/features/leaderboard/components/LeaderboardRow';
import type { ProfileFromLeaderboardState } from '@/features/leaderboard/lib/leaderboardNavigation';

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  viewerId?: string | null;
  hrefFor?: (entry: LeaderboardEntry) => string;
  linkState?: ProfileFromLeaderboardState;
  onSelect?: (entry: LeaderboardEntry) => void;
}

export function LeaderboardList({
  entries,
  viewerId,
  hrefFor,
  linkState,
  onSelect,
}: LeaderboardListProps) {
  return (
    <ol className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.id}>
          <LeaderboardRow
            entry={entry}
            isViewer={entry.id === viewerId}
            href={hrefFor?.(entry)}
            linkState={linkState}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ol>
  );
}
