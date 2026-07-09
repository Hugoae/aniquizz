// Warm lazy route chunks before the user navigates so React never has to show a
// Suspense fallback on click — the chunk is already in memory. Prefetch is
// triggered on intent (hover/focus/pointer-down) and, for the most likely next
// routes, when the browser is idle.

const importers = {
  play: () => import('@/pages/GameHub'),
  game: () => import('@/pages/Game'),
  profile: () => import('@/pages/Profile'),
  admin: () => import('@/pages/Admin'),
} as const;

type RouteKey = keyof typeof importers;

const prefetched = new Set<RouteKey>();

/** Warm a single route chunk once. Safe to call repeatedly (hover/focus/click). */
export function prefetchRoute(key: RouteKey): void {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  // If the import fails (e.g. offline), allow a later retry.
  void importers[key]().catch(() => prefetched.delete(key));
}

/** Warm the `/play` chunk on intent (hover/focus) so navigation feels instant. */
export function prefetchGameHub(): void {
  prefetchRoute('play');
}

/** Warm the in-game chunk when the hub is visible (likely next step). */
export function prefetchGame(): void {
  prefetchRoute('game');
}

/**
 * Warm the routes a user is most likely to open next when the browser is idle.
 * Runs after first paint so it never competes with the initial route render.
 */
export function warmLikelyRoutes(includeAuthedRoutes: boolean): void {
  const warm = () => {
    prefetchRoute('play');
    if (includeAuthedRoutes) prefetchRoute('profile');
  };

  const ric = (window as unknown as { requestIdleCallback?: typeof requestIdleCallback })
    .requestIdleCallback;
  if (typeof ric === 'function') {
    ric(warm, { timeout: 3000 });
  } else {
    window.setTimeout(warm, 1500);
  }
}
