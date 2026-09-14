import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/** Wide enough for pause, reconnect, and a long daily attempt. Re-signed on sync. */
export const MEDIA_PLAYBACK_TTL_MS = 2 * 60 * 60 * 1000;

const IV_BYTES = 12;
const TAG_BYTES = 16;

export type MediaPlaybackVerifyResult =
  { ok: true; videoKey: string } | { ok: false; reason: 'invalid' | 'expired' };

interface PlaybackPayload {
  v: string;
  e: number;
}

function aesKey(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

function isPlaybackPayload(value: unknown): value is PlaybackPayload {
  if (value === null || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.v === 'string' && typeof record.e === 'number';
}

/**
 * AES-256-GCM token for `{MEDIA_PLAYBACK_URL}/v/{token}`.
 * Not re-exported from the package barrel — the SPA must never import this.
 */
export function signMediaPlaybackToken(
  videoKey: string,
  secret: string,
  ttlMs: number = MEDIA_PLAYBACK_TTL_MS,
  nowMs: number = Date.now(),
): string {
  if (!videoKey) throw new Error('videoKey is required to sign a playback token');
  if (!secret) throw new Error('secret is required to sign a playback token');
  const payload: PlaybackPayload = { v: videoKey, e: nowMs + ttlMs };
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', aesKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString('base64url');
}

export function verifyMediaPlaybackToken(
  token: string,
  secret: string,
  nowMs: number = Date.now(),
): MediaPlaybackVerifyResult {
  if (!token || !secret) return { ok: false, reason: 'invalid' };
  try {
    const buf = Buffer.from(token, 'base64url');
    if (buf.length < IV_BYTES + TAG_BYTES + 1) return { ok: false, reason: 'invalid' };
    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(buf.length - TAG_BYTES);
    const encrypted = buf.subarray(IV_BYTES, buf.length - TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', aesKey(secret), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const parsed: unknown = JSON.parse(json);
    if (!isPlaybackPayload(parsed) || parsed.v.length === 0) {
      return { ok: false, reason: 'invalid' };
    }
    if (parsed.e <= nowMs) return { ok: false, reason: 'expired' };
    return { ok: true, videoKey: parsed.v };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

export function buildMediaPlaybackUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/v/${token}`;
}

/** Pathname of `{origin}/v/{token}` — null when the route does not match. */
export function parseMediaPlaybackTokenFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/v\/([A-Za-z0-9_-]+)$/);
  return match?.[1] ?? null;
}
