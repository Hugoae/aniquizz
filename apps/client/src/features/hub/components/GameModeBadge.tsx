import { Trophy, Zap, Timer, AudioLines } from 'lucide-react';
import type { GameType } from '@aniquizz/shared';
import { gameTypeLabel } from '@/features/hub/copy/hubCopy';
import { pick, tx } from '@/lib/i18n/text';
import { cn } from '@/lib/utils';
import { modeChrome } from '@/features/hub/components/modeChrome';

interface GameModeBadgeProps {
  gameType?: GameType;
  speedBonusEnabled?: boolean;
  /** Short label for room list cards and the game-over rail (STD / CLM). */
  compact?: boolean;
  className?: string;
}

/** Mode pill — Standard trophy, CLM timer, lightning overlay when Vitesse is on. */
export function GameModeBadge({
  gameType = 'standard',
  speedBonusEnabled = false,
  compact = false,
  className,
}: GameModeBadgeProps) {
  const timeAttack = gameType === 'timeAttack';
  const evolving = gameType === 'evolving';
  const label = compact
    ? timeAttack
      ? pick('CLM', 'TIME')
      : evolving
        ? 'EVO'
        : 'STD'
    : gameTypeLabel(gameType);
  const ariaLabel = timeAttack
    ? tx('hub', 'config.modeTimeAttack')
    : evolving
      ? tx('hub', 'config.modeEvolving')
      : speedBonusEnabled
        ? tx('hub', 'config.modeSpeed')
        : tx('hub', 'config.modeNamed', { name: gameTypeLabel(gameType) });
  const Icon = timeAttack ? Timer : evolving ? AudioLines : Trophy;
  const chrome = modeChrome(gameType);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg font-black uppercase tracking-wider',
        chrome.solid,
        !timeAttack && !evolving && 'shadow-glow',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-4 py-1.5 text-sm',
        speedBonusEnabled && !timeAttack && !evolving && (compact ? 'pr-2.5 pt-1' : 'pr-5 pt-1'),
        className,
      )}
      aria-label={ariaLabel}
    >
      <span className="relative inline-flex shrink-0">
        {!timeAttack ? (
          <Icon
            className={cn(compact ? 'h-3 w-3' : 'h-5 w-5', !evolving && 'fill-current')}
            aria-hidden
          />
        ) : (
          <Icon className={cn(compact ? 'h-3 w-3' : 'h-5 w-5')} aria-hidden />
        )}
        {speedBonusEnabled && !timeAttack ? (
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
