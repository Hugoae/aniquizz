/** Rank 1–3 accents via design tokens (no hardcoded hex). */
export function matchRankMedalToken(rank: number): string | null {
  if (rank === 1) return 'hsl(var(--warning))';
  if (rank === 2) return 'hsl(var(--silver))';
  if (rank === 3) return 'hsl(var(--medal-bronze))';
  return null;
}
