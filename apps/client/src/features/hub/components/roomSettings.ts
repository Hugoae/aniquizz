import type { LucideIcon } from 'lucide-react';
import { Clock, Eye, Flame, Gauge, Keyboard, ListMusic, Shuffle, Target } from 'lucide-react';
import type { GameConfig } from '@aniquizz/shared';
import {
  normalizeTimeAttackStreakBonusSeconds,
  normalizeTimeAttackStreakLength,
  normalizeVideoMode,
} from '@aniquizz/shared';
import { precisionChipLabel, sourceLabel, videoModeLabel } from '@/features/hub/copy/hubCopy';
import { tx } from '@/lib/i18n/text';
import { SETTING_CHIP_NEUTRAL } from '@/features/hub/components/SettingChip';
import { formatTimeAttackBudget } from '@/features/hub/components/config/timeAttackBudgetLabel';
/**
 * Shared room-settings display helpers — lobbies, room list, game-over, rules modal.
 * Neutral chips everywhere; semantic color reserved for difficulty tiers only.
 */

export interface SettingChipSpec {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  className: string;
}

function responseTypeLabel(responseType: GameConfig['responseType']): string {
  if (responseType === 'mix') return 'Mix';
  if (responseType === 'qcm') return 'QCM';
  return 'Typing';
}

/** French source chip value. Playlist names come from published packs (genre ∩ decade). */
export function sourceChipValue(
  selection: GameConfig['soundSelection'] | string | undefined,
  playlistName?: string | null,
): string {
  switch (selection) {
    case 'watched':
      return sourceLabel('watched');
    case 'playlist':
      return playlistName?.trim() || sourceLabel('playlist');
    case 'mix':
      return sourceLabel('mix');
    default:
      return sourceLabel('random');
  }
}

/** Difficulty chip — semantic color; combos use split / triple gradients. */
export function getDifficultyBadge(diffs: string[] = []): { label: string; className: string } {
  const hasEasy = diffs.includes('easy');
  const hasMedium = diffs.includes('medium');
  const hasHard = diffs.includes('hard');

  if (diffs.length === 0) {
    return { label: tx('hub', 'config.chipMixed'), className: SETTING_CHIP_NEUTRAL };
  }

  if (hasEasy && hasMedium && hasHard) {
    return {
      label: tx('hub', 'config.chipAll'),
      className:
        'border-transparent bg-gradient-to-r from-success/80 via-warning/80 to-destructive/80 text-white',
    };
  }
  if (hasEasy && hasMedium) {
    return {
      label: tx('hub', 'config.chipEasyMedium'),
      className: 'border-transparent bg-gradient-to-r from-success/80 to-warning/80 text-white',
    };
  }
  if (hasMedium && hasHard) {
    return {
      label: tx('hub', 'config.chipMediumHard'),
      className: 'border-transparent bg-gradient-to-r from-warning/80 to-destructive/80 text-white',
    };
  }
  if (hasEasy && hasHard) {
    return {
      label: tx('hub', 'config.chipEasyHard'),
      className: 'border-transparent bg-gradient-to-r from-success/80 to-destructive/80 text-white',
    };
  }

  if (hasEasy) {
    return {
      label: tx('hub', 'config.difficultyEasy'),
      className: 'border-success/25 bg-success/10 text-success',
    };
  }
  if (hasMedium) {
    return {
      label: tx('hub', 'config.difficultyMedium'),
      className: 'border-warning/25 bg-warning/10 text-warning',
    };
  }
  if (hasHard) {
    return {
      label: tx('hub', 'config.difficultyHard'),
      className: 'border-destructive/25 bg-destructive/10 text-destructive',
    };
  }

  return { label: tx('hub', 'config.chipMixed'), className: SETTING_CHIP_NEUTRAL };
}

type SourceChipSettings = Pick<
  GameConfig,
  'soundCount' | 'guessDuration' | 'precision' | 'responseType' | 'soundSelection'
> &
  Partial<Pick<GameConfig, 'gameType' | 'timeBudgetSeconds' | 'videoMode'>> & {
    playlistName?: string | null;
  };

/** Core room settings (excluding difficulty) — neutral styling, consistent icons. */
export function buildRoomSettingBadges(s: SourceChipSettings): SettingChipSpec[] {
  const timeAttack = s.gameType === 'timeAttack';
  const evolving = s.gameType === 'evolving';
  const timeValue = timeAttack
    ? formatTimeAttackBudget(s.timeBudgetSeconds)
    : evolving
      ? tx('hub', 'config.evolvingWindow')
      : `${s.guessDuration}s`;
  return [
    {
      key: 'sounds',
      icon: ListMusic,
      label: tx('hub', 'config.chipSongs'),
      value: String(s.soundCount),
      className: SETTING_CHIP_NEUTRAL,
    },
    {
      key: 'time',
      icon: Clock,
      label: timeAttack
        ? tx('hub', 'config.chipClock')
        : evolving
          ? tx('hub', 'config.chipClips')
          : tx('hub', 'config.chipTime'),
      value: timeValue,
      className: SETTING_CHIP_NEUTRAL,
    },
    {
      key: 'precision',
      icon: Target,
      label: tx('hub', 'config.chipPrecision'),
      value: precisionChipLabel(s.precision),
      className: SETTING_CHIP_NEUTRAL,
    },
    {
      key: 'type',
      icon: Keyboard,
      label: tx('hub', 'config.chipResponse'),
      value: responseTypeLabel(s.responseType),
      className: SETTING_CHIP_NEUTRAL,
    },
    {
      key: 'source',
      icon: Shuffle,
      label: tx('hub', 'config.chipSource'),
      value: sourceChipValue(s.soundSelection, s.playlistName),
      className: SETTING_CHIP_NEUTRAL,
    },
  ];
}

type StreakPrimeChipSettings = Partial<
  Pick<
    GameConfig,
    'gameType' | 'timeAttackStreakBonus' | 'timeAttackStreakLength' | 'timeAttackStreakBonusSeconds'
  >
>;

/** Visible only while the streak prime is on. Value is the cycle and the bonus. */
export function streakPrimeChip(config: StreakPrimeChipSettings): SettingChipSpec | null {
  if (config.gameType !== 'timeAttack' || config.timeAttackStreakBonus !== true) return null;
  const every = normalizeTimeAttackStreakLength(config.timeAttackStreakLength);
  const seconds = normalizeTimeAttackStreakBonusSeconds(config.timeAttackStreakBonusSeconds);
  return {
    key: 'streak-prime',
    icon: Flame,
    label: tx('hub', 'config.chipPrime'),
    value: tx('hub', 'config.chipPrimeValue', { every, seconds }),
    className: 'border-primary/40 bg-primary/15 text-primary',
  };
}

/** Full lobby / room-list chip row — difficulty first, then shared settings + video. */
export function buildLobbySettingChips(
  config: Pick<
    GameConfig,
    'soundCount' | 'guessDuration' | 'precision' | 'responseType' | 'soundSelection' | 'difficulty'
  > &
    Partial<
      Pick<
        GameConfig,
        | 'gameType'
        | 'timeBudgetSeconds'
        | 'videoMode'
        | 'timeAttackStreakBonus'
        | 'timeAttackStreakLength'
        | 'timeAttackStreakBonusSeconds'
      >
    > & {
      playlistName?: string | null;
    },
): SettingChipSpec[] {
  const difficulty = getDifficultyBadge(config.difficulty ?? []);
  const videoMode = normalizeVideoMode(config.videoMode);
  const prime = streakPrimeChip(config);
  const badges = buildRoomSettingBadges(config);
  const timeIndex = badges.findIndex((chip) => chip.key === 'time');
  if (prime && timeIndex >= 0) badges.splice(timeIndex + 1, 0, prime);

  return [
    {
      key: 'diff',
      icon: Gauge,
      label: 'Diff',
      value: difficulty.label,
      className: difficulty.className,
    },
    ...badges,
    ...(config.gameType === 'evolving'
      ? []
      : [
          {
            key: 'video',
            icon: Eye,
            label: tx('hub', 'videoLabel'),
            value: videoModeLabel(videoMode),
            className: SETTING_CHIP_NEUTRAL,
          },
        ]),
  ];
}
/** @deprecated Use SETTING_CHIP_NEUTRAL — kept for gradual migration if referenced elsewhere. */
export const SETTING_TONE_CLASSES = {
  neutral: SETTING_CHIP_NEUTRAL,
} as const;

/** @deprecated Tones removed — chips are neutral except difficulty. */
export type SettingTone = 'neutral';

/** @deprecated Use SettingChipSpec */
export type SettingBadgeSpec = SettingChipSpec;
