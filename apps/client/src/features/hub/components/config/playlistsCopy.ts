/** French UI copy for thematic playlists (isolated for i18n). */
export const PLAYLISTS_COPY = {
  tab: 'Playlists',
  pickerTitle: 'Packs thématiques',
  empty: 'Aucune playlist publiée pour le moment.',
  loadError: 'Impossible de charger les playlists.',
  loadErrorOffline:
    "Le serveur de jeu n'est pas joignable. Vérifiez qu'il tourne (port 3001 en local), puis réessayez.",
  retry: 'Réessayer',
  choosePack: 'Choisissez une playlist pour lancer la partie.',
  overlayLabel: 'Limiter à nos animes vus',
  overlayHint: 'Intersection du pack et de vos listes AniList / MyAnimeList.',
  fallbackLabel: 'Compléter avec le pack',
  fallbackHint: 'Les manches manquantes restent dans ce pack (jamais le catalogue global).',
  packTooSmall:
    "Ce pack n'a pas assez de sons pour ce nombre de manches (pas de complétion hors pack).",
  filteredEmpty: 'Aucun son jouable pour ces filtres. Changez la source ou les filtres.',
  qcmTooSmall:
    "Pas assez d'animes distincts dans ce pool pour le QCM. Passez en Typing ou élargissez les filtres.",
  overlayEmpty: 'Aucun son du pack dans vos listes pour ces filtres.',
  overlayInsufficient: (playable: number, soundCount: number) =>
    `Seulement ${playable} son${playable > 1 ? 's' : ''} du pack dans vos listes pour ${soundCount} demandé${soundCount > 1 ? 's' : ''}. ` +
    'Activez « Compléter avec le pack » ou réduisez le nombre de sons.',
  sourceRules: (name: string) => `Source : Playlist « ${name} » — pack staff figé.`,
  sourceRulesGeneric: 'Source : Playlist thématique — pack staff figé.',
  overlayRules:
    'Limiter aux animes vus : seuls les titres du pack présents dans vos listes peuvent sortir.',
  fallbackRules:
    "Compléter avec le pack est activé : si l'intersection Watched est trop petite, le reste du pack complète (jamais l'aléatoire global).",
  decadeCard: 'Décennie',
  decadeBlurb: 'Combinable avec un autre pack. Glisse pour choisir la période.',
  noOutsideFill: 'Si le pack lui-même est trop petit, le lancement est bloqué.',
  sourceRulesCombine: (left: string, right: string) =>
    `Source : Playlist « ${left} » ∩ « ${right} » — intersection des deux packs.`,
} as const;

export const PLAYLIST_CATEGORY_LABELS: Record<string, string> = {
  genre: 'Genre',
  tag: 'Tag',
  decade: 'Décennie',
  format: 'Format',
  theme: 'Thème',
};

/** Picker flair by staff slug (emoji + one-liner). Unknown packs fall back to 🎵 + API description. */
export const PLAYLIST_PACK_FLAIR: Record<string, { emoji: string; blurb: string }> = {
  shonen: { emoji: '⚡', blurb: 'Naruto, One Piece, Dragon Ball…' },
  seinen: { emoji: '🌙', blurb: 'Berserk, Vinland Saga, Monster…' },
  'slice-of-life': { emoji: '🍃', blurb: 'K-On!, Clannad, Yuru Camp…' },
  mecha: { emoji: '🤖', blurb: 'Gundam, Evangelion, Code Geass…' },
  fantasy: { emoji: '🐉', blurb: 'Frieren, Sword Art Online, Fairy Tail…' },
  romance: { emoji: '💕', blurb: 'Toradora, Horimiya, Kaguya-sama…' },
  supernatural: { emoji: '👻', blurb: 'Jujutsu Kaisen, Demon Slayer, Bleach…' },
  'sci-fi': { emoji: '🚀', blurb: 'Steins;Gate, Cowboy Bebop, Psycho-Pass…' },
  sports: { emoji: '🏆', blurb: 'Haikyuu!!, Kuroko no Basket, Slam Dunk…' },
  isekai: { emoji: '🌀', blurb: 'Re:Zero, Konosuba, Mushoku Tensei…' },
  '1990s': { emoji: '📼', blurb: 'Vintage 90 — petit catalogue, grosse nostalgie.' },
  '2000s': { emoji: '💿', blurb: 'L’âge d’or des openings TV.' },
  '2010s': { emoji: '📻', blurb: 'Ceux qui ont marqué la décennie.' },
  '2020s': { emoji: '📡', blurb: 'Les sorties de cette décennie.' },
};

export function playlistFlair(
  slug: string,
  fallbackDescription?: string,
): { emoji: string; blurb: string } {
  const known = PLAYLIST_PACK_FLAIR[slug];
  if (known) return known;
  const trimmed = fallbackDescription?.trim();
  return { emoji: '🎵', blurb: trimmed || 'Pack thématique staff.' };
}
