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
}

/** Compact room-setting chip — rounded-lg, fixed height, neutral by default. */
export function SettingChip({
  icon: Icon,
  label,
  value,
  className = SETTING_CHIP_NEUTRAL,
  hideLabel = false,
}: SettingChipProps) {
  const semantic = className !== SETTING_CHIP_NEUTRAL;
  const onGradient = className.includes('gradient-to-r');

  return (
    <div
      className={cn(
        'inline-flex h-7 max-w-full items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold',
        className,
      )}
    >
      <Icon
        className={cn(
          'h-3.5 w-3.5 shrink-0',
          onGradient ? 'text-white opacity-90' : semantic ? 'opacity-90' : 'text-muted-foreground',
        )}
        aria-hidden="true"
      />
      {label && !hideLabel && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      )}
      <span className={cn('truncate capitalize', hideLabel && semantic && 'text-inherit')}>{value}</span>
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
