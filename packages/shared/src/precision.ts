/**
 * Answer precision for typing / mix / QCM target selection.
 * - franchise: any title in the saga counts (e.g. "My Hero Academia").
 * - anime: the specific catalogue anime/season entry (e.g. "My Hero Academia Season 3").
 * - artist: the song's performer (any billed unit; QCM uses the first billed unit). Title/anime do not count.
 */
export type Precision = 'anime' | 'franchise' | 'artist';

/** Legacy wire value kept for backward compatibility on ingest. */
export const LEGACY_PRECISION_EXACT = 'exact';

export function normalizePrecision(value: unknown): Precision {
  if (value === 'anime' || value === LEGACY_PRECISION_EXACT) return 'anime';
  if (value === 'artist') return 'artist';
  return 'franchise';
}

export const PRECISION_META: Record<
  Precision,
  { label: string; description: string; chipLabel: string }
> = {
  franchise: {
    label: 'Franchise',
    description: 'La saga suffit',
    chipLabel: 'Franchise',
  },
  anime: {
    label: 'Anime',
    description: 'Saison précise',
    chipLabel: 'Anime',
  },
  artist: {
    label: 'Artiste',
    description: 'Un artiste suffit',
    chipLabel: 'Artiste',
  },
};

export function getPrecisionMeta(value: unknown) {
  return PRECISION_META[normalizePrecision(value)];
}

export function getPrecisionLabel(value: unknown): string {
  return getPrecisionMeta(value).label;
}

export function getPrecisionChipLabel(value: unknown): string {
  return getPrecisionMeta(value).chipLabel;
}

export function isAnimePrecision(value: unknown): boolean {
  return normalizePrecision(value) === 'anime';
}

export function isFranchisePrecision(value: unknown): boolean {
  return normalizePrecision(value) === 'franchise';
}

export function isArtistPrecision(value: unknown): boolean {
  return normalizePrecision(value) === 'artist';
}
