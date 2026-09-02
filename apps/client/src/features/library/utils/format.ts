/** Compact count for popularity / likes (e.g. 12400 → "12.4k"). */
export function formatCompactCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) {
    const k = n / 1000;
    const rounded = k >= 100 ? Math.round(k) : Math.round(k * 10) / 10;
    return `${rounded}k`.replace('.0k', 'k');
  }
  const m = n / 1_000_000;
  const rounded = m >= 100 ? Math.round(m) : Math.round(m * 10) / 10;
  return `${rounded}M`.replace('.0M', 'M');
}
