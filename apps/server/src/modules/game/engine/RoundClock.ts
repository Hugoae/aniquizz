/**
 * Authoritative single-shot timer for a match phase (guess or reveal).
 * The server owns time; clients only render a countdown derived from
 * `serverNow` / `endsAt`.
 */
export class RoundClock {
  private timer: NodeJS.Timeout | null = null;
  public startedAt = 0;
  public endsAt = 0;
  public durationMs = 0;

  /** Start (or restart) the clock. `onExpire` fires once after `durationMs`. */
  start(durationMs: number, onExpire: () => void): void {
    this.clear();
    this.startedAt = Date.now();
    this.durationMs = durationMs;
    this.endsAt = this.startedAt + durationMs;
    this.timer = setTimeout(onExpire, durationMs);
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  get isRunning(): boolean {
    return this.timer !== null;
  }

  get remainingMs(): number {
    return Math.max(0, this.endsAt - Date.now());
  }
}
