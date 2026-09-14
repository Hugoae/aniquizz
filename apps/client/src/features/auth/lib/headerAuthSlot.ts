export type HeaderAuthSlot = 'loading' | 'profile' | 'degraded' | 'sign-in';

/**
 * Header auth chip. Session without a Profile row must not stay on the skeleton
 * forever — that hid both "Se connecter" and the profile button after a SELECT error.
 */
export function headerAuthSlot(input: {
  authReady: boolean;
  hasUser: boolean;
  hasProfile: boolean;
  profileFailed: boolean;
}): HeaderAuthSlot {
  if (!input.authReady) return 'loading';
  if (!input.hasUser) return 'sign-in';
  if (input.hasProfile) return 'profile';
  if (input.profileFailed) return 'degraded';
  return 'loading';
}

/** Fallback label when Profile SELECT failed but the JWT session is still live. */
export function sessionDisplayName(
  user:
    | {
        email?: string | null;
        user_metadata?: Record<string, unknown> | null;
      }
    | null
    | undefined,
): string {
  const meta = user?.user_metadata;
  if (meta) {
    for (const key of ['username', 'user_name', 'name'] as const) {
      const value = meta[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  const local = user?.email?.split('@')[0]?.trim();
  return local || 'Joueur';
}
