import { describe, expect, it } from 'vitest';
import {
  MEDIA_PLAYBACK_TTL_MS,
  buildMediaPlaybackUrl,
  parseMediaPlaybackTokenFromPath,
  signMediaPlaybackToken,
  verifyMediaPlaybackToken,
} from './mediaPlayback';

const SECRET = 'unit-test-media-playback-secret';
const OTHER_SECRET = 'other-media-playback-secret!!';
const VIDEO_KEY = 'DEATHNOTE-1535-OP2.mp4';
const NOW = 1_700_000_000_000;

describe('mediaPlayback tokens', () => {
  it('round-trips a video key without putting the filename in the token', () => {
    const token = signMediaPlaybackToken(VIDEO_KEY, SECRET, MEDIA_PLAYBACK_TTL_MS, NOW);
    expect(token).not.toContain('DEATHNOTE');
    expect(token).not.toContain('OP2');
    expect(token).not.toMatch(/\.mp4/i);
    expect(verifyMediaPlaybackToken(token, SECRET, NOW)).toEqual({
      ok: true,
      videoKey: VIDEO_KEY,
    });
  });

  it('rejects an expired token', () => {
    const token = signMediaPlaybackToken(VIDEO_KEY, SECRET, 1_000, NOW);
    expect(verifyMediaPlaybackToken(token, SECRET, NOW + 1_001)).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('rejects a tampered token', () => {
    const token = signMediaPlaybackToken(VIDEO_KEY, SECRET, MEDIA_PLAYBACK_TTL_MS, NOW);
    const flipped = `${token.slice(0, -2)}${token.endsWith('a') ? 'b' : 'a'}`;
    expect(verifyMediaPlaybackToken(flipped, SECRET, NOW)).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects a token signed with a different secret', () => {
    const token = signMediaPlaybackToken(VIDEO_KEY, SECRET, MEDIA_PLAYBACK_TTL_MS, NOW);
    expect(verifyMediaPlaybackToken(token, OTHER_SECRET, NOW)).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects empty or garbage input', () => {
    expect(verifyMediaPlaybackToken('', SECRET, NOW)).toEqual({ ok: false, reason: 'invalid' });
    expect(verifyMediaPlaybackToken('not-a-token', SECRET, NOW)).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(() => signMediaPlaybackToken('', SECRET)).toThrow(/videoKey/i);
    expect(() => signMediaPlaybackToken(VIDEO_KEY, '')).toThrow(/secret/i);
  });

  it('builds and parses the /v/{token} URL path', () => {
    const token = signMediaPlaybackToken(VIDEO_KEY, SECRET, MEDIA_PLAYBACK_TTL_MS, NOW);
    const url = buildMediaPlaybackUrl('https://media.example/', token);
    expect(url).toBe(`https://media.example/v/${token}`);
    expect(url).not.toContain(VIDEO_KEY);
    expect(parseMediaPlaybackTokenFromPath(new URL(url).pathname)).toBe(token);
    expect(parseMediaPlaybackTokenFromPath('/v/')).toBeNull();
    expect(parseMediaPlaybackTokenFromPath('/health')).toBeNull();
  });
});
