import type { LucideIcon } from 'lucide-react';
import { Clock, Eye, Gauge, Keyboard, ListMusic, Shuffle, Target } from 'lucide-react';
import type { GameConfig } from '@aniquizz/shared';
import { GAME_TYPE_LABELS, getPrecisionChipLabel, normalizeVideoMode, VIDEO_MODE_LABELS } from '@aniquizz/shared';
import { getDifficultyBadge } from '@/features/hub/components/roomSettings';
import { SETTING_CHIP_NEUTRAL } from '@/features/hub/components/SettingChip';
import { SOUND_TYPES } from '@/features/hub/components/config/formOptions';
import type { SettingChipSpec } from '@/features/hub/components/roomSettings';

export interface SoloLobbyRecapGroup {
  id: 'partie' | 'reponse' | 'musique' | 'video';
  label: string;
  chips: SettingChipSpec[];
}

const RESPONSE_LABELS: Record<GameConfig['responseType'], string> = {
  typing: 'Typing',
  qcm: 'QCM',
  mix: 'Mix',
};

const SOURCE_LABELS: Record<GameConfig['soundSelection'], string> = {
  random: 'Aléatoire',
  mix: 'Mix',
  watched: 'Ma liste',
  playlist: 'Playlists',
};

function soundTypeChips(types: string[] | undefined): SettingChipSpec[] {
  if (!types?.length) {
    return [{ key: 'sound-types-empty', icon: ListMusic, label: '', value: '—', className: SETTING_CHIP_NEUTRAL }];
  }

  return types
    .map((id) => SOUND_TYPES.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => ({
      key: `sound-type-${t.id}`,
      icon: t.icon as LucideIcon,
      label: '',
      value: t.label,
      className: SETTING_CHIP_NEUTRAL,
    }));
}

/** Grouped solo pre-game recap — mirrors GameForm sections (Partie / Réponse / Musique / Vidéo). */
export function buildSoloLobbyRecapGroups(config: GameConfig): SoloLobbyRecapGroup[] {
  const difficultyBadge = getDifficultyBadge(config.difficulty ?? []);
  const videoMode = normalizeVideoMode(config.videoMode);

  const responseLabel =
    config.gameType === 'sprint' ? 'Typing' : RESPONSE_LABELS[config.responseType];
  const precisionLabel = getPrecisionChipLabel(config.precision);

  return [
    {
      id: 'partie',
      label: 'Partie',
      chips: [
        {
          key: 'sound-count',
          icon: ListMusic,
          label: '',
          value: `${config.soundCount} sons`,
          className: SETTING_CHIP_NEUTRAL,
        },
        {
          key: 'guess-duration',
          icon: Clock,
          label: '',
          value: `${config.guessDuration}s`,
          className: SETTING_CHIP_NEUTRAL,
        },
      ],
    },
    {
      id: 'reponse',
      label: 'Réponse',
      chips: [
        {
          key: 'response-type',
          icon: Keyboard,
          label: '',
          value: responseLabel,
          className: SETTING_CHIP_NEUTRAL,
        },
        {
          key: 'precision',
          icon: Target,
          label: '',
          value: precisionLabel,
          className: SETTING_CHIP_NEUTRAL,
        },
      ],
    },
    {
      id: 'musique',
      label: 'Musique',
      chips: [
        ...soundTypeChips(config.soundTypes),
        {
          key: 'difficulty',
          icon: Gauge,
          label: '',
          value: difficultyBadge.label,
          className: difficultyBadge.className,
        },
        {
          key: 'source',
          icon: Shuffle,
          label: '',
          value: SOURCE_LABELS[config.soundSelection],
          className: SETTING_CHIP_NEUTRAL,
        },
      ],
    },
    {
      id: 'video',
      label: 'Vidéo',
      chips: [
        {
          key: 'video-mode',
          icon: Eye,
          label: '',
          value: VIDEO_MODE_LABELS[videoMode],
          className: SETTING_CHIP_NEUTRAL,
        },
      ],
    },
  ];
}

export function soloLobbyModeBadge(config: Pick<GameConfig, 'gameType'>): string {
  const mode = GAME_TYPE_LABELS[config.gameType ?? 'standard'];
  return `${mode} · Solo`;
}
