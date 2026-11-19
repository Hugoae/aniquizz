import type { Dispatch, SetStateAction } from 'react';
import {
  Music2,
  Disc,
  Keyboard,
  Grid2X2,
  Shuffle,
  Ungroup,
  Target,
  Mic2,
  type LucideIcon,
} from 'lucide-react';
import {
  revealDurationSeconds,
  normalizeTimeBudgetSeconds,
  type GameConfig,
  type Precision,
} from '@aniquizz/shared';
import { pick, tx } from '@/lib/i18n/text';

export {
  normalizePrecision,
  getPrecisionLabel,
  getPrecisionChipLabel,
  getPrecisionMeta,
  PRECISION_META,
} from '@aniquizz/shared';

/** A togglable "sound type" filter (some tiers are gated for now). */
export interface SoundTypeOption {
  id: string;
  label: string;
  icon: LucideIcon;
  disabled: boolean;
}

export const SOUND_TYPES: SoundTypeOption[] = [
  { id: 'opening', label: 'Openings', icon: Music2, disabled: false },
  { id: 'ending', label: 'Endings', icon: Disc, disabled: false },
];

/** Difficulty tiers, each with its semantic "active" token styling. */
export interface DifficultyOption {
  id: string;
  label: string;
  activeClassName: string;
}

export const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    id: 'easy',
    get label() {
      return tx('hub', 'config.difficultyEasy');
    },
    activeClassName: 'border-success bg-success/15 text-success',
  },
  {
    id: 'medium',
    get label() {
      return tx('hub', 'config.difficultyMedium');
    },
    activeClassName: 'border-warning bg-warning/15 text-warning',
  },
  {
    id: 'hard',
    get label() {
      return tx('hub', 'config.difficultyHard');
    },
    activeClassName: 'border-destructive bg-destructive/15 text-destructive',
  },
];

export interface ResponseModeOption {
  id: GameConfig['responseType'];
  label: string;
  description: string;
  icon: LucideIcon;
}

export const RESPONSE_MODES: ResponseModeOption[] = [
  {
    id: 'typing',
    label: 'Typing',
    get description() {
      return tx('hub', 'config.responseTyping');
    },
    icon: Keyboard,
  },
  {
    id: 'qcm',
    get label() {
      return pick('QCM', 'MCQ');
    },
    get description() {
      return tx('hub', 'config.responseQcm');
    },
    icon: Grid2X2,
  },
  {
    id: 'mix',
    label: 'Mix',
    get description() {
      return tx('hub', 'config.responseMix');
    },
    icon: Shuffle,
  },
];

export interface PrecisionOption {
  id: Precision;
  label: string;
  description: string;
  icon: LucideIcon;
}

export function precisionHelp(): string {
  return tx('hub', 'config.precisionHelp');
}

export const PRECISION_OPTIONS: PrecisionOption[] = [
  {
    id: 'franchise',
    get label() {
      return tx('hub', 'precisionChip.franchise');
    },
    get description() {
      return tx('hub', 'config.precisionFranchise');
    },
    icon: Ungroup,
  },
  {
    id: 'anime',
    get label() {
      return tx('hub', 'precisionChip.anime');
    },
    get description() {
      return tx('hub', 'config.precisionAnime');
    },
    icon: Target,
  },
  {
    id: 'artist',
    get label() {
      return tx('hub', 'precisionChip.artist');
    },
    get description() {
      return tx('hub', 'config.precisionArtist');
    },
    icon: Mic2,
  },
];

/**
 * Rough playtime estimate for the current config: each song costs its guess
 * window plus the reveal shown afterwards. Used for the "≈ N min" hint.
 */
export function estimateMatchMinutes(
  config: Pick<GameConfig, 'soundCount' | 'guessDuration'> &
    Partial<Pick<GameConfig, 'gameType' | 'timeBudgetSeconds'>>,
): number {
  if (config.gameType === 'timeAttack') {
    return normalizeTimeBudgetSeconds(config.timeBudgetSeconds) / 60;
  }
  const revealPerSong = revealDurationSeconds(config.guessDuration);
  const totalSeconds = config.soundCount * (config.guessDuration + revealPerSong);
  return Math.max(1, Math.round(totalSeconds / 60));
}

/** Toggle a sound type in a config-like state (keeps at least one selected). */
export function createSoundTypeToggler<T extends { soundTypes?: string[] }>(
  setter: Dispatch<SetStateAction<T>>,
) {
  return (type: string) => {
    setter((prev) => {
      const current = prev.soundTypes || [];
      if (current.includes(type)) {
        if (current.length <= 1) return prev;
        return { ...prev, soundTypes: current.filter((t) => t !== type) };
      }
      return { ...prev, soundTypes: [...current, type] };
    });
  };
}
