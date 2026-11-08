import { applyTimeAttackTax, timeAttackTaxMs, type TimeAttackTaxKind } from '@aniquizz/shared';

/**
 * Match-wide guess budget for solo time-attack. Ticks only while guessing;
 * paused during intro, ready, reveal, and solo pause.
 */
export class MatchBudgetClock {
  private timer: NodeJS.Timeout | null = null;
  private remainingStoredMs = 0;
  private running = false;
  private startedAt = 0;
  private onExpire: (() => void) | null = null;
  private armed = false;
  private skipCount = 0;
  private lastTaxMs = 0;

  /** Amount removed by the latest `tax()` call (ms). */
  get lastTax(): number {
    return this.lastTaxMs;
  }

  /** Skips already taken this run. The next skip costs `timeAttackTaxMs('skip', skips)`. */
  get skips(): number {
    return this.skipCount;
  }

  get isArmed(): boolean {
    return this.armed;
  }

  get isRunning(): boolean {
    return this.running;
  }

  arm(budgetMs: number, onExpire: () => void): void {
    this.clearTimer();
    this.remainingStoredMs = Math.max(0, budgetMs);
    this.onExpire = onExpire;
    this.armed = true;
    this.running = false;
    this.startedAt = 0;
    this.skipCount = 0;
    this.lastTaxMs = 0;
  }

  /** Start or resume ticking. No-op when unarmed or already running. */
  start(): void {
    if (!this.armed || this.running) return;
    const remaining = this.getRemainingMs();
    if (remaining <= 0) {
      this.remainingStoredMs = 0;
      this.running = false;
      this.onExpire?.();
      return;
    }
    this.running = true;
    this.startedAt = Date.now();
    this.remainingStoredMs = remaining;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.running = false;
      this.remainingStoredMs = 0;
      this.onExpire?.();
    }, remaining);
  }

  pause(): void {
    if (!this.running) return;
    this.remainingStoredMs = this.getRemainingMs();
    this.clearTimer();
    this.running = false;
  }

  /**
   * Subtract a skip/wrong tax. Restarts the live timer when ticking.
   * Does not fire `onExpire` — the caller decides whether to finish.
   */
  tax(kind: TimeAttackTaxKind, escalateSkips = true): number {
    const skipsSoFar = this.skipCount;
    if (kind === 'skip') this.skipCount += 1;
    this.lastTaxMs = timeAttackTaxMs(kind, skipsSoFar, escalateSkips);
    const next = applyTimeAttackTax(this.getRemainingMs(), kind, skipsSoFar, escalateSkips);
    this.remainingStoredMs = next;
    if (this.running) {
      this.clearTimer();
      this.running = false;
      if (next > 0) this.start();
    }
    return next;
  }

  getRemainingMs(): number {
    if (!this.armed) return 0;
    if (!this.running) return Math.max(0, this.remainingStoredMs);
    return Math.max(0, this.remainingStoredMs - (Date.now() - this.startedAt));
  }

  clear(): void {
    this.clearTimer();
    this.remainingStoredMs = 0;
    this.running = false;
    this.armed = false;
    this.onExpire = null;
    this.startedAt = 0;
    this.skipCount = 0;
    this.lastTaxMs = 0;
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
