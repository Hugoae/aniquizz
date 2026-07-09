let gameHubPrefetched = false;

/** Warm the `/play` chunk on intent (hover/focus) so navigation feels instant. */
export function prefetchGameHub(): void {
  if (gameHubPrefetched) return;
  gameHubPrefetched = true;
  void import('@/pages/GameHub');
}

/** Warm the in-game chunk when the hub is visible (likely next step). */
export function prefetchGame(): void {
  void import('@/pages/Game');
}
