import type { CSSProperties } from 'react';

const SEASON_LABELS: Record<string, string> = {
  WINTER: 'Hiver',
  SPRING: 'Printemps',
  SUMMER: 'Été',
  FALL: 'Automne',
};

const FORMAT_LABELS: Record<string, string> = {
  TV: 'Série TV',
  MOVIE: 'Film',
  OVA: 'OVA',
  ONA: 'ONA',
  SPECIAL: 'Spécial',
  MUSIC: 'Musique',
  TV_SHORT: 'Court',
};

export function isRevealAccentColor(value: string | null | undefined): value is string {
  return !!value && /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function formatRevealSeasonYear(season?: string | null, year?: number | null): string | null {
  const seasonLabel = season ? SEASON_LABELS[season.toUpperCase()] ?? season : null;
  if (seasonLabel && year) return `${seasonLabel} ${year}`;
  if (year) return String(year);
  if (seasonLabel) return seasonLabel;
  return null;
}

export function formatRevealFormat(format?: string | null): string | null {
  if (!format) return null;
  const key = format.toUpperCase();
  return FORMAT_LABELS[key] ?? format;
}

export function formatRevealEpisodeRange(range?: string | null): string | null {
  const trimmed = range?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('Ép.') || trimmed.startsWith('Ep.') ? trimmed : `Ép. ${trimmed}`;
}

/** Inline styles for a subtle coverColor accent on the reveal card. */
export function revealAccentStyle(coverColor?: string | null): CSSProperties | undefined {
  if (!isRevealAccentColor(coverColor)) return undefined;
  return {
    borderColor: `${coverColor}66`,
    boxShadow: `0 8px 32px -8px ${coverColor}55, 0 0 0 1px ${coverColor}33`,
  };
}
