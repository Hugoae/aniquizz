import type { LucideIcon } from 'lucide-react';
import { Clock, Eye, Gauge, Keyboard, ListMusic, Shuffle, Target } from 'lucide-react';
import type { GameConfig } from '@aniquizz/shared';
import { getPrecisionChipLabel, normalizeVideoMode, VIDEO_MODE_LABELS } from '@aniquizz/shared';
import { SETTING_CHIP_NEUTRAL } from '@/features/hub/components/SettingChip';
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

function sourceLabel(selection: GameConfig['soundSelection']): string {
  switch (selection) {
    case 'watched':
      return 'Ma liste';
    case 'playlist':
      return 'Playlists';
    case 'mix':
      return 'Mix';
    default:
      return 'Aléatoire';
  }
}

/** Difficulty chip — semantic color; combos use split / triple gradients. */
export function getDifficultyBadge(diffs: string[] = []): { label: string; className: string } {
  const hasEasy = diffs.includes('easy');
  const hasMedium = diffs.includes('medium');
  const hasHard = diffs.includes('hard');

  if (diffs.length === 0) {
    return { label: 'Mixte', className: SETTING_CHIP_NEUTRAL };
  }

  if (hasEasy && hasMedium && hasHard) {
    return {
      label: 'Tout',
      className:
        'border-transparent bg-gradient-to-r from-success/80 via-warning/80 to-destructive/80 text-white',
    };
  }
  if (hasEasy && hasMedium) {
    return {
      label: 'Facile & Moyen',
      className: 'border-transparent bg-gradient-to-r from-success/80 to-warning/80 text-white',
    };
  }
  if (hasMedium && hasHard) {
    return {
      label: 'Moyen & Diff.',
      className: 'border-transparent bg-gradient-to-r from-warning/80 to-destructive/80 text-white',
    };
  }
  if (hasEasy && hasHard) {
    return {
      label: 'Facile & Diff.',
      className: 'border-transparent bg-gradient-to-r from-success/80 to-destructive/80 text-white',
    };
  }

  if (hasEasy) {
    return { label: 'Facile', className: 'border-success/25 bg-success/10 text-success' };
  }
  if (hasMedium) {
    return { label: 'Moyen', className: 'border-warning/25 bg-warning/10 text-warning' };
  }
  if (hasHard) {
    return { label: 'Difficile', className: 'border-destructive/25 bg-destructive/10 text-destructive' };
  }

  return { label: 'Mixte', className: SETTING_CHIP_NEUTRAL };
}

/** Core room settings (excluding difficulty) — neutral styling, consistent icons. */
export function buildRoomSettingBadges(
  s: Pick<GameConfig, 'soundCount' | 'guessDuration' | 'precision' | 'responseType' | 'soundSelection'>,
): SettingChipSpec[] {
  return [
    {
      key: 'sounds',
      icon: ListMusic,
      label: 'Sons',
      value: String(s.soundCount),
      className: SETTING_CHIP_NEUTRAL,
    },
    {
      key: 'time',
      icon: Clock,
      label: 'Temps',
      value: `${s.guessDuration}s`,
      className: SETTING_CHIP_NEUTRAL,
    },
    {
      key: 'precision',
      icon: Target,
      label: 'Précision',
      value: getPrecisionChipLabel(s.precision),
      className: SETTING_CHIP_NEUTRAL,
    },
    {
      key: 'type',
      icon: Keyboard,
      label: 'Réponse',
      value: responseTypeLabel(s.responseType),
      className: SETTING_CHIP_NEUTRAL,
    },
    {
      key: 'source',
      icon: Shuffle,
      label: 'Source',
      value: sourceLabel(s.soundSelection),
      className: SETTING_CHIP_NEUTRAL,
    },
  ];
}

/** Full lobby / room-list chip row — difficulty first, then shared settings + video. */
export function buildLobbySettingChips(
  config: Pick<
    GameConfig,
    | 'soundCount'
    | 'guessDuration'
    | 'precision'
    | 'responseType'
    | 'soundSelection'
    | 'difficulty'
    | 'videoMode'
  >,
): SettingChipSpec[] {
  const difficulty = getDifficultyBadge(config.difficulty ?? []);
  const videoMode = normalizeVideoMode(config.videoMode);

  return [
    {
      key: 'diff',
      icon: Gauge,
      label: 'Diff',
      value: difficulty.label,
      className: difficulty.className,
    },
    ...buildRoomSettingBadges(config),
    {
      key: 'video',
      icon: Eye,
      label: 'Vidéo',
      value: VIDEO_MODE_LABELS[videoMode],
      className: SETTING_CHIP_NEUTRAL,
    },
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
