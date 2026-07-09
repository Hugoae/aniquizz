import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'fr-FR',
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/android-chrome-512x512.png'),
  };
}

export function videoGameJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
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

export function homeJsonLd() {
  return [websiteJsonLd(), organizationJsonLd(), videoGameJsonLd()];
}
