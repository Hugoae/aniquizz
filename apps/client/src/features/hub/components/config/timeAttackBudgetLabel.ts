import { normalizeTimeBudgetSeconds } from '@aniquizz/shared';

/** French duration for a time-attack budget: "3 min" or "1 min 30". */
export function formatTimeAttackBudget(seconds: number | null | undefined): string {
  const total = normalizeTimeBudgetSeconds(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest}`;
}
