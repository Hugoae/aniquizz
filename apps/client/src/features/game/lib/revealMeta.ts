import type { CSSProperties } from 'react';
import { pick } from '@/lib/i18n/text';

/** Decorative genre/tag chips cycle through the token palette (no raw colors). */
export const REVEAL_TAG_TONES = [
  'bg-primary/10 text-primary border-primary/20',
  'bg-accent/10 text-accent border-accent/20',
  'bg-aqua/10 text-aqua border-aqua/20',
  'bg-info/10 text-info border-info/20',
  'bg-success/10 text-success border-success/20',
  'bg-warning/10 text-warning border-warning/20',
] as const;

function seasonName(key: string): string | null {
  switch (key) {
    case 'WINTER':
      return pick('Hiver', 'Winter');
    case 'SPRING':
      return pick('Printemps', 'Spring');
    case 'SUMMER':
      return pick('Été', 'Summer');
    case 'FALL':
      return pick('Automne', 'Fall');
    default:
      return null;
  }
}

function formatName(key: string): string | null {
  switch (key) {
    case 'TV':
      return pick('Série TV', 'TV series');
    case 'MOVIE':
      return pick('Film', 'Movie');
    case 'OVA':
      return 'OVA';
    case 'ONA':
      return 'ONA';
    case 'SPECIAL':
      return pick('Spécial', 'Special');
    case 'MUSIC':
      return pick('Musique', 'Music');
    case 'TV_SHORT':
      return pick('Court', 'Short');
    default:
      return null;
  }
}

export function isRevealAccentColor(value: string | null | undefined): value is string {
  return !!value && /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function formatRevealSeasonYear(
  season?: string | null,
  year?: number | null,
): string | null {
  const seasonLabel = season ? (seasonName(season.toUpperCase()) ?? season) : null;
  if (seasonLabel && year) return `${seasonLabel} ${year}`;
  if (year) return String(year);
  if (seasonLabel) return seasonLabel;
  return null;
}

export function formatRevealFormat(format?: string | null): string | null {
  if (!format) return null;
  const key = format.toUpperCase();
  return formatName(key) ?? format;
}

export function formatRevealEpisodeRange(range?: string | null): string | null {
  const trimmed = range?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('Ép.') || trimmed.startsWith('Ep.')) return trimmed;
  return `${pick('Ép.', 'Ep.')} ${trimmed}`;
}

/** Inline styles for a subtle coverColor accent on the reveal card. */
export function revealAccentStyle(coverColor?: string | null): CSSProperties | undefined {
  if (!isRevealAccentColor(coverColor)) return undefined;
  return {
    borderColor: `${coverColor}66`,
    boxShadow: `0 8px 32px -8px ${coverColor}55, 0 0 0 1px ${coverColor}33`,
  };
}
