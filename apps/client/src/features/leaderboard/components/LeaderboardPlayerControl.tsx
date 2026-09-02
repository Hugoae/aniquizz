import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LeaderboardEntry } from '@aniquizz/shared';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';
import {
  formatLeaderboardAnnouncement,
  LEADERBOARD_COPY,
} from '@/features/leaderboard/copy/leaderboardCopy';
import type { ProfileFromLeaderboardState } from '@/features/leaderboard/lib/leaderboardNavigation';
import { cn } from '@/lib/utils';

interface LeaderboardPlayerControlProps {
  entry: LeaderboardEntry;
  className?: string;
  children: ReactNode;
  href?: string;
  linkState?: ProfileFromLeaderboardState;
  onSelect?: (entry: LeaderboardEntry) => void;
}

export function LeaderboardPlayerControl({
  entry,
  className,
  children,
  href,
  linkState,
  onSelect,
}: LeaderboardPlayerControlProps) {
  const label = `${LEADERBOARD_COPY.viewProfileOf(entry.username)}. ${formatLeaderboardAnnouncement(entry)}`;
  const classes = cn(FOCUS_RING, className);

  if (href) {
    return (
      <Link to={href} state={linkState} aria-label={label} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onSelect?.(entry)} aria-label={label} className={classes}>
      {children}
    </button>
  );
}
