import type { LucideIcon } from 'lucide-react';
import { Calendar, Disc, Gauge, Music2, Shuffle, Target } from 'lucide-react';
import type { GameType } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { SETTING_CHIP_NEUTRAL, SettingChip } from '@/features/hub/components/SettingChip';
import { GameModeBadge } from '@/features/hub/components/GameModeBadge';
import { MODE_CHROME } from '@/features/hub/components/modeChrome';

export interface ConfigBadgesData {
  sourceLabel: string;
  difficultyLabel: string;
  difficultyClassName?: string;
  /** Selected catalogue types. Absent on the daily quiz. */
  soundTypes?: string[];
  precisionLabel: string;
  modeLabel: string;
  gameType?: GameType;
  speedBonusEnabled?: boolean;
  /** Quiz du jour uses the gold tag instead of a match mode. */
  daily?: boolean;
}

const SONG_TYPE_CHIPS = [
  { id: 'opening', label: 'Openings', icon: Music2 },
  { id: 'ending', label: 'Endings', icon: Disc },
] as const;

/** In-game corner: the mode first, then the few rules that change the draw. */
export function ConfigBadges({
  data,
  positionClassName,
}: {
  data: ConfigBadgesData;
  positionClassName?: string;
}) {
  const chips: { key: string; icon: LucideIcon; value: string; className: string }[] = [
    {
      key: 'diff',
      icon: Gauge,
      value: data.difficultyLabel,
      className: data.difficultyClassName ?? SETTING_CHIP_NEUTRAL,
    },
    ...SONG_TYPE_CHIPS.filter((type) => data.soundTypes?.includes(type.id)).map((type) => ({
      key: type.id,
      icon: type.icon,
      value: type.label,
      className: SETTING_CHIP_NEUTRAL,
    })),
    { key: 'source', icon: Shuffle, value: data.sourceLabel, className: SETTING_CHIP_NEUTRAL },
    { key: 'precision', icon: Target, value: data.precisionLabel, className: SETTING_CHIP_NEUTRAL },
  ];

  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-4 z-40 flex max-w-[min(100%,28rem)] flex-col items-end gap-2',
        positionClassName ?? 'right-4',
      )}
    >
      {data.daily ? (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-black uppercase tracking-wider',
            MODE_CHROME.daily.solid,
          )}
        >
          <Calendar className="h-5 w-5" aria-hidden />
          {data.modeLabel}
        </span>
      ) : (
        <GameModeBadge
          gameType={data.gameType ?? 'standard'}
          speedBonusEnabled={data.speedBonusEnabled}
        />
      )}
      <div className="flex flex-row flex-wrap items-center justify-end gap-1.5 opacity-80">
        {chips.map((chip) => (
          <SettingChip
            key={chip.key}
            icon={chip.icon}
            value={chip.value}
            className={chip.className}
            hideLabel
          />
        ))}
      </div>
    </div>
  );
}
