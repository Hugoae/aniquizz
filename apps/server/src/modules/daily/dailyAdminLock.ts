/** Lineup edits are blocked for past days, and for today once anyone has started. */
export function dailyAdminLineupLocked(
  isoDate: string,
  today: string,
  attemptCount: number,
): boolean {
  if (isoDate < today) return true;
  if (isoDate > today) return false;
  return attemptCount > 0;
}

/** Voiding shrinks a live day; future days should replace the song instead. */
export function dailyAdminCanVoidRound(
  isoDate: string,
  today: string,
  attemptCount: number,
): boolean {
  return isoDate === today && attemptCount > 0;
}
