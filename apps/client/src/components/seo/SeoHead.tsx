import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  formatPageTitle,
  SITE_NAME,
  SITE_TAGLINE,
} from '@/lib/site';

interface SeoHeadProps {
  /** Page title segment (brand-only when equal to SITE_NAME or omitted with homeOnly). */
  title: string;
  description?: string;
  /** Canonical path override (defaults to current location pathname). */
  path?: string;
  image?: string;
  /** When true, adds robots noindex,nofollow (auth-only / gameplay routes). */
  noindex?: boolean;
  /** Home route: title is just the brand, tagline goes to description only. */
  homeOnly?: boolean;
  /** Extra JSON-LD object(s) injected as application/ld+json. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function SeoHead({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  noindex = false,
  homeOnly = false,
  jsonLd,
}: SeoHeadProps) {
  const { pathname } = useLocation();
  const canonicalPath = path ?? pathname;
  const canonical = absoluteUrl(canonicalPath);
  const fullTitle = homeOnly || title === SITE_NAME ? SITE_NAME : formatPageTitle(title);
  const metaDescription = description ?? DEFAULT_DESCRIPTION;

  const jsonLdBlocks = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonical} />

      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:title" content={homeOnly ? `${SITE_NAME} — ${SITE_TAGLINE}` : fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={homeOnly ? `${SITE_NAME} — ${SITE_TAGLINE}` : fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={image} />

      {jsonLdBlocks.map((block, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
