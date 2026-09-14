/** Prevents a slower Profile SELECT from applying onto a newer session. */
export function createProfileFetchGate() {
  let generation = 0;
  let inFlightUserId: string | null = null;

  return {
    begin(userId: string): { generation: number; skipped: boolean } {
      if (inFlightUserId === userId) {
        return { generation, skipped: true };
      }
      inFlightUserId = userId;
      generation += 1;
      return { generation, skipped: false };
    },
    isCurrent(started: number): boolean {
      return started === generation;
    },
    finish(started: number): void {
      if (started === generation) {
        inFlightUserId = null;
      }
    },
    /** Logout / user-id change: in-flight rows must not call setProfile. */
    invalidate(): void {
      generation += 1;
      inFlightUserId = null;
    },
  };
}
