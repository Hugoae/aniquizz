import type { Dispatch, SetStateAction } from 'react';
import {
  Music2,
  Disc,
  Keyboard,
  MousePointer,
  Shuffle,
  Ungroup,
  Target,
  type LucideIcon,
} from 'lucide-react';
import {
  GAME_CONFIG,
  PRECISION_META,
  type GameConfig,
  type Precision,
} from '@aniquizz/shared';

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
  { id: 'ending', label: 'Endings', icon: Disc, disabled: true },
];

/** Difficulty tiers, each with its semantic "active" token styling. */
export interface DifficultyOption {
  id: string;
  label: string;
  activeClassName: string;
}

export const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { id: 'easy', label: 'Facile', activeClassName: 'border-success bg-success/15 text-success' },
  { id: 'medium', label: 'Moyen', activeClassName: 'border-warning bg-warning/15 text-warning' },
  { id: 'hard', label: 'Difficile', activeClassName: 'border-destructive bg-destructive/15 text-destructive' },
];

export interface ResponseModeOption {
  id: GameConfig['responseType'];
  label: string;
  description: string;
  icon: LucideIcon;
}

export const RESPONSE_MODES: ResponseModeOption[] = [
  { id: 'typing', label: 'Typing', description: 'Écris le titre', icon: Keyboard },
  { id: 'qcm', label: 'QCM', description: '4 propositions', icon: MousePointer },
  { id: 'mix', label: 'Mix', description: 'Typing + QCM', icon: Shuffle },
];

export interface PrecisionOption {
  id: Precision;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const PRECISION_OPTIONS: PrecisionOption[] = [
  {
    id: 'franchise',
    label: PRECISION_META.franchise.label,
    description: PRECISION_META.franchise.description,
    icon: Ungroup,
  },
  {
    id: 'anime',
    label: PRECISION_META.anime.label,
    description: PRECISION_META.anime.description,
    icon: Target,
  },
];

/**
 * Rough playtime estimate for the current config: each song costs its guess
 * window plus the reveal shown afterwards. Used for the "≈ N min" hint.
 */
export function estimateMatchMinutes(config: Pick<GameConfig, 'soundCount' | 'guessDuration'>): number {
  const revealPerSong = GAME_CONFIG.TIMERS.GUESS_REVEAL / 1000;
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
