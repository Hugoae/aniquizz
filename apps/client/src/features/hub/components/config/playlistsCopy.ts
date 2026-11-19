/** Playlist picker copy. French strings stay exact for the source tests. */
import i18n from '@/lib/i18n';
import { watchedListStatuses } from './watchedSource';

function pick(fr: string, en: string): string {
  return i18n.language.startsWith('en') ? en : fr;
}

export const PLAYLISTS_COPY = {
  get tab() {
    return pick('Playlists', 'Playlists');
  },
  get pickerTitle() {
    return pick('Packs thématiques', 'Theme packs');
  },
  get empty() {
    return pick('Aucune playlist publiée pour le moment.', 'No published playlist yet.');
  },
  get loadError() {
    return pick('Impossible de charger les playlists.', 'Could not load the playlists.');
  },
  get loadErrorOffline() {
    return pick(
      "Le serveur de jeu n'est pas joignable. Vérifiez qu'il tourne (port 3001 en local), puis réessayez.",
      'The game server is unreachable. Check that it is running (port 3001 locally), then try again.',
    );
  },
  get retry() {
    return pick('Réessayer', 'Try again');
  },
  get choosePack() {
    return pick(
      'Choisissez une playlist pour lancer la partie.',
      'Pick a playlist to start the match.',
    );
  },
  get overlayLabel() {
    return pick('Limiter à nos animes vus', 'Limit to anime we have watched');
  },
  get overlayHint() {
    const statuses = watchedListStatuses('et');
    return pick(
      `Intersection du pack et de vos listes AniList / MyAnimeList (${statuses}).`,
      `Intersection of the pack and your AniList / MyAnimeList (${statuses}).`,
    );
  },
  get fallbackLabel() {
    return pick('Compléter avec le pack', 'Fill from the pack');
  },
  get fallbackHint() {
    return pick(
      'Les manches manquantes restent dans ce pack (jamais le catalogue global).',
      'Missing rounds stay inside this pack (never the global catalogue).',
    );
  },
  get packTooSmall() {
    return pick(
      "Ce pack n'a pas assez de sons pour ce nombre de manches (pas de complétion hors pack).",
      'This pack does not have enough songs for this many rounds (nothing is filled from outside the pack).',
    );
  },
  get filteredEmpty() {
    return pick(
      'Aucun son jouable pour ces filtres. Changez la source ou les filtres.',
      'No playable song for these filters. Change the source or the filters.',
    );
  },
  get qcmTooSmall() {
    return pick(
      "Pas assez d'animes distincts dans ce pool pour le QCM. Passez en Typing ou élargissez les filtres.",
      'Not enough different anime in this pool for multiple choice. Switch to Typing or widen the filters.',
    );
  },
  get overlayEmpty() {
    return pick(
      'Aucun son du pack dans vos listes pour ces filtres.',
      'None of this pack’s songs are in your lists for these filters.',
    );
  },
  overlayInsufficient: (playable: number, soundCount: number) =>
    pick(
      `Seulement ${playable} son${playable > 1 ? 's' : ''} du pack dans vos listes pour ${soundCount} demandé${soundCount > 1 ? 's' : ''}. ` +
        'Activez « Compléter avec le pack » ou réduisez le nombre de sons.',
      `Only ${playable} pack song${playable > 1 ? 's' : ''} in your lists for ${soundCount} requested. Turn on “Fill from the pack” or lower the song count.`,
    ),
  sourceRules: (name: string) =>
    pick(
      `Source : Playlist « ${name} » — pack staff figé.`,
      `Source: Playlist “${name}” — fixed staff pack.`,
    ),
  get sourceRulesGeneric() {
    return pick(
      'Source : Playlist thématique — pack staff figé.',
      'Source: Theme playlist — fixed staff pack.',
    );
  },
  get overlayRules() {
    const statuses = watchedListStatuses('et');
    return pick(
      `Limiter aux animes vus : seuls les titres du pack présents dans vos listes (${statuses}) peuvent sortir.`,
      `Limit to watched anime: only pack songs that are in your lists (${statuses}) can be drawn.`,
    );
  },
  get fallbackRules() {
    return pick(
      "Compléter avec le pack est activé : si l'intersection Watched est trop petite, le reste du pack complète (jamais l'aléatoire global).",
      'Fill from the pack is on: if the Watched intersection is too small, the rest of the pack fills in (never global random).',
    );
  },
  get decadeCard() {
    return pick('Décennie', 'Decade');
  },
  get decadeBlurb() {
    return pick(
      'Combinable avec un autre pack. Glisse pour choisir la période.',
      'Can be combined with another pack. Slide to pick the period.',
    );
  },
  get noOutsideFill() {
    return pick(
      'Si le pack lui-même est trop petit, le lancement est bloqué.',
      'If the pack itself is too small, the match cannot start.',
    );
  },
  sourceRulesCombine: (left: string, right: string) =>
    pick(
      `Source : Playlist « ${left} » ∩ « ${right} » — intersection des deux packs.`,
      `Source: Playlist “${left}” ∩ “${right}” — intersection of the two packs.`,
    ),
};

export const PLAYLIST_CATEGORY_LABELS: Record<string, string> = {
  get genre() {
    return pick('Genre', 'Genre');
  },
  get tag() {
    return pick('Tag', 'Tag');
  },
  get decade() {
    return pick('Décennie', 'Decade');
  },
  get format() {
    return pick('Format', 'Format');
  },
  get theme() {
    return pick('Thème', 'Theme');
  },
};

function flair(emoji: string, fr: string, en: string) {
  return {
    emoji,
    get blurb() {
      return pick(fr, en);
    },
  };
}

/** Picker flair by staff slug (emoji + one-liner). Unknown packs fall back to 🎵 + API description. */
export const PLAYLIST_PACK_FLAIR: Record<string, { emoji: string; blurb: string }> = {
  shonen: flair('⚡', 'Naruto, One Piece, Dragon Ball…', 'Naruto, One Piece, Dragon Ball…'),
  seinen: flair('🌙', 'Berserk, Vinland Saga, Monster…', 'Berserk, Vinland Saga, Monster…'),
  'slice-of-life': flair('🍃', 'K-On!, Clannad, Yuru Camp…', 'K-On!, Clannad, Yuru Camp…'),
  mecha: flair('🤖', 'Gundam, Evangelion, Code Geass…', 'Gundam, Evangelion, Code Geass…'),
  fantasy: flair(
    '🐉',
    'Frieren, Sword Art Online, Fairy Tail…',
    'Frieren, Sword Art Online, Fairy Tail…',
  ),
  romance: flair('💕', 'Toradora, Horimiya, Kaguya-sama…', 'Toradora, Horimiya, Kaguya-sama…'),
  supernatural: flair(
    '👻',
    'Jujutsu Kaisen, Demon Slayer, Bleach…',
    'Jujutsu Kaisen, Demon Slayer, Bleach…',
  ),
  'sci-fi': flair(
    '🚀',
    'Steins;Gate, Cowboy Bebop, Psycho-Pass…',
    'Steins;Gate, Cowboy Bebop, Psycho-Pass…',
  ),
  sports: flair(
    '🏆',
    'Haikyuu!!, Kuroko no Basket, Slam Dunk…',
    'Haikyuu!!, Kuroko no Basket, Slam Dunk…',
  ),
  isekai: flair('🌀', 'Re:Zero, Konosuba, Mushoku Tensei…', 'Re:Zero, Konosuba, Mushoku Tensei…'),
  '1990s': flair(
    '📼',
    'Vintage 90 — petit catalogue, grosse nostalgie.',
    '90s vintage — a small catalogue, a lot of nostalgia.',
  ),
  '2000s': flair('💿', 'L’âge d’or des openings TV.', 'The golden age of TV openings.'),
  '2010s': flair('📻', 'Ceux qui ont marqué la décennie.', 'The ones that marked the decade.'),
  '2020s': flair('📡', 'Les sorties de cette décennie.', 'The releases of this decade.'),
};

export function playlistFlair(
  slug: string,
  fallbackDescription?: string,
): { emoji: string; blurb: string } {
  const known = PLAYLIST_PACK_FLAIR[slug];
  if (known) return known;
  const trimmed = fallbackDescription?.trim();
  return { emoji: '🎵', blurb: trimmed || pick('Pack thématique staff.', 'Staff theme pack.') };
}
