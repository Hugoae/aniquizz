import { describe, expect, it } from 'vitest';
import { verifyMediaPlaybackToken } from '@aniquizz/shared/mediaPlayback';
import { toPlaybackUrl } from './mediaPlaybackUrl';

const SECRET = 'server-unit-media-playback-secret';
const BASE = 'https://media.example';
const VIDEO_KEY = 'DEATHNOTE-1535-OP2.mp4';

describe('toPlaybackUrl', () => {
  it('returns the raw R2 key when playback is not configured', () => {
    expect(toPlaybackUrl(VIDEO_KEY, {})).toBe(VIDEO_KEY);
  });

  it('emits a Worker /v/ URL that does not contain the filename', () => {
    const url = toPlaybackUrl(VIDEO_KEY, { baseUrl: BASE, secret: SECRET });
    expect(url.startsWith(`${BASE}/v/`)).toBe(true);
    expect(url).not.toContain('DEATHNOTE');
    expect(url).not.toContain('OP2.mp4');
    const token = url.slice(`${BASE}/v/`.length);
    expect(verifyMediaPlaybackToken(token, SECRET)).toEqual({ ok: true, videoKey: VIDEO_KEY });
  });
});
