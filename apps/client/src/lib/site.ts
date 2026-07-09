/** Canonical production site URL (no trailing slash). */
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://aniquizz.com';

export const SITE_NAME = 'AniQuizz';

export const SITE_TAGLINE = 'Blindtest anime en ligne';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

/** Meta description (search snippets + OG). Keep under ~160 chars. */
export const DEFAULT_DESCRIPTION =
  'Blindtest anime gratuit : devine l\'opening ou l\'ending, solo ou multijoueur, avec ta liste AniList.';

/** Browser tab title separator (compact — tabs truncate long em dashes). */
export const TITLE_SEPARATOR = ' · ';

/**
 * Formats a document title for `<title>` / OG.
 * Home → brand only; inner pages → `Page · AniQuizz`.
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
