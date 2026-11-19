import { extendLive, liveStrings } from '@/lib/i18n/text';

/** Canonical production site URL (no trailing slash). */
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://aniquizz.com';

/** Display / shell version tag. `sync:news` copies it into `index.html`. */
export const SITE_VERSION = '26.9';

export const SITE_NAME = 'AniQuizz';

/** External page for optional, no-perk support of AniQuizz. */
export const KOFI_URL = 'https://ko-fi.com/aniquizz';

/** Home `<title>` — shown as the purple link in Google results. */
export const HOME_PAGE_TITLE = "AniQuizz - Le Blindtest d'Anime";

/** Short tagline for OG / sharing when a longer title is not needed. */
export const SITE_TAGLINE = "Le Blindtest d'Anime";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/android-chrome-512x512.png`;

/**
 * Home meta description (search snippets + OG). Natural sentences only —
 * no trailing nav labels (Jouer, Librairie…) which Google was picking from
 * the static app-shell HTML, and no keyword lists.
 */
export const HOME_DESCRIPTION =
  "Blindtest anime en ligne. Devinez l'anime à partir de la musique. En solo ou à plusieurs, sans pubs et 100% gratuit !";

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

const PAGE_TITLE_KEYS = [
  'play',
  'playCreate',
  'playJoin',
  'game',
  'news',
  'leaderboard',
  'library',
  'suggestions',
  'profile',
  'daily',
  'resetPassword',
  'privacy',
  'terms',
  'legal',
] as const;

/** Route → tab title. Admin and 404 stay as written; the rest follow the UI language. */
export const PAGE_TITLES = extendLive(
  {
    home: SITE_NAME,
    admin: 'Admin',
    notFound: '404',
  },
  liveStrings('common', 'pageTitle', PAGE_TITLE_KEYS),
);
