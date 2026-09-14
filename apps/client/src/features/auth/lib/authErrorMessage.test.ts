import { describe, expect, it } from 'vitest';
import { AUTH_COPY } from '@/features/auth/copy/authCopy';
import { mapAuthErrorMessage } from './authErrorMessage';

describe('mapAuthErrorMessage', () => {
  it('maps known Supabase strings to French and never returns English vendor copy', () => {
    expect(mapAuthErrorMessage(new Error('Invalid login credentials'))).toBe(
      AUTH_COPY.errors.invalidLogin,
    );
    expect(mapAuthErrorMessage(new Error('Email not confirmed'))).toBe(
      AUTH_COPY.errors.emailNotConfirmed,
    );
    expect(mapAuthErrorMessage(new Error('User already registered'))).toBe(
      AUTH_COPY.errors.alreadyRegistered,
    );
    expect(mapAuthErrorMessage(new Error('Password should be at least 8 characters'))).toBe(
      AUTH_COPY.errors.weakPassword,
    );
  });

  it('falls back to a generic French message', () => {
    expect(mapAuthErrorMessage(new Error('Something exploded in us-east-1'))).toBe(
      AUTH_COPY.errors.generic,
    );
    expect(mapAuthErrorMessage({})).toBe(AUTH_COPY.errors.generic);
  });
});
