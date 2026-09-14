const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
const MAL_HOST = /(^|\.)myanimelist\.net$/i;
const ANILIST_HOST = /(^|\.)anilist\.co$/i;
const MAL_PATH = /\/(?:profile|animelist)\/([^/]+)/i;
const ANILIST_PATH = /\/user\/([^/]+)/i;

const sanitizeHandle = (raw: string): string =>
  raw
    .normalize('NFC')
    .replace(ZERO_WIDTH, '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();

const tryParseUrl = (value: string): URL | null => {
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(withProtocol);
  } catch {
    return null;
  }
};

const lastMatchedSegment = (pathname: string, pattern: RegExp): string | null => {
  const match = pathname.match(pattern);
  if (!match?.[1]) return null;
  try {
    const decoded = decodeURIComponent(match[1]).replace(/^@/, '').trim();
    return decoded || null;
  } catch {
    return match[1].replace(/^@/, '').trim() || null;
  }
};

/** Extract a MAL username from a raw handle, `@name`, or profile/animelist URL. */
export const normalizeMalUsername = (raw: string): string | null => {
  const cleaned = sanitizeHandle(raw);
  if (!cleaned) return null;
  const url = tryParseUrl(cleaned);
  if (url && MAL_HOST.test(url.hostname)) {
    const fromPath = lastMatchedSegment(url.pathname, MAL_PATH);
    if (fromPath) return fromPath;
  }
  const stripped = cleaned.replace(/^@/, '').trim();
  return stripped || null;
};

/** Extract an AniList username from a raw handle, `@name`, or profile URL. */
export const normalizeAnilistUsername = (raw: string): string | null => {
  const cleaned = sanitizeHandle(raw);
  if (!cleaned) return null;
  const url = tryParseUrl(cleaned);
  if (url && ANILIST_HOST.test(url.hostname)) {
    const fromPath = lastMatchedSegment(url.pathname, ANILIST_PATH);
    if (fromPath) return fromPath;
  }
  const stripped = cleaned.replace(/^@/, '').trim();
  return stripped || null;
};
