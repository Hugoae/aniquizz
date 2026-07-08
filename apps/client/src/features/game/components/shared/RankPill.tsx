import { cn } from '@/lib/utils';
import { rankAccent } from '@/features/game/utils/ranking';

interface RankPillProps {
  rank: number;
  /** When false, shows "#-" like the in-game sidebar before scores spread. */
  established?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/** Competition rank pill — matches GameSidebar / in-game player cards (`#1`, `#2`, …). */
export function RankPill({ rank, established = true, size = 'md', className }: RankPillProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md font-bold',
        size === 'sm' ? 'h-6 min-w-[1.5rem] px-1 text-xs' : 'h-8 min-w-[2rem] px-1.5 text-sm',
        established ? rankAccent(rank) : 'bg-secondary text-muted-foreground',
        established && rank === 1 && 'shadow-[0_0_12px_hsl(var(--warning)/0.25)]',
        className,
      )}
    >
      #{established ? rank : '-'}
    </span>
  );
}
