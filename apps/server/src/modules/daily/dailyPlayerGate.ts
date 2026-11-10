const tails = new Map<string, Promise<void>>();

/**
 * One daily mutation at a time per player. Socket play and the HTTP fallback
 * (tab-close forfeit, landing) share this queue so two clicks cannot grade
 * the same round.
 */
export function runDailyPlayer<T>(profileId: string, task: () => Promise<T>): Promise<T> {
  const previous = tails.get(profileId) ?? Promise.resolve();
  const run = previous.then(task);
  const settled = run.then(
    () => undefined,
    () => undefined,
  );
  tails.set(profileId, settled);
  void settled.finally(() => {
    if (tails.get(profileId) === settled) tails.delete(profileId);
  });
  return run;
}
