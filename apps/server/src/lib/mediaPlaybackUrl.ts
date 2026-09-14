import {
  MEDIA_PLAYBACK_TTL_MS,
  buildMediaPlaybackUrl,
  signMediaPlaybackToken,
} from '@aniquizz/shared/mediaPlayback';
import { env } from '../config/env';

export interface PlaybackUrlConfig {
  baseUrl?: string;
  secret?: string;
}

/**
 * Client-facing clip locator. Production wraps the R2 key in a Worker URL so
 * Network/socket payloads never show `Anime-id-OPx.mp4`. Locally, missing env
 * keeps the raw key (public R2).
 *
 * Pass `config` to pin values (tests). An explicit empty config does not fall
 * back to process env.
 */
export function toPlaybackUrl(videoKey: string, config?: PlaybackUrlConfig): string {
  const baseUrl = config ? config.baseUrl : env.MEDIA_PLAYBACK_URL;
  const secret = config ? config.secret : env.MEDIA_PLAYBACK_SECRET;
  if (!baseUrl || !secret) return videoKey;
  const token = signMediaPlaybackToken(videoKey, secret, MEDIA_PLAYBACK_TTL_MS);
  return buildMediaPlaybackUrl(baseUrl, token);
}
