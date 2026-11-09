import { isTimeAttackGame, timeAttackStreakGrantMs, type RoomSettings } from '@aniquizz/shared';
import type { MatchBudgetClock } from './MatchBudgetClock';
import type { MatchEngineHost } from './matchEngineHost';

/** Add the prime for this streak, if it lands on a multiple and the cap allows it. */
export function grantTimeAttackStreak(
  budget: MatchBudgetClock,
  settings: RoomSettings,
  streak: number,
): number {
  if (!isTimeAttackGame(settings)) return 0;
  const grant = timeAttackStreakGrantMs({
    enabled: settings.timeAttackStreakBonus === true,
    streak,
    required: settings.timeAttackStreakLength,
    bonusSeconds: settings.timeAttackStreakBonusSeconds,
    grantedMs: budget.grantedMs,
    remainingMs: budget.getRemainingMs(),
    budgetSeconds: settings.timeBudgetSeconds,
  });
  if (grant > 0) budget.grant(grant);
  return grant;
}

/**
 * Solo shares one clock. A bot must not feed that clock: only the human
 * who just found the title can earn the prime.
 */
export function grantSharedTimeAttackStreak(host: MatchEngineHost): number {
  let streak = 0;
  for (const player of host.room.players.values()) {
    if (player.isBot || player.isCorrect !== true) continue;
    streak = Math.max(streak, player.streak);
  }
  return grantTimeAttackStreak(host.budget, host.room.settings, streak);
}
