import { describe, expect, it } from 'vitest';
import { normalizeAnilistUsername, normalizeMalUsername } from './watchlistUsername';

describe('normalizeMalUsername', () => {
  it('trims, strips @, and drops zero-width paste junk', () => {
    expect(normalizeMalUsername('  @Hugo_ae\u200b  ')).toBe('Hugo_ae');
  });

  it('extracts the handle from profile and animelist URLs', () => {
    expect(normalizeMalUsername('https://myanimelist.net/profile/Hugo_ae')).toBe('Hugo_ae');
    expect(normalizeMalUsername('myanimelist.net/animelist/Hugo_ae?status=7')).toBe('Hugo_ae');
  });

  it('returns null for empty input', () => {
    expect(normalizeMalUsername('   ')).toBeNull();
  });
});

describe('normalizeAnilistUsername', () => {
  it('extracts the handle from an AniList profile URL', () => {
    expect(normalizeAnilistUsername('https://anilist.co/user/Kirikou/animelist')).toBe('Kirikou');
  });

  it('keeps a plain username', () => {
    expect(normalizeAnilistUsername('Kirikou')).toBe('Kirikou');
  });
});
