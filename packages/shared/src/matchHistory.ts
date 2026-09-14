/**
 * Unique catalogue ids whose clip started in a match.
 * Leftover playlist rows (never started) must not enter SongHistory.
 */
export function matchHeardSongIds(input: {
  recordedSongIds: number[];
  inProgressSongId?: number | null;
}): number[] {
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const id of [...input.recordedSongIds, input.inProgressSongId ?? null]) {
    if (id == null || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
