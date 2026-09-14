import {
  DAILY_GUESS_MS,
  DAILY_PRECISION,
  DAILY_RESPONSE_TYPE,
  DAILY_ROUND_COUNT,
  SONG_START_MODE_LABELS,
} from '@aniquizz/shared';
import { Music2 } from 'lucide-react';
import { SettingChip, SettingChipList, SETTING_CHIP_NEUTRAL } from '@/features/hub/components/SettingChip';
import { buildRoomSettingBadges } from '@/features/hub/components/roomSettings';
import { cn } from '@/lib/utils';

/** Same lobby/room-list capsules: 5 songs, 15s, Anime, QCM, random clip start. */
export function DailyRuleChips({
  className,
  size = 'sm',
  stacked = false,
  guessSeconds,
}: {
  className?: string;
  size?: 'sm' | 'lg';
  /** Two rows so the landing hero stays clear of the side leaderboard. */
  stacked?: boolean;
  guessSeconds?: number;
}) {
  const chips = [
    ...buildRoomSettingBadges({
      soundCount: DAILY_ROUND_COUNT,
      guessDuration: guessSeconds ?? DAILY_GUESS_MS / 1000,
      precision: DAILY_PRECISION,
      responseType: DAILY_RESPONSE_TYPE,
      soundSelection: 'random',
    }).filter((chip) => chip.key !== 'source'),
    {
      key: 'songStart',
      icon: Music2,
      label: 'Départ',
      value: SONG_START_MODE_LABELS.random,
      className: SETTING_CHIP_NEUTRAL,
    },
  ];

  const gap = size === 'lg' ? 'gap-3' : 'gap-2';
  const renderChip = (chip: (typeof chips)[number]) => (
    <SettingChip
      key={chip.key}
      icon={chip.icon}
      label={chip.label}
      value={chip.value}
      className={chip.className}
      size={size}
    />
  );

  if (stacked) {
    const mid = Math.ceil(chips.length / 2);
    return (
      <div
        data-testid="daily-rule-chips"
        className={cn('flex flex-col items-center', gap, className)}
      >
        <SettingChipList className={cn('justify-center', gap)}>
          {chips.slice(0, mid).map(renderChip)}
        </SettingChipList>
        <SettingChipList className={cn('justify-center', gap)}>
          {chips.slice(mid).map(renderChip)}
        </SettingChipList>
      </div>
    );
  }

  return (
    <SettingChipList className={cn(gap, className)}>
      {chips.map(renderChip)}
    </SettingChipList>
  );
}
