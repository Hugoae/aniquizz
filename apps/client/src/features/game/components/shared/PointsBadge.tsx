import { cn } from '@/lib/utils';

interface PointsBadgeProps {
  points: number;
  className?: string;
}

/** Floating reward badge showing points earned this round (accent = reward token). */
export function PointsBadge({ points, className }: PointsBadgeProps) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/20 px-3 py-1 text-sm font-bold text-accent', className)}>
      <span>+{points}</span>
      <span className="text-xs font-normal">pts</span>
    </div>
  );
}
