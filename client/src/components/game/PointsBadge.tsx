import { cn } from '@/lib/utils';

interface PointsBadgeProps {
  points: number;
  className?: string;
}

export function PointsBadge({ points, className }: PointsBadgeProps) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-3 py-1 rounded-full",
      "bg-primary/20 border border-primary/30",
      "text-primary font-bold text-sm",
      className
    )}>
      <span>+{points}</span>
      <span className="text-xs font-normal">pts</span>
    </div>
  );
}
