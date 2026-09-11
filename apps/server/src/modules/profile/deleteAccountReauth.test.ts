import { describe, expect, it } from 'vitest';
import { DELETE_ACCOUNT_REAUTH_WINDOW_MS, isFreshReauth } from './deleteAccountReauth';

describe('isFreshReauth', () => {
  const now = Date.parse('2026-09-10T18:00:00.000Z');

  it('accepts a sign-in inside the window', () => {
    expect(isFreshReauth(new Date(now - 60_000).toISOString(), now)).toBe(true);
  });

  it('rejects a stale sign-in', () => {
    expect(
      isFreshReauth(new Date(now - DELETE_ACCOUNT_REAUTH_WINDOW_MS - 1).toISOString(), now),
    ).toBe(false);
  });

  it('rejects missing or invalid timestamps', () => {
    expect(isFreshReauth(null, now)).toBe(false);
    expect(isFreshReauth(undefined, now)).toBe(false);
    expect(isFreshReauth('not-a-date', now)).toBe(false);
  });
});
