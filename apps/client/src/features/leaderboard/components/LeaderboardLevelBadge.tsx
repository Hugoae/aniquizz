import { cn } from '@/lib/utils';
import { LEADERBOARD_COPY } from '@/features/leaderboard/copy/leaderboardCopy';

interface LeaderboardLevelBadgeProps {
  level: number;
  size?: 'sm' | 'md';
}

/** Same Nv chip as lobby player cards. */
export function LeaderboardLevelBadge({ level, size = 'md' }: LeaderboardLevelBadgeProps) {
  return (
    <span
      className={cn(
        'absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center justify-center gap-0.5 rounded-full border-2 border-card bg-gradient-to-br from-primary to-accent font-black tabular-nums text-primary-foreground shadow-md',
        size === 'sm' ? 'h-5 min-w-[1.85rem] px-1 text-[9px]' : 'h-6 min-w-[2.25rem] px-1.5 text-[11px]',
      )}
      title={LEADERBOARD_COPY.level(level)}
    >
      <span className="text-[8px] font-bold uppercase opacity-80">Nv</span>
      {level}
    </span>
  );
}
