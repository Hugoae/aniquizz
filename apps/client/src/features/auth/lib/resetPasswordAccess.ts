export type ResetPasswordAccess = 'form' | 'invalid' | 'already-signed-in';

/** True when the URL still looks like a recovery redirect (hash type or PKCE code). */
export function urlLooksLikeRecovery(hash: string, search: string): boolean {
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return hashParams.get('type') === 'recovery' || searchParams.has('code');
}

/**
 * Recovery form must not open for a normal logged-in session (that would skip the
 * current-password check). Only PASSWORD_RECOVERY or a still-visible recovery URL.
 */
export function resolveResetPasswordAccess(input: {
  recoveryEventSeen: boolean;
  hasSession: boolean;
  urlLooksLikeRecovery: boolean;
}): ResetPasswordAccess {
  if (input.recoveryEventSeen || input.urlLooksLikeRecovery) {
    return input.hasSession ? 'form' : 'invalid';
  }
  if (input.hasSession) return 'already-signed-in';
  return 'invalid';
}
