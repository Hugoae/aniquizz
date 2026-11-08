import {
  isTimeAttackSettings,
  normalizePrecision,
  normalizeTimeBudgetSeconds,
  timeAttackMedal,
  timeAttackNextMedalGoal,
  timeAttackTaxMs,
  TIME_ATTACK_REVEAL_SECONDS,
  type TimeAttackBudgetPayload,
  type TimeAttackNextMedal,
  type TimeAttackTaxKind,
} from '@aniquizz/shared';
import type { MatchEngineHost } from './matchEngineHost';
import { toRevealSong } from './matchEngineReveal';

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

/**
 * Same inputs as the game-over medal: budget, precision, and the difficulties of
 * songs actually heard (the current clip counts). Not the lobby difficulty filter.
 */
export function timeAttackRunCue(host: MatchEngineHost): {
  nextSkipTaxMs: number;
  nextMedal: TimeAttackNextMedal | null;
} {
  const heard = new Set(host.recordedRounds.map((round) => round.songId));
  const current = host.playlist[host.currentRoundIndex];
  if (current) heard.add(current.id);
  const difficulties = host.playlist
    .filter((item) => heard.has(item.id))
    .map((item) => item.difficulty);
  const budget = normalizeTimeBudgetSeconds(host.room.settings.timeBudgetSeconds);
  const precision = normalizePrecision(host.room.settings.precision);
  const found = timeAttackFoundCount(host);
  const medal = timeAttackMedal(found, budget, difficulties, precision);
  const goal = timeAttackNextMedalGoal(found, budget, difficulties, medal, precision);
  return {
    nextSkipTaxMs: timeAttackTaxMs('skip', host.budget.skips, timeAttackPunitiveSkip(host)),
    nextMedal: goal ? { tier: goal.tier, pointsNeeded: goal.pointsNeeded } : null,
  };
}

export function emitTimeAttackBudget(
  host: MatchEngineHost,
  extra: Pick<TimeAttackBudgetPayload, 'tax' | 'taxMs' | 'roundResult'> = {},
): void {
  if (!isTimeAttackHost(host)) return;
  host.channel.emit('timeAttack:budget', {
    remainingMs: timeAttackRemainingMs(host),
    foundCount: timeAttackFoundCount(host),
    ...timeAttackRunCue(host),
    ...extra,
  });
}

export function timeAttackFields(host: MatchEngineHost): {
  remainingMs?: number;
  foundCount?: number;
  nextSkipTaxMs?: number;
  nextMedal?: TimeAttackNextMedal | null;
} {
  if (!isTimeAttackHost(host)) return {};
  return {
    remainingMs: timeAttackRemainingMs(host),
    foundCount: timeAttackFoundCount(host),
    ...timeAttackRunCue(host),
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
  const remaining = host.budget.tax(kind, timeAttackPunitiveSkip(host));
  // With the reveal on, the skipped title rides on round_reveal instead.
  const item =
    kind === 'skip' && !timeAttackRevealEnabled(host)
      ? host.playlist[host.currentRoundIndex]
      : undefined;
  // Solo-only mode, so revealing the skipped title on the room channel leaks nothing.
  emitTimeAttackBudget(host, {
    tax: kind,
    taxMs: host.budget.lastTax,
    ...(item ? { roundResult: { outcome: 'skipped' as const, song: toRevealSong(item) } } : {}),
  });
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

/** Host option (default on): false keeps every skip at the flat 5 s tax. */
export function timeAttackPunitiveSkip(host: MatchEngineHost): boolean {
  return host.room.settings.timeAttackPunitiveSkip !== false;
}

/** Host option (default on): false skips the 3 s reveal after found / missed titles. */
export function timeAttackRevealEnabled(host: MatchEngineHost): boolean {
  return host.room.settings.timeAttackReveal !== false;
}

export function timeAttackRevealSeconds(): number {
  return TIME_ATTACK_REVEAL_SECONDS;
}
