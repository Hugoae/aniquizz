/** Profiles with a quiz-du-jour run held in memory. Today must not forfeit those. */
const live = new Set<string>();

export function markDailyRunLive(profileId: string, on: boolean): void {
  if (on) live.add(profileId);
  else live.delete(profileId);
}

export function isDailyRunLive(profileId: string): boolean {
  return live.has(profileId);
}

export function clearDailyRunRegistry(): void {
  live.clear();
}
