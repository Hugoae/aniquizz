import type { LucideIcon } from 'lucide-react';
import { Eye, Music2 } from 'lucide-react';
import type { GameConfig } from '@aniquizz/shared';
import {
  GAME_CONFIG,
  normalizePrecision,
  isArtistPrecision,
  effectiveMedalThresholds,
  evolvingMedalThresholds,
  resolveEvolvingReplayLimit,
  normalizeVideoMode,
  TIME_ATTACK_MIN_CLIP_SECONDS,
  normalizeSongStartMode,
  normalizeTimeAttackStreakBonusSeconds,
  normalizeTimeAttackStreakLength,
  isSpeedBonusEnabled,
} from '@aniquizz/shared';
import { buildLobbySettingChips } from '@/features/hub/components/roomSettings';
import { SETTING_CHIP_NEUTRAL } from '@/features/hub/components/SettingChip';
import i18n from '@/lib/i18n';
import { songStartLabel, videoModeLabel } from '@/features/hub/copy/hubCopy';
import { tx } from '@/lib/i18n/text';
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

function pick(fr: string, en: string): string {
  return i18n.language.startsWith('en') ? en : fr;
}

const STANDARD_MODE_INTRO = () =>
  pick(
    "Blindtest anime : écoute un extrait et devine l'anime avant la fin du chrono.",
    'Anime blind test: listen to a clip and guess the anime before the clock runs out.',
  );

const TIME_ATTACK_INTRO = () =>
  pick(
    'Trouvez le plus de titres avant la fin du temps. Un skip retire 5 secondes, puis 7, 9… Une erreur retire 3 secondes.',
    'Find as many songs as you can before time runs out. A skip removes 5 seconds, then 7, 9… A wrong answer removes 3 seconds.',
  );

const EVOLVING_INTRO = () =>
  pick(
    "L'extrait s'allonge tant que tu ne trouves pas : 0,25 s, puis 0,5 s, 1 s, 3 s, 10 s et 15 s. Tu réécoutes l'extrait en cours autant que tu veux. Une bonne réponse vaut 6 points au premier cran, puis 5, 4, 3, 2 et 1. Une erreur ou Passer donne l'extrait plus long du même titre. Abandonner le termine tout de suite, à 0 point. La réponse reste affichée 15 s, puis le son suivant commence.",
    'The clip grows until you find it: 0.25 s, then 0.5 s, 1 s, 3 s, 10 s and 15 s. You can replay the current clip as often as you want. A correct answer is worth 6 points on the first step, then 5, 4, 3, 2 and 1. A miss or Skip plays a longer clip of the same song. Give up ends it immediately, for 0 points. The answer stays up for 15 s, then the next song starts.',
  );

const TIME_ATTACK_RACE_INTRO = () =>
  pick(
    "Course en parallèle : chacun joue sa voie sur la même playlist, sans voir les titres des autres. Le plus de titres trouvés l'emporte. Un skip retire 5 secondes, puis 7, 9… Une erreur retire 3 secondes.",
    'A parallel race: each player has a lane on the same playlist, without seeing the others’ songs. Most songs found wins. A skip removes 5 seconds, then 7, 9… A wrong answer removes 3 seconds.',
  );

const MIX_CHOICE_LINE = () =>
  pick(
    'En mode Mix, tu choisis ton type de réponse en début de manche : une fois choisi, tu ne peux plus changer avant la révélation.',
    'In Mix mode you pick your answer type at the start of the round. Once chosen, you cannot change it before the reveal.',
  );

const speedScoringLines = (): string[] => {
  const { SCORING } = GAME_CONFIG;
  return [
    pick(
      `Typing correct : ${SCORING.TYPING} pts de base.`,
      `Correct typing: ${SCORING.TYPING} base pts.`,
    ),
    pick(
      'Bonus vitesse (parmi les bonnes réponses) : 1 joueur → +0 ; 2 → +2 / +1 ; 3 ou plus → +3 / +2 / +1 (top 3).',
      'Speed bonus (among correct answers): 1 player → +0; 2 → +2 / +1; 3 or more → +3 / +2 / +1 (top 3).',
    ),
    pick(
      "L'ordre d'arrivée (1er, 2e, 3e…) est affiché à la révélation.",
      'Arrival order (1st, 2nd, 3rd…) is shown at the reveal.',
    ),
  ];
};

const scoringLinesForConfig = (config: GameConfig): string[] => {
  if (config.gameType === 'evolving') {
    const replayLimit = resolveEvolvingReplayLimit(config);
    const replayLine =
      replayLimit == null
        ? pick(
            'Réécoute infinie : tu relances l’extrait autant que tu veux.',
            'Unlimited replay: you can restart the clip as often as you want.',
          )
        : replayLimit === 0
          ? pick(
              'Réécoute infinie coupée : une seule écoute par marche.',
              'Unlimited replay off: one listen per step.',
            )
          : pick(
              `Réécoute infinie coupée : ${replayLimit} relance${replayLimit > 1 ? 's' : ''} en plus de la première écoute.`,
              `Unlimited replay off: ${replayLimit} extra replay${replayLimit > 1 ? 's' : ''} after the first listen.`,
            );
    return [
      pick('Saisie uniquement.', 'Typing only.'),
      replayLine,
      pick(
        'Bonne réponse : 6 pts à 0,25 s, puis 5, 4, 3, 2, et 1 pt à 15 s.',
        'Correct answer: 6 pts at 0.25 s, then 5, 4, 3, 2, and 1 pt at 15 s.',
      ),
      pick(
        'Une erreur ou Passer allonge l’extrait du même titre. Abandonner le titre le termine tout de suite.',
        'A miss or Skip lengthens the same song. Give up ends that song immediately.',
      ),
      pick(
        'Un titre raté ou abandonné vaut 0 point.',
        'A missed or abandoned song is worth 0 points.',
      ),
    ];
  }
  if (config.gameType === 'timeAttack') {
    const lines = [
      pick('Chaque titre trouvé vaut 1 point.', 'Each song you find is worth 1 point.'),
      config.timeAttackPunitiveSkip === false
        ? pick('Un skip illimité retire 5 secondes.', 'An unlimited skip removes 5 seconds.')
        : pick(
            "Un skip illimité retire 5 secondes, puis 7, 9… jusqu'à 15.",
            'An unlimited skip removes 5 seconds, then 7, 9… up to 15.',
          ),
      pick(
        'Une erreur validée retire 3 secondes ; vous restez sur le même titre.',
        'A submitted wrong answer removes 3 seconds; you stay on the same song.',
      ),
      config.timeAttackReveal === false
        ? pick(
            'Sans révélation : trouvé, raté ou passé, le titre suivant démarre tout de suite (réponse dans l’historique).',
            'No reveal: found, missed, or skipped, the next song starts at once (the answer stays in the history).',
          )
        : pick(
            'Trouvé, raté ou passé : révélation de 3 secondes, hors chrono.',
            'Found, missed, or skipped: a 3-second reveal, off the clock.',
          ),
    ];
    if (config.timeAttackStreakBonus === true) {
      const every = normalizeTimeAttackStreakLength(config.timeAttackStreakLength);
      const seconds = normalizeTimeAttackStreakBonusSeconds(config.timeAttackStreakBonusSeconds);
      lines.push(
        pick(
          `Prime de série : tous les ${every} titres trouvés d'affilée, +${seconds} s. Plafond : l'équivalent de la durée choisie, en plus. Passer et un titre raté remettent la série à zéro. Une erreur sur le titre en cours retire 3 secondes sans la casser.`,
          `Streak bonus: every ${every} songs found in a row, +${seconds} s. Cap: the chosen duration, on top. Skip and a missed song reset the streak. A wrong answer on the current song removes 3 seconds without breaking it.`,
        ),
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

  const typingLine = pick(
    `Typing : ${SCORING.TYPING} pts — écris toi-même la réponse au clavier.`,
    `Typing: ${SCORING.TYPING} pts — type the answer yourself.`,
  );
  const typingAutocompleteLine = isArtistPrecision(precision)
    ? pick(
        "Autocomplétion : en tapant, les artistes correspondants s'affichent dans un menu au-dessus du champ ; sélectionne une proposition ou valide ta saisie.",
        'Autocomplete: as you type, matching artists appear in a menu above the field. Pick one or submit what you typed.',
      )
    : pick(
        "Autocomplétion : en tapant, les titres correspondants s'affichent dans un menu au-dessus du champ ; sélectionne une proposition ou valide ta saisie.",
        'Autocomplete: as you type, matching titles appear in a menu above the field. Pick one or submit what you typed.',
      );
  const typingToleranceLine = pick(
    "Une tolérance aux fautes de frappe s'applique sur les réponses longues.",
    'A typo tolerance applies on long answers.',
  );
  const qcmLine = pick(
    `Carré : ${SCORING.QCM} pts — choisis parmi 4 propositions.`,
    `Multiple choice: ${SCORING.QCM} pts — pick one of 4 answers.`,
  );
  const duoLine = pick(
    `Duo : ${SCORING.DUO} pt — joker Mix : les 2 propositions n'apparaissent qu'après l'avoir choisi, et la manche vaut alors 1 pt.`,
    `Duo: ${SCORING.DUO} pt — Mix joker. The 2 choices appear only after you pick it, and the round is then worth 1 pt.`,
  );

  switch (responseType) {
    case 'typing':
      return [typingLine, typingAutocompleteLine, typingToleranceLine];
    case 'qcm':
      return [qcmLine];
    case 'mix':
    default:
      return [
        MIX_CHOICE_LINE(),
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
    return pick(
      'Précision Franchise : « My Hero Academia » suffit, inutile de préciser « My Hero Academia Season 3 ».',
      'Franchise precision: “My Hero Academia” is enough. You do not need “My Hero Academia Season 3”.',
    );
  }
  if (resolved === 'artist') {
    return pick(
      "Précision Artiste : un des artistes ou groupes crédités suffit, inutile de tous les citer. Le titre et l'anime ne comptent pas.",
      'Artist precision: one credited artist or group is enough. You do not need to name them all. The title and the anime do not count.',
    );
  }
  return pick(
    'Précision Anime : « My Hero Academia Season 3 » est requis, « My Hero Academia » seul ne suffit pas.',
    'Anime precision: “My Hero Academia Season 3” is required. “My Hero Academia” alone is not enough.',
  );
};

const videoFlowLine = (videoMode: GameConfig['videoMode']): string => {
  switch (normalizeVideoMode(videoMode)) {
    case 'blurred':
      return pick(
        'Chaque manche : extrait audio et vidéo floutée pendant le guess, tu devines avant la fin du chrono.',
        'Each round: audio and a blurred video during the guess. You guess before the clock runs out.',
      );
    case 'peek':
      return pick(
        "Chaque manche : extrait audio et une petite fenêtre vidéo (position aléatoire, nouvelle à chaque manche) ; le reste de l'image est masqué. Tu devines avant la fin du chrono.",
        'Each round: audio and a small video window (random position, new every round). The rest of the picture is hidden. You guess before the clock runs out.',
      );
    case 'hidden':
    default:
      return pick(
        'Chaque manche : extrait audio diffusé, vidéo cachée (fond noir), tu devines avant la fin du chrono.',
        'Each round: the audio plays, the video stays hidden (black background). You guess before the clock runs out.',
      );
  }
};

const songStartFlowLine = (songStartMode: GameConfig['songStartMode']): string => {
  switch (normalizeSongStartMode(songStartMode)) {
    case 'beginning':
      return pick(
        "Départ de l'extrait : au tout début du clip (intro de l'OP/ED).",
        'Clip start: at the very beginning of the clip (the OP/ED intro).',
      );
    case 'random':
    default:
      return pick(
        "Départ de l'extrait : à un moment aléatoire du clip (nouveau à chaque manche, sauf si le clip est trop court).",
        'Clip start: a random moment in the clip (new every round, unless the clip is too short).',
      );
  }
};

const timeAttackLateStartLine = (config: GameConfig): string | null => {
  if (config.gameType !== 'timeAttack') return null;
  if (normalizeSongStartMode(config.songStartMode) !== 'random') return null;
  return pick(
    `Un départ tardif raccourcit l'extrait (${TIME_ATTACK_MIN_CLIP_SECONDS} s minimum). Le nombre de titres couvre le chrono même si chaque extrait est au plus court.`,
    `A late start shortens the clip (${TIME_ATTACK_MIN_CLIP_SECONDS} s minimum). The song count still covers the clock even if every clip is as short as it can be.`,
  );
};

const REVEAL_FLOW_LINE = () =>
  pick(
    "Révélation de la bonne réponse avec la vidéo complète, puis manche suivante jusqu'à la fin de la playlist.",
    'The correct answer is revealed with the full video, then the next round, until the playlist ends.',
  );

const WATCHED_LIST_STATUSES = WATCHED_LIST_STATUSES_OU;

const watchedModeExplain = (mode: GameConfig['watchedMode']): string => {
  if (mode === 'intersection') {
    return pick(
      `Mode Commun : seuls les anime présents sur la liste de chaque joueur du salon sont retenus (${WATCHED_LIST_STATUSES}).`,
      `Shared mode: only anime on every player’s list in the room are kept (${WATCHED_LIST_STATUSES}).`,
    );
  }
  return pick(
    `Mode Union : un anime est éligible dès qu'il figure sur la liste liée d'au moins un joueur du salon (${WATCHED_LIST_STATUSES}).`,
    `Union mode: an anime is eligible as soon as it is on at least one player’s linked list (${WATCHED_LIST_STATUSES}).`,
  );
};

const selectedSoundTypesLabel = (types: string[] | undefined): string => {
  const openings = types?.includes('opening') ?? false;
  const endings = types?.includes('ending') ?? false;
  if (openings && endings) return pick('openings et endings', 'openings and endings');
  if (endings) return 'endings';
  return 'openings';
};

const sourceLines = (config: GameConfig, context: LobbyRulesContext): string[] => {
  const showFusion = context.lobbyMode === 'multi';

  if (config.soundSelection === 'watched') {
    const lines = showFusion
      ? [
          pick(
            `Source : Ma liste anime (${watchedModeDisplayLabel(config.watchedMode)}) — AniList ou MyAnimeList.`,
            `Source: My anime list (${watchedModeDisplayLabel(config.watchedMode)}) — AniList or MyAnimeList.`,
          ),
          watchedModeExplain(config.watchedMode),
        ]
      : [
          pick(
            'Source : Ma liste anime — AniList ou MyAnimeList.',
            'Source: My anime list — AniList or MyAnimeList.',
          ),
        ];
    lines.push(
      pick(
        `Seuls les ${selectedSoundTypesLabel(config.soundTypes)} du catalogue qui correspondent à ces anime peuvent être tirés.`,
        `Only catalogue ${selectedSoundTypesLabel(config.soundTypes)} that match these anime can be drawn.`,
      ),
    );
    if (config.watchedAllowFallback) {
      lines.push(
        pick(
          "Compléter avec l'aléatoire est activé : si le pool Watched est insuffisant, des sons du catalogue global complètent la playlist (notification en partie).",
          'Fill from random is on: if the Watched pool is too small, songs from the global catalogue complete the playlist (you are told during the match).',
        ),
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
      pick(
        `Seuls les ${selectedSoundTypesLabel(config.soundTypes)} du pack (après filtres de difficulté) peuvent être tirés.`,
        `Only the pack’s ${selectedSoundTypesLabel(config.soundTypes)} (after difficulty filters) can be drawn.`,
      ),
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
    pick(
      'Source : Aléatoire — les sons sont tirés dans le catalogue selon les filtres (difficulté, type).',
      'Source: Random — songs are drawn from the catalogue using the filters (difficulty, type).',
    ),
    pick(
      'Aucune liste AniList ou MyAnimeList requise.',
      'No AniList or MyAnimeList list is required.',
    ),
  ];
};

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'] as const;
type DifficultyKey = (typeof DIFFICULTY_ORDER)[number];

const difficultyName = (key: DifficultyKey): string =>
  pick(
    key === 'easy' ? 'Facile' : key === 'hard' ? 'Difficile' : 'Moyen',
    key === 'easy' ? 'Easy' : key === 'hard' ? 'Hard' : 'Medium',
  );

const normalizeDifficultyKey = (raw: string): DifficultyKey => {
  if (raw === 'easy' || raw === 'hard') return raw;
  return 'medium';
};

const formatPercentFr = (ratio: number): string => {
  const pct = Math.round(ratio * 1000) / 10;
  if (i18n.language.startsWith('en')) {
    const text = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
    return `${text}%`;
  }
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
    return pick(
      `Seuil Bronze (${difficultyName(key)}) : ${formatPercentFr(bronze)} minimum du score max (points obtenus ÷ points max par manche).`,
      `Bronze bar (${difficultyName(key)}): at least ${formatPercentFr(bronze)} of the max score (points scored ÷ max points per round).`,
    );
  }

  const effectiveBronze = effectiveMedalThresholds(selected, resolvedPrecision).bronze;
  const breakdown = selected
    .map(
      (key) =>
        `${difficultyName(key)} ${formatPercentFr(effectiveMedalThresholds([key], resolvedPrecision).bronze)}`,
    )
    .join(', ');

  return pick(
    `Seuil Bronze : ${formatPercentFr(effectiveBronze)} minimum du score max (moyenne des difficultés sélectionnées : ${breakdown}).`,
    `Bronze bar: at least ${formatPercentFr(effectiveBronze)} of the max score (average of the selected difficulties: ${breakdown}).`,
  );
};

/** Points per title on a 6-point Evolving scale, for the selected difficulties. */
const evolvingMedalLine = (
  difficulties: string[] | undefined,
  precision: GameConfig['precision'],
): string => {
  const selected = difficulties?.length ? difficulties : ['medium'];
  const thresholds = evolvingMedalThresholds(selected, precision);
  const perTitle = (ratio: number) => {
    const points = Math.round(ratio * 6 * 10) / 10;
    const text = Number.isInteger(points) ? String(points) : points.toFixed(1);
    return i18n.language.startsWith('en') ? text : text.replace('.', ',');
  };
  return pick(
    `Médailles plus accessibles qu’en Standard : environ ${perTitle(thresholds.bronze)} pt par titre pour le Bronze, ${perTitle(thresholds.silver)} pour l’Argent, ${perTitle(thresholds.gold)} pour l’Or, ${perTitle(thresholds.platinum)} pour le Platine.`,
    `Medals are easier than in Standard: about ${perTitle(thresholds.bronze)} pt per song for Bronze, ${perTitle(thresholds.silver)} for Silver, ${perTitle(thresholds.gold)} for Gold, ${perTitle(thresholds.platinum)} for Platinum.`,
  );
};

const victoryLines = (context: LobbyRulesContext, config: GameConfig): string[] => {
  if (context.lobbyMode === 'solo') {
    if (config.gameType === 'timeAttack') {
      return [
        pick(
          'Victoire solo : obtenir au moins la médaille Bronze.',
          'Solo win: earn at least the Bronze medal.',
        ),
        pick(
          'Les seuils comptent les titres trouvés par minute, puis le même malus de difficulté / précision que le Standard.',
          'The bars count songs found per minute, then the same difficulty / precision penalty as Standard.',
        ),
        pick(
          'Quatre médailles à viser : Bronze, Argent, Or et Platine.',
          'Four medals to aim for: Bronze, Silver, Gold and Platinum.',
        ),
      ];
    }
    if (config.gameType === 'evolving') {
      return [
        pick(
          'Victoire solo : obtenir au moins la médaille Bronze.',
          'Solo win: earn at least the Bronze medal.',
        ),
        evolvingMedalLine(config.difficulty, config.precision),
        pick(
          'Quatre médailles à viser : Bronze, Argent, Or et Platine.',
          'Four medals to aim for: Bronze, Silver, Gold and Platinum.',
        ),
      ];
    }
    return [
      pick(
        'Victoire solo : obtenir au moins la médaille Bronze.',
        'Solo win: earn at least the Bronze medal.',
      ),
      soloBronzeThresholdLine(config.difficulty, config.precision),
      pick(
        'Quatre médailles à viser : Bronze, Argent, Or et Platine.',
        'Four medals to aim for: Bronze, Silver, Gold and Platinum.',
      ),
    ];
  }

  const podiumThreshold = GAME_CONFIG.VICTORY_CONDITIONS.MULTI.PODIUM_THRESHOLD;

  if (config.gameType === 'timeAttack') {
    return [
      pick(
        'Victoire : le plus de titres trouvés remporte la course.',
        'Win: the most songs found wins the race.',
      ),
      pick(
        'Égalité : à trouvés égaux, moins de titres écoutés (8/13 bat 8/15). Le même ratio partage la place.',
        'Tie: with the same number found, fewer songs heard wins (8/13 beats 8/15). The same ratio shares the place.',
      ),
      pick(
        'Les bots apparaissent au classement. La victoire se joue entre les joueurs.',
        'Bots appear in the standings. The win is decided between players.',
      ),
      pick(
        `Avec ${podiumThreshold} joueurs ou plus, bots non comptés, le podium gagne la partie (égalités incluses).`,
        `With ${podiumThreshold} players or more, bots not counted, the podium wins the match (ties included).`,
      ),
      pick(
        'Chaque joueur reçoit sa propre médaille selon ses titres, ses difficultés et la durée du chrono.',
        'Each player gets their own medal from their songs, their difficulties, and the clock length.',
      ),
    ];
  }

  return [
    pick(
      'Victoire multijoueur : le plus haut score remporte la partie.',
      'Multiplayer win: the highest score wins the match.',
    ),
    pick(
      `Avec ${podiumThreshold} joueurs ou plus, le podium gagne la partie (égalités incluses).`,
      `With ${podiumThreshold} players or more, the podium wins the match (ties included).`,
    ),
    pick(
      'Pas de médailles solo en multijoueur — le classement final fait foi.',
      'No solo medals in multiplayer — the final standings decide.',
    ),
  ];
};

const raceLobbyLines = (): string[] => [
  pick(
    "L'hôte lance la course quand au moins 2 joueurs sont présents ; les invités doivent se mettre « Prêt ». De 2 à 8 joueurs.",
    'The host starts the race when at least 2 players are in; guests must mark Ready. From 2 to 8 players.',
  ),
  pick(
    'Départ commun après un compte à rebours : chaque joueur a son propre chrono, qui continue même en cas de déconnexion.',
    'A shared start after a countdown: each player has their own clock, which keeps running even if they disconnect.',
  ),
  pick(
    "Pas de pause ni de vote : « Passer » est individuel et ne coûte du temps qu'à celui qui l'utilise.",
    'No pause and no vote: Skip is individual and only costs time for the player who uses it.',
  ),
  pick(
    'Le mode Watched est indisponible : tout le monde joue les mêmes titres.',
    'Watched mode is unavailable: everyone plays the same songs.',
  ),
  pick(
    "L'hôte peut exclure un joueur ou transférer le rôle d'hôte depuis le lobby.",
    'The host can kick a player or transfer the host role from the lobby.',
  ),
];

const multiLobbyLines = (): string[] => [
  pick(
    "L'hôte lance la partie quand au moins 2 joueurs sont présents ; les invités doivent se mettre « Prêt ».",
    'The host starts the match when at least 2 players are in; guests must mark Ready.',
  ),
  pick(
    "L'hôte peut exclure un joueur ou transférer le rôle d'hôte depuis le lobby.",
    'The host can kick a player or transfer the host role from the lobby.',
  ),
  pick(
    'Vote Pause : met la partie en pause si une majorité de joueurs le demande.',
    'Pause vote: pauses the match if a majority of players ask for it.',
  ),
  pick(
    'Vote Suivant : passe à la manche suivante pendant la révélation si une majorité le demande.',
    'Next vote: skips to the next round during the reveal if a majority asks for it.',
  ),
];

export function buildLobbyRulesSummaryChips(
  config: GameConfig,
  playlistName?: string,
): LobbyRulesSummaryChip[] {
  return [
    ...buildLobbySettingChips({ ...config, playlistName }),
    ...(config.gameType === 'evolving'
      ? []
      : [
          {
            key: 'video',
            icon: Eye,
            label: tx('hub', 'videoLabel'),
            value: videoModeLabel(normalizeVideoMode(config.videoMode)),
            className: SETTING_CHIP_NEUTRAL,
          },
        ]),
    {
      key: 'songStart',
      icon: Music2,
      label: tx('hub', 'songStartLabel'),
      value: songStartLabel(normalizeSongStartMode(config.songStartMode)),
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
      title: pick('Résumé de la partie', 'Match summary'),
      intro:
        config.gameType === 'evolving'
          ? EVOLVING_INTRO()
          : config.gameType !== 'timeAttack'
            ? STANDARD_MODE_INTRO()
            : context.lobbyMode === 'multi'
              ? TIME_ATTACK_RACE_INTRO()
              : TIME_ATTACK_INTRO(),
      chips: buildLobbyRulesSummaryChips(config, context.playlistName),
    },
    {
      id: 'flow',
      title: pick('Déroulement', 'How a round goes'),
      lines: [
        ...(config.gameType === 'evolving' ? [] : [videoFlowLine(config.videoMode)]),
        songStartFlowLine(config.songStartMode),
        ...(lateStartLine ? [lateStartLine] : []),
        precisionFlowLine(config.precision),
        REVEAL_FLOW_LINE(),
      ],
    },
    {
      id: 'scoring',
      title: pick('Points par réponse', 'Points per answer'),
      lines: scoringLinesForConfig(config),
    },
    {
      id: 'source',
      title: pick('Source musicale', 'Music source'),
      lines: sourceLines(config, context),
    },
    {
      id: 'victory',
      title: pick('Victoire', 'Victory'),
      lines: victoryLines(context, config),
    },
  ];

  if (context.lobbyMode === 'multi') {
    sections.push({
      id: 'lobby',
      title: pick('Salon multijoueur', 'Multiplayer room'),
      lines: config.gameType === 'timeAttack' ? raceLobbyLines() : multiLobbyLines(),
    });
  }

  return sections;
}
