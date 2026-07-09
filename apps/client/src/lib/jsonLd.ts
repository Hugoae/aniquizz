import { absoluteUrl, HOME_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** Organization entity — linked from WebSite as publisher (Google site name signal). */
export function organizationJsonLd() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
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
    alternateName: ['Blindtest anime', "Blindtest d'anime"],
    url: SITE_URL,
    description: HOME_DESCRIPTION,
    publisher: { '@id': ORG_ID },
    inLanguage: 'fr-FR',
  };
}

export function videoGameJsonLd() {
  return {
    '@type': 'VideoGame',
    name: SITE_NAME,
    url: SITE_URL,
    description: HOME_DESCRIPTION,
    applicationCategory: 'Game',
    operatingSystem: 'Web browser',
    inLanguage: 'fr-FR',
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
