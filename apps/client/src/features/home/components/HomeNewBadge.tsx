import type { CSSProperties } from 'react';
import { HOME_COPY } from '@/features/home/copy/homeCopy';

interface HomeNewBadgeProps {
  /** Stagger the pop-in so neighbouring badges do not land in lockstep. */
  delayMs?: number;
}

export function HomeNewBadge({ delayMs = 0 }: HomeNewBadgeProps) {
  return (
    <span
      className="home-new-badge-wrap"
      style={{ '--home-new-delay': `${delayMs}ms` } as CSSProperties}
      aria-hidden="true"
    >
      <span className="home-new-badge-ping" />
      <span className="home-new-badge">{HOME_COPY.newBadge}</span>
    </span>
  );
}
