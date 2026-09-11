import { absoluteUrl, HOME_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * Genuine site-name aliases for Google (not a keyword list).
 * Order is preference: misspelling first, then how people describe the product,
 * then the domain as last-resort site name (Google requires lowercase).
 * Do not stuff queries like "quiz naruto" — that is spam and is ignored.
 */
export const SITE_ALTERNATE_NAMES = [
  'AniQuiz',
  'Blindtest anime',
  "Blindtest d'anime",
  'aniquizz.com',
] as const;

/** Organization entity — linked from WebSite as publisher (Google site name signal). */
export function organizationJsonLd() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    alternateName: 'AniQuiz',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/android-chrome-512x512.png'),
      width: 512,
      height: 512,
    },
  };
}

/** WebSite entity — `name` is the label Google shows next to the favicon in results. */
export function websiteJsonLd() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    alternateName: [...SITE_ALTERNATE_NAMES],
    url: SITE_URL,
    description: HOME_DESCRIPTION,
    publisher: { '@id': ORG_ID },
    inLanguage: 'fr-FR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/library?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function videoGameJsonLd() {
  return {
    '@type': 'VideoGame',
    name: SITE_NAME,
    alternateName: 'AniQuiz',
    url: SITE_URL,
    description: HOME_DESCRIPTION,
    applicationCategory: 'Game',
    genre: ['Quiz', 'Music'],
    playMode: ['SinglePlayer', 'MultiPlayer'],
    operatingSystem: 'Web browser',
    inLanguage: 'fr-FR',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
  };
}

/** Single @graph block for the home page (Google site-name best practice). */
export function homeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [organizationJsonLd(), websiteJsonLd(), videoGameJsonLd()],
  };
}
