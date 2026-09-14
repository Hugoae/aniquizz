import { describe, expect, it } from 'vitest';
import { resolveResetPasswordAccess, urlLooksLikeRecovery } from './resetPasswordAccess';

describe('urlLooksLikeRecovery', () => {
  it('detects hash type=recovery and PKCE code', () => {
    expect(urlLooksLikeRecovery('#type=recovery&access_token=x', '')).toBe(true);
    expect(urlLooksLikeRecovery('', '?code=pkce-code')).toBe(true);
    expect(urlLooksLikeRecovery('', '')).toBe(false);
  });
});

describe('resolveResetPasswordAccess', () => {
  it('opens the form only for a recovery signal plus a session', () => {
    expect(
      resolveResetPasswordAccess({
        recoveryEventSeen: true,
        hasSession: true,
        urlLooksLikeRecovery: false,
      }),
    ).toBe('form');
    expect(
      resolveResetPasswordAccess({
        recoveryEventSeen: false,
        hasSession: true,
        urlLooksLikeRecovery: true,
      }),
    ).toBe('form');
  });

  it('does not treat a normal signed-in visit as recovery', () => {
    expect(
      resolveResetPasswordAccess({
        recoveryEventSeen: false,
        hasSession: true,
        urlLooksLikeRecovery: false,
      }),
    ).toBe('already-signed-in');
  });

  it('shows invalid when there is no session', () => {
    expect(
      resolveResetPasswordAccess({
        recoveryEventSeen: false,
        hasSession: false,
        urlLooksLikeRecovery: false,
      }),
    ).toBe('invalid');
  });
});
