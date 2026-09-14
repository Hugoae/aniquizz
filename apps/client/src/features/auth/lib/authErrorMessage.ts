import { AUTH_COPY } from '@/features/auth/copy/authCopy';

function rawMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '';
}

/** Map Supabase Auth English errors to French. Never return the raw vendor string. */
export function mapAuthErrorMessage(err: unknown): string {
  const lower = rawMessage(err).toLowerCase();
  if (!lower) return AUTH_COPY.errors.generic;
  if (/invalid login|invalid credentials/.test(lower)) return AUTH_COPY.errors.invalidLogin;
  if (/email not confirmed|not confirmed/.test(lower)) return AUTH_COPY.errors.emailNotConfirmed;
  if (/already registered|already been registered|user already/.test(lower)) {
    return AUTH_COPY.errors.alreadyRegistered;
  }
  if (/different from the old|should be different|same.*password/.test(lower)) {
    return AUTH_COPY.errors.samePassword;
  }
  if (
    /current password|invalid.*password|incorrect.*password/.test(lower) &&
    /current/.test(lower)
  ) {
    return AUTH_COPY.errors.currentPassword;
  }
  if (/weak|at least|character|requirement|pwned|leaked/.test(lower)) {
    return AUTH_COPY.errors.weakPassword;
  }
  if (/rate limit|too many|after/.test(lower) && /request|second|hour/.test(lower)) {
    return AUTH_COPY.errors.rateLimited;
  }
  if (/unable to validate email|invalid email/.test(lower)) return AUTH_COPY.errors.invalidEmail;
  return AUTH_COPY.errors.generic;
}
