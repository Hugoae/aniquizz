/** Semantic Tailwind text-color tokens for stat tiles (design system only). */
export const STAT_COLOR_TOKENS = [
  'text-primary',
  'text-accent',
  'text-success',
  'text-warning',
  'text-info',
  'text-destructive',
  'text-aqua',
] as const;

export type StatColorToken = (typeof STAT_COLOR_TOKENS)[number];
