import type { LucideIcon } from 'lucide-react';
import { Clock, Eye, Gauge, Keyboard, ListMusic, Repeat, Shuffle, Target } from 'lucide-react';
import type { GameConfig } from '@aniquizz/shared';
import { normalizeVideoMode, resolveEvolvingReplayLimit } from '@aniquizz/shared';
import {
  gameTypeLabel,
  precisionChipLabel,
  sourceLabel,
  videoModeLabel,
} from '@/features/hub/copy/hubCopy';
import { pick, tx } from '@/lib/i18n/text';
import { formatTimeAttackBudget } from '@/features/hub/components/config/timeAttackBudgetLabel';
import { getDifficultyBadge, streakPrimeChip } from '@/features/hub/components/roomSettings';
import { SETTING_CHIP_NEUTRAL } from '@/features/hub/components/SettingChip';
import { SOUND_TYPES } from '@/features/hub/components/config/formOptions';
import type { SettingChipSpec } from '@/features/hub/components/roomSettings';

export interface SoloLobbyRecapGroup {
  id: 'partie' | 'reponse' | 'musique' | 'video';
  label: string;
  chips: SettingChipSpec[];
}

function responseLabel(type: GameConfig['responseType']): string {
  if (type === 'qcm') return pick('QCM', 'MCQ');
  if (type === 'mix') return 'Mix';
  return 'Typing';
}

function sourceName(selection: GameConfig['soundSelection']): string {
  return sourceLabel(selection);
}

function soundTypeChips(types: string[] | undefined): SettingChipSpec[] {
  if (!types?.length) {
    return [
      {
        key: 'sound-types-empty',
        icon: ListMusic,
        label: '',
        value: '—',
        className: SETTING_CHIP_NEUTRAL,
      },
    ];
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
export function buildSoloLobbyRecapGroups(
  config: GameConfig,
  playlistName?: string | null,
): SoloLobbyRecapGroup[] {
  const difficultyBadge = getDifficultyBadge(config.difficulty ?? []);
  const videoMode = normalizeVideoMode(config.videoMode);

  const responseName = responseLabel(config.responseType);
  const precisionLabel = precisionChipLabel(config.precision);
  const partieChips: SettingChipSpec[] = [
    {
      key: 'sound-count',
      icon: ListMusic,
      label: '',
      value:
        config.gameType === 'timeAttack'
          ? formatTimeAttackBudget(config.timeBudgetSeconds)
          : pick(
              `${config.soundCount} son${config.soundCount > 1 ? 's' : ''}`,
              `${config.soundCount} song${config.soundCount > 1 ? 's' : ''}`,
            ),
      className: SETTING_CHIP_NEUTRAL,
    },
  ];
  if (config.gameType === 'timeAttack') {
    partieChips.push({
      key: 'title-count',
      icon: Clock,
      label: '',
      value: pick(
        `${config.soundCount} titre${config.soundCount > 1 ? 's' : ''}`,
        `${config.soundCount} song${config.soundCount > 1 ? 's' : ''}`,
      ),
      className: SETTING_CHIP_NEUTRAL,
    });
  } else if (config.gameType === 'evolving') {
    const replayLimit = resolveEvolvingReplayLimit(config);
    if (replayLimit != null) {
      partieChips.push({
        key: 'replay-limit',
        icon: Repeat,
        label: '',
        value:
          replayLimit === 0
            ? pick('1 écoute', '1 listen')
            : pick(
                `${replayLimit} réécoute${replayLimit > 1 ? 's' : ''}`,
                `${replayLimit} replay${replayLimit > 1 ? 's' : ''}`,
              ),
        className: SETTING_CHIP_NEUTRAL,
      });
    }
  } else {
    partieChips.push({
      key: 'guess-duration',
      icon: Clock,
      label: '',
      value: `${config.guessDuration}s`,
      className: SETTING_CHIP_NEUTRAL,
    });
  }
  const prime = streakPrimeChip(config);
  if (prime) partieChips.push(prime);

  return [
    {
      id: 'partie',
      label: pick('Partie', 'Match'),
      chips: partieChips,
    },
    {
      id: 'reponse',
      label: pick('Réponse', 'Answer'),
      chips: [
        {
          key: 'response-type',
          icon: Keyboard,
          label: '',
          value: responseName,
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
      label: pick('Musique', 'Music'),
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
          value:
            config.soundSelection === 'playlist'
              ? playlistName?.trim() || sourceName('playlist')
              : sourceName(config.soundSelection),
          className: SETTING_CHIP_NEUTRAL,
        },
      ],
    },
    {
      id: 'video',
      label: tx('hub', 'videoLabel'),
      chips: [
        {
          key: 'video-mode',
          icon: Eye,
          label: '',
          value: videoModeLabel(videoMode),
          className: SETTING_CHIP_NEUTRAL,
        },
      ],
    },
  ];
}

export function soloLobbyModeBadge(config: Pick<GameConfig, 'gameType'>): string {
  const mode = gameTypeLabel(config.gameType ?? 'standard');
  return `${mode} · Solo`;
}
