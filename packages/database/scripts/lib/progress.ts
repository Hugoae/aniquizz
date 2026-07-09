/**
 * Small console-UX helpers shared by the pipeline scripts: duration/ETA
 * formatting, a single-line progress renderer, a labelled tally for summaries,
 * and Retry-After parsing for polite rate-limit backoff.
 */

/** Format a millisecond duration as a compact "1h 2m 3s" (drops leading zero units). */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (h > 0 || m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

/**
 * A single-line progress renderer with elapsed time, ETA and throughput.
 * Call `tick()` after each unit, `line()` to render, and `done()` to finish
 * the line with a newline.
 */
export class Progress {
  private readonly start = Date.now();
  private completed = 0;
  private lastLen = 0;

  constructor(private readonly total: number) {}

  tick(n = 1): void {
    this.completed += n;
  }

  get elapsedMs(): number {
    return Date.now() - this.start;
  }

  private etaMs(): number {
    if (this.completed <= 0) return 0;
    const perUnit = this.elapsedMs / this.completed;
    return Math.max(0, (this.total - this.completed) * perUnit);
  }

  private ratePerMin(): number {
    const min = this.elapsedMs / 60000;
    return min > 0 ? this.completed / min : 0;
  }

  /** Render/overwrite the progress line. `suffix` is appended (e.g. current item). */
  line(suffix = ''): void {
    const pct = this.total > 0 ? Math.floor((100 * this.completed) / this.total) : 0;
    let text =
      `   [${this.completed}/${this.total}] ${pct}%` +
      ` | elapsed ${formatDuration(this.elapsedMs)}` +
      ` | ETA ${formatDuration(this.etaMs())}` +
      ` | ${this.ratePerMin().toFixed(1)}/min`;
    if (suffix) text += ` | ${suffix}`;
    if (text.length > 120) text = text.slice(0, 117) + '...';
    const padded = text.padEnd(this.lastLen, ' ');
    this.lastLen = text.length;
    process.stdout.write(`\r${padded}`);
  }

  /** Terminate the current progress line with a newline. */
  done(): void {
    process.stdout.write('\n');
  }
}

/** Accumulates labelled counts and prints a small aligned summary table. */
export class Tally {
  private readonly counts = new Map<string, number>();

  add(label: string, n = 1): void {
    this.counts.set(label, (this.counts.get(label) ?? 0) + n);
  }

  get(label: string): number {
    return this.counts.get(label) ?? 0;
  }

  print(title: string): void {
    const entries = [...this.counts.entries()];
    const width = entries.reduce((max, [label]) => Math.max(max, label.length), 0);
    console.log(`\n${title}`);
    console.log('─'.repeat(Math.max(title.length, width + 10)));
    for (const [label, value] of entries) {
      console.log(`   ${label.padEnd(width)} : ${value}`);
    }
  }
}

/**
 * Parse an HTTP `Retry-After` header (seconds or HTTP-date) into milliseconds.
 * Falls back to `fallbackMs` when absent/unparseable. Capped to `maxMs`.
 */
export function parseRetryAfterMs(
  headers: unknown,
  fallbackMs: number,
  maxMs = 60_000,
): number {
  const h = (headers ?? {}) as Record<string, string | undefined>;
  const raw = h['retry-after'] ?? h['Retry-After'];
  let ms = fallbackMs;

  if (raw) {
    const asSeconds = Number(raw);
    if (Number.isFinite(asSeconds)) {
      ms = asSeconds * 1000;
    } else {
      const asDate = Date.parse(raw);
      if (Number.isFinite(asDate)) ms = asDate - Date.now();
    }
  }

  if (!Number.isFinite(ms) || ms < 0) ms = fallbackMs;
  return Math.min(Math.max(ms, 0), maxMs);
}
