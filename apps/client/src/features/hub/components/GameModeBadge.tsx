import { Trophy, Zap, Timer } from 'lucide-react';
import { GAME_TYPE_LABELS, type GameType } from '@aniquizz/shared';
import { cn } from '@/lib/utils';

interface GameModeBadgeProps {
  gameType?: GameType;
  speedBonusEnabled?: boolean;
  /** Short label for room list cards and the game-over rail (STD). */
  compact?: boolean;
  className?: string;
}

/** Mode pill — Standard trophy, with a corner lightning when Vitesse is on. */
export function GameModeBadge({
  gameType = 'standard',
  speedBonusEnabled = false,
  compact = false,
  className,
}: GameModeBadgeProps) {
  const label = compact ? 'STD' : GAME_TYPE_LABELS[gameType];
  const ariaLabel = speedBonusEnabled
    ? 'Standard, bonus Vitesse'
    : `Mode ${GAME_TYPE_LABELS[gameType]}`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg bg-primary font-black uppercase tracking-wider text-primary-foreground shadow-glow',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-4 py-1.5 text-sm',
        speedBonusEnabled && (compact ? 'pr-2.5 pt-1' : 'pr-5 pt-1'),
        className,
      )}
      aria-label={ariaLabel}
    >
      <span className="relative inline-flex shrink-0">
        <Trophy className={cn(compact ? 'h-3 w-3' : 'h-5 w-5', 'fill-current')} aria-hidden />
        {speedBonusEnabled ? (
          <span
            className={cn(
              'absolute flex items-center justify-center rounded-full bg-accent text-accent-foreground',
              compact ? '-right-1.5 -top-1 h-2.5 w-2.5' : '-right-1.5 -top-1.5 h-3.5 w-3.5',
            )}
            aria-hidden
          >
            <Zap
              className={compact ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5'}
              fill="currentColor"
              aria-hidden
            />
          </span>
        ) : null}
      </span>
      <span>{label}</span>
    </span>
  );
}
