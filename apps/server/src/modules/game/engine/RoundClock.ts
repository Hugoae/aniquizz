/**
 * Authoritative single-shot timer for a match phase (guess or reveal).
 * The server owns time; clients only render a countdown derived from
 * `serverNow` / `endsAt`.
 */
export class RoundClock {
  private timer: NodeJS.Timeout | null = null;
  private expireCallback: (() => void) | null = null;
  private pausedRemainingMs: number | null = null;
  public startedAt = 0;
  public endsAt = 0;
  public durationMs = 0;

  /** Start (or restart) the clock. `onExpire` fires once after `durationMs`. */
  start(durationMs: number, onExpire: () => void): void {
    this.clear();
    this.expireCallback = onExpire;
    this.startedAt = Date.now();
    this.durationMs = durationMs;
    this.endsAt = this.startedAt + durationMs;
    this.timer = setTimeout(() => {
      this.timer = null;
      const cb = this.expireCallback;
      this.expireCallback = null;
      cb?.();
    }, durationMs);
  }

  /** Freeze remaining time (solo time-attack pause mid-phase). */
  pause(): void {
    if (!this.timer) return;
    this.pausedRemainingMs = Math.max(0, this.endsAt - Date.now());
    clearTimeout(this.timer);
    this.timer = null;
  }

  /** Continue a paused phase with the leftover duration. */
  resume(onExpire?: () => void): void {
    const remaining = this.pausedRemainingMs;
    const cb = onExpire ?? this.expireCallback;
    this.pausedRemainingMs = null;
    if (remaining == null) return;
    if (remaining <= 0) {
      cb?.();
      return;
    }
    this.start(remaining, cb ?? (() => undefined));
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.expireCallback = null;
    this.pausedRemainingMs = null;
  }

  get isRunning(): boolean {
    return this.timer !== null;
  }

  get remainingMs(): number {
    if (this.pausedRemainingMs != null) return this.pausedRemainingMs;
    return Math.max(0, this.endsAt - Date.now());
  }
}
