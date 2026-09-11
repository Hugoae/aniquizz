/** Password re-entry must have happened this recently before account deletion. */
export const DELETE_ACCOUNT_REAUTH_WINDOW_MS = 10 * 60_000;

/** True when `last_sign_in_at` is within the deletion re-auth window. */
export function isFreshReauth(lastSignInAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastSignInAt) return false;
  const ts = Date.parse(lastSignInAt);
  if (Number.isNaN(ts)) return false;
  return now - ts <= DELETE_ACCOUNT_REAUTH_WINDOW_MS;
}
