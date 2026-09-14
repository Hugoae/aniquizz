// packages/shared/src/difficulty.ts
/** Canonical lobby difficulty ids, hardest → easiest. */
export const DIFFICULTY_IDS = ['hard', 'medium', 'easy'] as const;

export type DifficultyId = (typeof DIFFICULTY_IDS)[number];

const isDifficultyId = (value: string): value is DifficultyId =>
  (DIFFICULTY_IDS as readonly string[]).includes(value);

/**
 * Difficulties to count in pool previews: exactly the checked boxes (union).
 * Do not add easier fallback tiers — that is only the in-match draw cascade.
 */
export function selectedPoolDifficulties(selected?: string[]): string[] | undefined {
  if (!selected?.length) return undefined;
  const picked = new Set(selected.map((value) => value.toLowerCase()).filter(isDifficultyId));
  if (!picked.size) return undefined;
  return DIFFICULTY_IDS.filter((id) => picked.has(id));
}
