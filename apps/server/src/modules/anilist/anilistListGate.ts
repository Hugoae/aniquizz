/** AniList GraphQL gate: last-success cache + backoff after 403/429/5xx/timeouts. */

export const ANILIST_SUCCESS_TTL_MS = 10 * 60 * 1000;
export const ANILIST_INITIAL_BACKOFF_MS = 60 * 1000;
export const ANILIST_MAX_BACKOFF_MS = 15 * 60 * 1000;

export const isAnilistIpBlockStatus = (status: number | undefined): boolean =>
  status === 403 || status === 429;

export const isAnilistOutageStatus = (status: number | undefined): boolean =>
  status != null && status >= 500 && status < 600;

/** HTTP statuses that mean AniList itself refused or failed the request. */
export const isAnilistUnavailableStatus = (status: number | undefined): boolean =>
  isAnilistIpBlockStatus(status) || isAnilistOutageStatus(status);

export interface AnilistListResult {
  ids: number[];
  /** AniList refused or failed the request (403/429/5xx/timeout) or we are still in backoff. */
  blocked: boolean;
  /** ids come from the last successful fetch, not a live response. */
  stale: boolean;
}

export class AnilistListGate {
  private backoffUntil = 0;
  private backoffMs: number;
  private readonly lastSuccess = new Map<string, number[]>();
  private readonly successAt = new Map<string, number>();

  constructor(
    private readonly initialBackoffMs = ANILIST_INITIAL_BACKOFF_MS,
    private readonly maxBackoffMs = ANILIST_MAX_BACKOFF_MS,
    private readonly successTtlMs = ANILIST_SUCCESS_TTL_MS,
  ) {
    this.backoffMs = initialBackoffMs;
  }

  reset(): void {
    this.backoffUntil = 0;
    this.backoffMs = this.initialBackoffMs;
    this.lastSuccess.clear();
    this.successAt.clear();
  }

  isInBackoff(now = Date.now()): boolean {
    return now < this.backoffUntil;
  }

  hasFreshSuccess(username: string, now = Date.now()): boolean {
    const at = this.successAt.get(username);
    if (at == null) return false;
    return now - at < this.successTtlMs && this.lastSuccess.has(username);
  }

  freshIds(username: string): number[] | undefined {
    return this.lastSuccess.get(username);
  }

  rememberSuccess(username: string, ids: number[], now = Date.now()): void {
    this.lastSuccess.set(username, ids);
    this.successAt.set(username, now);
    this.backoffMs = this.initialBackoffMs;
    this.backoffUntil = 0;
  }

  /** Record an AniList-side failure and return the last success for this user, if any. */
  onUnavailable(username: string, now = Date.now()): AnilistListResult {
    this.backoffUntil = now + this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
    const ids = this.lastSuccess.get(username) ?? [];
    return { ids, blocked: true, stale: ids.length > 0 };
  }

  serveBackoff(username: string): AnilistListResult {
    const ids = this.lastSuccess.get(username) ?? [];
    return { ids, blocked: true, stale: ids.length > 0 };
  }

  forgetUser(username: string): void {
    this.lastSuccess.delete(username);
    this.successAt.delete(username);
  }
}

export const anilistListGate = new AnilistListGate();
