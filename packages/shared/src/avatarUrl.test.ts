import { describe, expect, it } from 'vitest';
import { isTrustedSupabaseAvatarUrl } from './avatarUrl';

const ORIGIN = 'https://abcdxyz.supabase.co';
const USER = '11111111-1111-4111-8111-111111111111';
const owned = `${ORIGIN}/storage/v1/object/public/avatars/${USER}/avatar.jpg`;

describe('isTrustedSupabaseAvatarUrl', () => {
  it('accepts the caller\'s avatars object, including a cache-buster query', () => {
    expect(isTrustedSupabaseAvatarUrl(owned, ORIGIN, USER)).toBe(true);
    expect(isTrustedSupabaseAvatarUrl(`${owned}?v=1710000000000`, ORIGIN, USER)).toBe(true);
  });

  it('rejects another host, bucket, user, or scheme', () => {
    expect(isTrustedSupabaseAvatarUrl(owned.replace(ORIGIN, 'https://evil.example'), ORIGIN, USER)).toBe(false);
    expect(isTrustedSupabaseAvatarUrl(owned.replace('/avatars/', '/other/'), ORIGIN, USER)).toBe(false);
    expect(
      isTrustedSupabaseAvatarUrl(
        owned.replace(USER, '22222222-2222-4222-8222-222222222222'),
        ORIGIN,
        USER,
      ),
    ).toBe(false);
    expect(isTrustedSupabaseAvatarUrl(owned.replace('https://', 'http://'), ORIGIN, USER)).toBe(false);
  });

  it('rejects credentials, hashes, and path tricks', () => {
    expect(isTrustedSupabaseAvatarUrl(`https://user:pass@abcdxyz.supabase.co/storage/v1/object/public/avatars/${USER}/avatar.jpg`, ORIGIN, USER)).toBe(false);
    expect(isTrustedSupabaseAvatarUrl(`${owned}#x`, ORIGIN, USER)).toBe(false);
    expect(isTrustedSupabaseAvatarUrl(`${ORIGIN}/storage/v1/object/public/avatars/${USER}/../avatar.jpg`, ORIGIN, USER)).toBe(false);
    expect(isTrustedSupabaseAvatarUrl('javascript:alert(1)', ORIGIN, USER)).toBe(false);
  });

  it('allows any avatars object on this project when no owner is required', () => {
    const other = owned.replace(USER, '22222222-2222-4222-8222-222222222222');
    expect(isTrustedSupabaseAvatarUrl(other, ORIGIN)).toBe(true);
    expect(isTrustedSupabaseAvatarUrl(other, ORIGIN, USER)).toBe(false);
  });
});
