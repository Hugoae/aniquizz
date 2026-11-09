import type { LucideIcon } from 'lucide-react';
import { Eye, Music2 } from 'lucide-react';
import type { GameConfig } from '@aniquizz/shared';
import {
  GAME_CONFIG,
  normalizePrecision,
  isArtistPrecision,
  effectiveMedalThresholds,
  VIDEO_MODE_LABELS,
  normalizeVideoMode,
  SONG_START_MODE_LABELS,
  TIME_ATTACK_MIN_CLIP_SECONDS,
  normalizeSongStartMode,
  normalizeTimeAttackStreakBonusSeconds,
  normalizeTimeAttackStreakLength,
  isSpeedBonusEnabled,
} from '@aniquizz/shared';
import { buildLobbySettingChips } from '@/features/hub/components/roomSettings';
import { SETTING_CHIP_NEUTRAL } from '@/features/hub/components/SettingChip';
import { PLAYLISTS_COPY } from '@/features/hub/components/config/playlistsCopy';
import {
  watchedModeDisplayLabel,
  WATCHED_LIST_STATUSES_OU,
} from '@/features/hub/components/config/watchedSource';

export type LobbyRulesMode = 'solo' | 'multi';

export interface LobbyRulesContext {
  lobbyMode: LobbyRulesMode;
  /** Humans in the lobby (multi) — used for vote threshold copy. */
  playerCount?: number;
  /** Display name of the selected staff playlist, if any. */
  playlistName?: string;
}

export interface LobbyRulesSummaryChip {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  className: string;
}

export interface LobbyRulesSection {
  id: string;
  title: string;
  /** Short intro paragraph (summary section). */
  intro?: string;
  /** Plain lines (bullets). */
  lines?: string[];
  /** Colored setting chips (summary section). */
  chips?: LobbyRulesSummaryChip[];
}

const STANDARD_MODE_INTRO =
  "Blindtest anime : écoute un extrait et devine l'anime avant la fin du chrono.";

const TIME_ATTACK_INTRO =
  'Trouvez le plus de titres avant la fin du temps. Un skip retire 5 secondes, puis 7, 9… Une erreur retire 3 secondes.';

const TIME_ATTACK_RACE_INTRO =
  "Course en parallèle : chacun joue sa voie sur la même playlist, sans voir les titres des autres. Le plus de titres trouvés l'emporte. Un skip retire 5 secondes, puis 7, 9… Une erreur retire 3 secondes.";

const MIX_CHOICE_LINE =
  'En mode Mix, tu choisis ton type de réponse en début de manche : une fois choisi, tu ne peux plus changer avant la révélation.';

const speedScoringLines = (): string[] => {
  const { SCORING } = GAME_CONFIG;
  return [
    `Typing correct : ${SCORING.TYPING} pts de base.`,
    'Bonus vitesse (parmi les bonnes réponses) : 1 joueur → +0 ; 2 → +2 / +1 ; 3 ou plus → +3 / +2 / +1 (top 3).',
    "L'ordre d'arrivée (1er, 2e, 3e…) est affiché à la révélation.",
  ];
};

const scoringLinesForConfig = (config: GameConfig): string[] => {
  if (config.gameType === 'timeAttack') {
    const lines = [
      'Chaque titre trouvé vaut 1 point.',
      config.timeAttackPunitiveSkip === false
        ? 'Un skip illimité retire 5 secondes.'
        : "Un skip illimité retire 5 secondes, puis 7, 9… jusqu'à 15.",
      'Une erreur validée retire 3 secondes ; vous restez sur le même titre.',
      config.timeAttackReveal === false
        ? 'Sans révélation : trouvé, raté ou passé, le titre suivant démarre tout de suite (réponse dans l’historique).'
        : 'Trouvé, raté ou passé : révélation de 3 secondes, hors chrono.',
    ];
    if (config.timeAttackStreakBonus === true) {
      const every = normalizeTimeAttackStreakLength(config.timeAttackStreakLength);
      const seconds = normalizeTimeAttackStreakBonusSeconds(config.timeAttackStreakBonusSeconds);
      lines.push(
        `Prime de série : tous les ${every} titres trouvés d'affilée, +${seconds} s. Plafond : l'équivalent de la durée choisie, en plus. Passer et un titre raté remettent la série à zéro. Une erreur sur le titre en cours retire 3 secondes sans la casser.`,
      );
    }
    return lines;
  }
  return isSpeedBonusEnabled(config)
    ? speedScoringLines()
    : scoringLines(config.responseType, config.precision);
};

const scoringLines = (
  responseType: GameConfig['responseType'],
  precision: GameConfig['precision'],
): string[] => {
  const { SCORING } = GAME_CONFIG;

  const typingLine = `Typing : ${SCORING.TYPING} pts — écris toi-même la réponse au clavier.`;
  const typingAutocompleteLine = isArtistPrecision(precision)
    ? "Autocomplétion : en tapant, les artistes correspondants s'affichent dans un menu au-dessus du champ ; sélectionne une proposition ou valide ta saisie."
    : "Autocomplétion : en tapant, les titres correspondants s'affichent dans un menu au-dessus du champ ; sélectionne une proposition ou valide ta saisie.";
  const typingToleranceLine =
    "Une tolérance aux fautes de frappe s'applique sur les réponses longues.";
  const qcmLine = `Carré : ${SCORING.QCM} pts — choisis parmi 4 propositions.`;
  const duoLine = `Duo : ${SCORING.DUO} pt — joker Mix : les 2 propositions n'apparaissent qu'après l'avoir choisi, et la manche vaut alors 1 pt.`;

  switch (responseType) {
    case 'typing':
      return [typingLine, typingAutocompleteLine, typingToleranceLine];
    case 'qcm':
      return [qcmLine];
    case 'mix':
    default:
      return [
        MIX_CHOICE_LINE,
        typingLine,
        typingAutocompleteLine,
        typingToleranceLine,
        qcmLine,
        duoLine,
      ];
  }
};

const precisionFlowLine = (precision: GameConfig['precision']): string => {
  const resolved = normalizePrecision(precision);
  if (resolved === 'franchise') {
    return 'Précision Franchise : « My Hero Academia » suffit, inutile de préciser « My Hero Academia Season 3 ».';
  }
  if (resolved === 'artist') {
    return "Précision Artiste : un des artistes ou groupes crédités suffit, inutile de tous les citer. Le titre et l'anime ne comptent pas.";
  }
  return 'Précision Anime : « My Hero Academia Season 3 » est requis, « My Hero Academia » seul ne suffit pas.';
};

const videoFlowLine = (videoMode: GameConfig['videoMode']): string => {
  switch (normalizeVideoMode(videoMode)) {
    case 'blurred':
      return 'Chaque manche : extrait audio et vidéo floutée pendant le guess, tu devines avant la fin du chrono.';
    case 'peek':
      return "Chaque manche : extrait audio et une petite fenêtre vidéo (position aléatoire, nouvelle à chaque manche) ; le reste de l'image est masqué. Tu devines avant la fin du chrono.";
    case 'hidden':
    default:
      return 'Chaque manche : extrait audio diffusé, vidéo cachée (fond noir), tu devines avant la fin du chrono.';
  }
};

const songStartFlowLine = (songStartMode: GameConfig['songStartMode']): string => {
  switch (normalizeSongStartMode(songStartMode)) {
    case 'beginning':
      return "Départ de l'extrait : au tout début du clip (intro de l'OP/ED).";
    case 'random':
    default:
      return "Départ de l'extrait : à un moment aléatoire du clip (nouveau à chaque manche, sauf si le clip est trop court).";
  }
};

const timeAttackLateStartLine = (config: GameConfig): string | null => {
  if (config.gameType !== 'timeAttack') return null;
  if (normalizeSongStartMode(config.songStartMode) !== 'random') return null;
  return `Un départ tardif raccourcit l'extrait (${TIME_ATTACK_MIN_CLIP_SECONDS} s minimum). Le nombre de titres couvre le chrono même si chaque extrait est au plus court.`;
};

const REVEAL_FLOW_LINE =
  "Révélation de la bonne réponse avec la vidéo complète, puis manche suivante jusqu'à la fin de la playlist.";

const WATCHED_LIST_STATUSES = WATCHED_LIST_STATUSES_OU;

const watchedModeExplain = (mode: GameConfig['watchedMode']): string => {
  if (mode === 'intersection') {
    return `Mode Commun : seuls les anime présents sur la liste de chaque joueur du salon sont retenus (${WATCHED_LIST_STATUSES}).`;
  }
  return `Mode Union : un anime est éligible dès qu'il figure sur la liste liée d'au moins un joueur du salon (${WATCHED_LIST_STATUSES}).`;
};

const selectedSoundTypesLabel = (types: string[] | undefined): string => {
  const openings = types?.includes('opening') ?? false;
  const endings = types?.includes('ending') ?? false;
  if (openings && endings) return 'openings et endings';
  if (endings) return 'endings';
  return 'openings';
};

const sourceLines = (config: GameConfig, context: LobbyRulesContext): string[] => {
  const showFusion = context.lobbyMode === 'multi';

  if (config.soundSelection === 'watched') {
    const lines = showFusion
      ? [
          `Source : Ma liste anime (${watchedModeDisplayLabel(config.watchedMode)}) — AniList ou MyAnimeList.`,
          watchedModeExplain(config.watchedMode),
        ]
      : ['Source : Ma liste anime — AniList ou MyAnimeList.'];
    lines.push(
      `Seuls les ${selectedSoundTypesLabel(config.soundTypes)} du catalogue qui correspondent à ces anime peuvent être tirés.`,
    );
    if (config.watchedAllowFallback) {
      lines.push(
        "Compléter avec l'aléatoire est activé : si le pool Watched est insuffisant, des sons du catalogue global complètent la playlist (notification en partie).",
      );
    }
    return lines;
  }

  if (config.soundSelection === 'playlist') {
    const combined = context.playlistName
      ?.split(' ∩ ')
      .map((part) => part.trim())
      .filter(Boolean);
    const sourceLine =
      combined && combined.length >= 2
        ? PLAYLISTS_COPY.sourceRulesCombine(combined[0], combined[1])
        : context.playlistName
          ? PLAYLISTS_COPY.sourceRules(context.playlistName)
          : PLAYLISTS_COPY.sourceRulesGeneric;
    const lines = [
      sourceLine,
      `Seuls les ${selectedSoundTypesLabel(config.soundTypes)} du pack (après filtres de difficulté) peuvent être tirés.`,
      PLAYLISTS_COPY.noOutsideFill,
    ];
    if (config.playlistWatched) {
      lines.push(PLAYLISTS_COPY.overlayRules);
      if (showFusion) lines.push(watchedModeExplain(config.watchedMode));
      if (config.watchedAllowFallback) lines.push(PLAYLISTS_COPY.fallbackRules);
    }
    return lines;
  }

  return [
    'Source : Aléatoire — les sons sont tirés dans le catalogue selon les filtres (difficulté, type).',
    'Aucune liste AniList ou MyAnimeList requise.',
  ];
};

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'] as const;
type DifficultyKey = (typeof DIFFICULTY_ORDER)[number];

const DIFFICULTY_FR: Record<DifficultyKey, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
};

const normalizeDifficultyKey = (raw: string): DifficultyKey => {
  if (raw === 'easy' || raw === 'hard') return raw;
  return 'medium';
};

const formatPercentFr = (ratio: number): string => {
  const pct = Math.round(ratio * 1000) / 10;
  const text = Number.isInteger(pct) ? String(pct) : pct.toFixed(1).replace('.', ',');
  return `${text} %`;
};

/** Bronze bar copy from room difficulty filters (uses effectiveMedalThresholds). */
const soloBronzeThresholdLine = (
  difficulties: string[] | undefined,
  precision: GameConfig['precision'],
): string => {
  const selected = [
    ...new Set((difficulties?.length ? difficulties : ['medium']).map(normalizeDifficultyKey)),
  ];
  selected.sort((a, b) => DIFFICULTY_ORDER.indexOf(a) - DIFFICULTY_ORDER.indexOf(b));
  const resolvedPrecision = normalizePrecision(precision);

  if (selected.length === 1) {
    const key = selected[0];
    const bronze = effectiveMedalThresholds([key], resolvedPrecision).bronze;
    return `Seuil Bronze (${DIFFICULTY_FR[key]}) : ${formatPercentFr(bronze)} minimum du score max (points obtenus ÷ points max par manche).`;
  }

  const effectiveBronze = effectiveMedalThresholds(selected, resolvedPrecision).bronze;
  const breakdown = selected
    .map(
      (key) =>
        `${DIFFICULTY_FR[key]} ${formatPercentFr(effectiveMedalThresholds([key], resolvedPrecision).bronze)}`,
    )
    .join(', ');

  return `Seuil Bronze : ${formatPercentFr(effectiveBronze)} minimum du score max (moyenne des difficultés sélectionnées : ${breakdown}).`;
};

const victoryLines = (context: LobbyRulesContext, config: GameConfig): string[] => {
  if (context.lobbyMode === 'solo') {
    if (config.gameType === 'timeAttack') {
      return [
        'Victoire solo : obtenir au moins la médaille Bronze.',
        'Les seuils comptent les titres trouvés par minute, puis le même malus de difficulté / précision que le Standard.',
        'Quatre médailles à viser : Bronze, Argent, Or et Platine.',
      ];
    }
    return [
      'Victoire solo : obtenir au moins la médaille Bronze.',
      soloBronzeThresholdLine(config.difficulty, config.precision),
      'Quatre médailles à viser : Bronze, Argent, Or et Platine.',
    ];
  }

  const podiumThreshold = GAME_CONFIG.VICTORY_CONDITIONS.MULTI.PODIUM_THRESHOLD;

  if (config.gameType === 'timeAttack') {
    return [
      'Victoire : le plus de titres trouvés remporte la course.',
      'Égalité : à trouvés égaux, moins de titres écoutés (8/13 bat 8/15). Le même ratio partage la place.',
      'Les bots apparaissent au classement. La victoire se joue entre les joueurs.',
      `Avec ${podiumThreshold} joueurs ou plus, bots non comptés, le podium gagne la partie (égalités incluses).`,
      'Chaque joueur reçoit sa propre médaille selon ses titres, ses difficultés et la durée du chrono.',
    ];
  }

  return [
    'Victoire multijoueur : le plus haut score remporte la partie.',
    `Avec ${podiumThreshold} joueurs ou plus, le podium gagne la partie (égalités incluses).`,
    'Pas de médailles solo en multijoueur — le classement final fait foi.',
  ];
};

const raceLobbyLines = (): string[] => [
  "L'hôte lance la course quand au moins 2 joueurs sont présents ; les invités doivent se mettre « Prêt ». De 2 à 8 joueurs.",
  'Départ commun après un compte à rebours : chaque joueur a son propre chrono, qui continue même en cas de déconnexion.',
  "Pas de pause ni de vote : « Passer » est individuel et ne coûte du temps qu'à celui qui l'utilise.",
  'Le mode Watched est indisponible : tout le monde joue les mêmes titres.',
  "L'hôte peut exclure un joueur ou transférer le rôle d'hôte depuis le lobby.",
];

const multiLobbyLines = (): string[] => [
  "L'hôte lance la partie quand au moins 2 joueurs sont présents ; les invités doivent se mettre « Prêt ».",
  "L'hôte peut exclure un joueur ou transférer le rôle d'hôte depuis le lobby.",
  'Vote Pause : met la partie en pause si une majorité de joueurs le demande.',
  'Vote Suivant : passe à la manche suivante pendant la révélation si une majorité le demande.',
];

export function buildLobbyRulesSummaryChips(
  config: GameConfig,
  playlistName?: string,
): LobbyRulesSummaryChip[] {
  return [
    ...buildLobbySettingChips({ ...config, playlistName }),
    {
      key: 'video',
      icon: Eye,
      label: 'Vidéo',
      value: VIDEO_MODE_LABELS[normalizeVideoMode(config.videoMode)],
      className: SETTING_CHIP_NEUTRAL,
    },
    {
      key: 'songStart',
      icon: Music2,
      label: 'Départ',
      value: SONG_START_MODE_LABELS[normalizeSongStartMode(config.songStartMode)],
      className: SETTING_CHIP_NEUTRAL,
    },
  ];
}

/**
 * Builds read-only rule sections for the lobby rules modal from live room config.
 */
export function buildLobbyRulesSections(
  config: GameConfig,
  context: LobbyRulesContext,
): LobbyRulesSection[] {
  const lateStartLine = timeAttackLateStartLine(config);
  const sections: LobbyRulesSection[] = [
    {
      id: 'summary',
      title: 'Résumé de la partie',
      intro:
        config.gameType !== 'timeAttack'
          ? STANDARD_MODE_INTRO
          : context.lobbyMode === 'multi'
            ? TIME_ATTACK_RACE_INTRO
            : TIME_ATTACK_INTRO,
      chips: buildLobbyRulesSummaryChips(config, context.playlistName),
    },
    {
      id: 'flow',
      title: 'Déroulement',
      lines: [
        videoFlowLine(config.videoMode),
        songStartFlowLine(config.songStartMode),
        ...(lateStartLine ? [lateStartLine] : []),
        precisionFlowLine(config.precision),
        REVEAL_FLOW_LINE,
      ],
    },
    {
      id: 'scoring',
      title: 'Points par réponse',
      lines: scoringLinesForConfig(config),
    },
    {
      id: 'source',
      title: 'Source musicale',
      lines: sourceLines(config, context),
    },
    {
      id: 'victory',
      title: 'Victoire',
      lines: victoryLines(context, config),
    },
  ];

  if (context.lobbyMode === 'multi') {
    sections.push({
      id: 'lobby',
      title: 'Salon multijoueur',
      lines: config.gameType === 'timeAttack' ? raceLobbyLines() : multiLobbyLines(),
    });
  }

  return sections;
}
