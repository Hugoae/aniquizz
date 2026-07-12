/** Errors that are unlikely to succeed on blind retry (bad encode, corrupt source). */
const PERMANENT_ERROR_PATTERNS = [
  /ffmpeg exited/i,
  /not a playable MP4/i,
  /Could not probe duration/i,
  /Compression Timeout/i,
  /Invalid duration/i,
  /fails decode check/i,
  /Missing sourceUrl/i,
];

export function isPermanentWorkerError(errorLog: string | null | undefined): boolean {
  if (!errorLog?.trim()) return false;
  return PERMANENT_ERROR_PATTERNS.some((re) => re.test(errorLog));
}

export function parseSkipVideoKeys(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean),
  );
}
