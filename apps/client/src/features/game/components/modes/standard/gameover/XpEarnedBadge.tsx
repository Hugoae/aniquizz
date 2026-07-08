import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XpEarnedBadgeProps {
  xp: number;
  className?: string;
}

/** Compact +XP pill shared by solo score card and multi ranking rows. */
export function XpEarnedBadge({ xp, className }: XpEarnedBadgeProps) {
  if (xp <= 0) return null;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-0.5 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-bold leading-none text-accent',
        className,
      )}
    >
      <Sparkles className="h-2.5 w-2.5" aria-hidden />
      +{xp} XP
    </div>
  );
}
