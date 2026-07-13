import type { LucideIcon } from 'lucide-react';
import { Gauge, Shuffle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SETTING_CHIP_NEUTRAL, SettingChip } from '@/features/hub/components/SettingChip';

export interface ConfigBadgesData {
  sourceLabel: string;
  difficultyLabel: string;
  precisionLabel: string;
  modeLabel: string;
}

/** In-game corner badges — same chip system as lobby, value-only for compact overlay. */
export function ConfigBadges({ data, positionClassName }: { data: ConfigBadgesData; positionClassName?: string }) {
  const chips: { key: string; icon: LucideIcon; value: string }[] = [
    { key: 'diff', icon: Gauge, value: data.difficultyLabel },
    { key: 'source', icon: Shuffle, value: data.sourceLabel },
    { key: 'precision', icon: Target, value: data.precisionLabel },
  ];

  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-4 z-40 flex flex-row items-center gap-2 opacity-80 transition-opacity hover:opacity-100',
        positionClassName ?? 'right-4',
      )}
    >
      {chips.map((chip) => (
        <SettingChip
          key={chip.key}
          icon={chip.icon}
          value={chip.value}
          className={SETTING_CHIP_NEUTRAL}
          hideLabel
        />
      ))}
    </div>
  );
}
