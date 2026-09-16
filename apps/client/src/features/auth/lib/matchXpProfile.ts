import { levelFromXp } from '@aniquizz/shared';

/** XP this player earned in a finished match (rankings from `game_over`). */
export function xpEarnedForUser(
  rankings: ReadonlyArray<{ id: string | number; xpEarned?: number }>,
  userId: string,
): number | null {
  const row = rankings.find((player) => String(player.id) === userId);
  if (!row || typeof row.xpEarned !== 'number' || !Number.isFinite(row.xpEarned)) return null;
  return Math.max(0, Math.round(row.xpEarned));
}

/** Auth profile fields derived from a new lifetime XP total. */
export function profileXpFields(lifetimeXp: number): { xp: number; level: number } {
  const xp = Math.max(0, Math.round(lifetimeXp));
  return { xp, level: levelFromXp(xp) };
}
