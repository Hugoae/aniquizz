import { useEffect, useState } from 'react';

/** Interpolate a server remaining-ms snapshot while guessing is live. */
export function useTimeAttackClock(
  remainingMs: number | null,
  syncedAt: number,
  ticking: boolean,
): number | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!ticking || remainingMs == null) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [ticking, remainingMs, syncedAt]);
  if (remainingMs == null) return null;
  if (!ticking) return remainingMs;
  return Math.max(0, remainingMs - (Date.now() - syncedAt));
}
