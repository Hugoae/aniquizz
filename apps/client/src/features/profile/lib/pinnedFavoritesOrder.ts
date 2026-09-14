export type PinAddResult = { ids: number[]; rejected: 'duplicate' | 'max' | null };

export function addPinnedSong(ids: number[], songId: number, max: number): PinAddResult {
  if (ids.includes(songId)) return { ids, rejected: 'duplicate' };
  if (ids.length >= max) return { ids, rejected: 'max' };
  return { ids: [...ids, songId], rejected: null };
}

export function removePinnedSong(ids: number[], songId: number): number[] {
  return ids.filter((id) => id !== songId);
}

export function movePinnedSong(ids: number[], songId: number, direction: -1 | 1): number[] {
  const idx = ids.indexOf(songId);
  if (idx < 0) return ids;
  const target = idx + direction;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  const swap = next[target]!;
  next[target] = next[idx]!;
  next[idx] = swap;
  return next;
}
