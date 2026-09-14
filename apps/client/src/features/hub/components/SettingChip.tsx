import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Default chip surface — shared across lobbies, room list, game-over, solo recap. */
export const SETTING_CHIP_NEUTRAL =
  'border-border/50 bg-secondary/30 text-foreground';

export interface SettingChipProps {
  icon: LucideIcon;
  label?: string;
  value: string;
  /** Override chip colors (e.g. difficulty tiers). Defaults to neutral. */
  className?: string;
  hideLabel?: boolean;
  size?: 'sm' | 'lg';
}

/** Compact room-setting chip — rounded-lg, fixed height, neutral by default. */
export function SettingChip({
  icon: Icon,
  label,
  value,
  className = SETTING_CHIP_NEUTRAL,
  hideLabel = false,
  size = 'sm',
}: SettingChipProps) {
  const semantic = className !== SETTING_CHIP_NEUTRAL;
  const onGradient = className.includes('gradient-to-r');
  const large = size === 'lg';

  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center rounded-lg border font-semibold',
        large ? 'h-9 gap-2 px-3 text-sm' : 'h-7 gap-1.5 px-2.5 text-xs',
        className,
      )}
    >
      <Icon
        className={cn(
          'shrink-0',
          large ? 'h-4 w-4' : 'h-3.5 w-3.5',
          onGradient ? 'text-white opacity-90' : semantic ? 'opacity-90' : 'text-muted-foreground',
        )}
        aria-hidden="true"
      />
      {label && !hideLabel && (
        <span
          className={cn(
            'font-bold uppercase tracking-wide text-muted-foreground',
            large ? 'text-xs' : 'text-[10px]',
          )}
        >
          {label}
        </span>
      )}
      <span
        className={cn('truncate capitalize', hideLabel && semantic && 'text-inherit')}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

export function SettingChipList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>;
}
