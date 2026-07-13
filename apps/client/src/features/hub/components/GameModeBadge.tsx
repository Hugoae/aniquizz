import { Trophy, Zap } from 'lucide-react';
import type { GameType } from '@aniquizz/shared';
import { GAME_TYPE_LABELS } from '@aniquizz/shared';
import { cn } from '@/lib/utils';

const COMPACT_LABELS: Record<GameType, string> = {
  standard: 'STD',
  sprint: 'SPR',
};

interface GameModeBadgeProps {
  gameType?: GameType;
  /** Short label for room list cards (STD / SPR). */
  compact?: boolean;
  className?: string;
}

/** Mode pill — trophy for Standard, lightning for Sprint. */
export function GameModeBadge({ gameType = 'standard', compact = false, className }: GameModeBadgeProps) {
  const isSprint = gameType === 'sprint';
  const Icon = isSprint ? Zap : Trophy;
  const label = compact ? COMPACT_LABELS[gameType] : GAME_TYPE_LABELS[gameType];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg bg-primary font-black uppercase tracking-wider text-primary-foreground shadow-glow',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-4 py-1.5 text-sm',
        className,
      )}
    >
      <Icon className={cn(compact ? 'h-3 w-3' : 'h-5 w-5', !isSprint && 'fill-current')} aria-hidden="true" />
      {label}
    </span>
  );
}
