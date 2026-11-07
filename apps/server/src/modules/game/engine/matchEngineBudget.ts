import {
  isTimeAttackSettings,
  normalizeTimeBudgetSeconds,
  TIME_ATTACK_REVEAL_SECONDS,
  type TimeAttackTaxKind,
} from '@aniquizz/shared';
import type { MatchEngineHost } from './matchEngineHost';

export function isTimeAttackHost(host: MatchEngineHost): boolean {
  return isTimeAttackSettings(host.room.settings);
}

export function timeAttackFoundCount(host: MatchEngineHost): number {
  let found = 0;
  for (const player of host.room.players.values()) {
    if (player.isBot) continue;
    found = Math.max(found, player.matchCorrectCount);
  }
  return found;
}

export function timeAttackRemainingMs(host: MatchEngineHost): number {
  if (!isTimeAttackHost(host)) return 0;
  if (host.budget.isArmed) return host.budget.getRemainingMs();
  return normalizeTimeBudgetSeconds(host.room.settings.timeBudgetSeconds) * 1000;
}

export function emitTimeAttackBudget(host: MatchEngineHost): void {
  if (!isTimeAttackHost(host)) return;
  host.channel.emit('timeAttack:budget', {
    remainingMs: timeAttackRemainingMs(host),
    foundCount: timeAttackFoundCount(host),
  });
}

export function timeAttackFields(host: MatchEngineHost): {
  remainingMs?: number;
  foundCount?: number;
} {
  if (!isTimeAttackHost(host)) return {};
  return {
    remainingMs: timeAttackRemainingMs(host),
    foundCount: timeAttackFoundCount(host),
  };
}

/** Arm on first guessing beat, then tick only while guessing. */
export function startTimeAttackBudget(host: MatchEngineHost): void {
  if (!isTimeAttackHost(host)) return;
  if (!host.budget.isArmed) {
    const ms = normalizeTimeBudgetSeconds(host.room.settings.timeBudgetSeconds) * 1000;
    host.budget.arm(ms, () => onTimeAttackBudgetExpired(host));
  }
  if (host.room.status === 'paused') {
    emitTimeAttackBudget(host);
    return;
  }
  host.budget.start();
  emitTimeAttackBudget(host);
}

/** Skip/reveal can start a new phase while solo-paused — keep clocks frozen. */
export function keepTimeAttackFrozenIfPaused(host: MatchEngineHost): void {
  if (!isTimeAttackHost(host) || host.room.status !== 'paused') return;
  host.clock.pause();
  host.budget.pause();
  host.pausedDuringPhase = true;
}

export function pauseTimeAttackBudget(host: MatchEngineHost): void {
  if (!isTimeAttackHost(host)) return;
  host.budget.pause();
}

export function applyTimeAttackRoundTax(host: MatchEngineHost, kind: TimeAttackTaxKind): number {
  if (!isTimeAttackHost(host)) return timeAttackRemainingMs(host);
  const remaining = host.budget.tax(kind);
  emitTimeAttackBudget(host);
  return remaining;
}

export function skipTimeAttackRound(host: MatchEngineHost): void {
  if (!isTimeAttackHost(host)) return;
  if (host.phase !== 'guessing' || host.isRoundEnded || host.isRoundLoading) return;
  const remaining = applyTimeAttackRoundTax(host, 'skip');
  host.endRound(remaining <= 0 ? 'finish' : 'skip');
}

export function onTimeAttackBudgetExpired(host: MatchEngineHost): void {
  if (host.room.status === 'finished') return;
  if (host.phase === 'guessing' && !host.isRoundEnded && !host.isRoundLoading) {
    host.endRound('finish');
    return;
  }
  void host.finish();
}

/** Resume clip/reveal clocks after a mid-phase solo pause (do not increment the round). */
export function resumeFrozenTimeAttack(host: MatchEngineHost): void {
  if (host.phase === 'guessing') {
    host.clock.resume(() => {
      try {
        host.endRound();
      } catch {
        // MatchEngineRound logs timer crashes; keep resume from throwing.
      }
    });
    startTimeAttackBudget(host);
    return;
  }
  if (host.phase === 'reveal') {
    host.clock.resume(() => {
      if (host.isPausePending) host.pause();
      else host.startRound();
    });
    emitTimeAttackBudget(host);
  }
}

export function timeAttackRevealSeconds(): number {
  return TIME_ATTACK_REVEAL_SECONDS;
}
