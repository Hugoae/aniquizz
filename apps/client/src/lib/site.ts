/** Canonical production site URL (no trailing slash). */
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://aniquizz.com';

export const SITE_NAME = 'AniQuizz';

/** Home `<title>` — shown as the purple link in Google results. */
export const HOME_PAGE_TITLE = "AniQuizz - Le Blindtest d'Anime";

/** Short tagline for OG / sharing when a longer title is not needed. */
export const SITE_TAGLINE = "Le Blindtest d'Anime";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/android-chrome-512x512.png`;

/**
 * Home meta description (search snippets + OG). Ends at « vous êtes le meilleur. » —
 * no trailing nav labels (Jouer, Librairie…) which Google was picking from the
 * static app-shell HTML.
 */
export const HOME_DESCRIPTION =
  'Blindtest anime en ligne. Testez votre culture anime. Devinez l\'anime à partir de la musique. Défiez vos amis et prouvez que vous êtes le meilleur.';

/** Default meta description for inner pages. Keep under ~160 chars. */
export const DEFAULT_DESCRIPTION = HOME_DESCRIPTION;

/** Browser tab title separator (compact — tabs truncate long em dashes). */
export const TITLE_SEPARATOR = ' | ';

/**
 * Formats a document title for `<title>` / OG.
 * Home → brand only; inner pages → `Page | AniQuizz`.
 */
export function formatPageTitle(pageTitle?: string): string {
  if (!pageTitle || pageTitle === SITE_NAME) return SITE_NAME;
  if (pageTitle.includes(SITE_NAME)) return pageTitle;
  return `${pageTitle}${TITLE_SEPARATOR}${SITE_NAME}`;
}

/** Build an absolute URL for a site path (e.g. `/news` → `https://aniquizz.com/news`). */
export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

/** Route → tab title map (single source of truth). */
export const PAGE_TITLES = {
  home: SITE_NAME,
  play: 'Jouer',
  playCreate: 'Configurer la partie',
  playJoin: 'Rejoindre un salon',
  game: 'Partie',
  news: 'Actus',
  leaderboard: 'Classement',
  library: 'Librairie',
  profile: 'Profil',
  admin: 'Admin',
  resetPassword: 'Mot de passe',
  notFound: '404',
  privacy: 'Confidentialité',
  terms: 'CGU',
  legal: 'Mentions légales',
} as const;
