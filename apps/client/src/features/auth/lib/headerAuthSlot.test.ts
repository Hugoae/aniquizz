import { describe, expect, it } from 'vitest';
import { headerAuthSlot, sessionDisplayName } from './headerAuthSlot';

describe('headerAuthSlot', () => {
  it('keeps the skeleton until session resolution finishes', () => {
    expect(
      headerAuthSlot({
        authReady: false,
        hasUser: false,
        hasProfile: false,
        profileFailed: false,
      }),
    ).toBe('loading');
  });

  it('shows sign-in when there is no session', () => {
    expect(
      headerAuthSlot({
        authReady: true,
        hasUser: false,
        hasProfile: false,
        profileFailed: false,
      }),
    ).toBe('sign-in');
  });

  it('shows the profile chip when the Profile row loaded', () => {
    expect(
      headerAuthSlot({
        authReady: true,
        hasUser: true,
        hasProfile: true,
        profileFailed: false,
      }),
    ).toBe('profile');
  });

  it('does not stick on loading after Profile SELECT fails', () => {
    expect(
      headerAuthSlot({
        authReady: true,
        hasUser: true,
        hasProfile: false,
        profileFailed: true,
      }),
    ).toBe('degraded');
  });

  it('keeps the profile chip if a later refresh fails', () => {
    expect(
      headerAuthSlot({
        authReady: true,
        hasUser: true,
        hasProfile: true,
        profileFailed: true,
      }),
    ).toBe('profile');
  });

  it('stays on loading while the first Profile SELECT is in flight', () => {
    expect(
      headerAuthSlot({
        authReady: true,
        hasUser: true,
        hasProfile: false,
        profileFailed: false,
      }),
    ).toBe('loading');
  });
});

describe('sessionDisplayName', () => {
  it('prefers user_metadata.username over the email local-part', () => {
    expect(
      sessionDisplayName({
        email: 'ada@example.com',
        user_metadata: { username: 'Ada' },
      }),
    ).toBe('Ada');
  });

  it('falls back to the email local-part then Joueur', () => {
    expect(sessionDisplayName({ email: 'ada@example.com', user_metadata: {} })).toBe('ada');
    expect(sessionDisplayName(null)).toBe('Joueur');
  });
});
