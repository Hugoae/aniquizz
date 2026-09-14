import { isFullObjectRange, parseHttpByteRange } from '../../../packages/shared/src/httpByteRange';
import {
  parseMediaPlaybackTokenFromPath,
  verifyMediaPlaybackToken,
} from '../../../packages/shared/src/mediaPlayback';

const ALLOW_METHODS = 'GET, HEAD, OPTIONS';
const ALLOW_HEADERS = 'Range, If-Range, If-None-Match, If-Modified-Since';
const EXPOSE_HEADERS = 'Accept-Ranges, Content-Length, Content-Range, ETag, Last-Modified';

function allowedOrigins(env: Env): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers();
  const origin = request.headers.get('Origin');
  const allowed = allowedOrigins(env);
  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  headers.set('Access-Control-Allow-Methods', ALLOW_METHODS);
  headers.set('Access-Control-Allow-Headers', ALLOW_HEADERS);
  headers.set('Access-Control-Expose-Headers', EXPOSE_HEADERS);
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}

function jsonStatus(status: number, request: Request, env: Env): Response {
  const headers = corsHeaders(request, env);
  headers.set('Cache-Control', 'no-store');
  return new Response(null, { status, headers });
}

/**
 * writeHttpMetadata copies the uploaded Content-Length (full object). Browsers
 * send `Range: bytes=0-1` probes; a 206 whose Content-Length is still the full
 * file size never reaches HAVE_METADATA — no picture, no sound.
 */
function playbackHeaders(
  object: R2Object,
  request: Request,
  env: Env,
  fullSize: number,
  partial: { offset: number; length: number } | null,
): Headers {
  const headers = corsHeaders(request, env);
  object.writeHttpMetadata(headers);
  headers.delete('Content-Disposition');
  headers.delete('Content-Range');
  headers.set('Content-Type', 'video/mp4');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'private, max-age=300');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  if (partial) {
    const end = partial.offset + partial.length - 1;
    headers.set('Content-Range', `bytes ${partial.offset}-${end}/${fullSize}`);
    headers.set('Content-Length', String(partial.length));
  } else {
    headers.set('Content-Length', String(fullSize));
  }
  return headers;
}

function logStatus(status: number): void {
  console.log(JSON.stringify({ event: 'media_playback', status }));
}

async function playbackResponse(request: Request, env: Env): Promise<Response> {
  if (!env.MEDIA_PLAYBACK_SECRET) {
    logStatus(500);
    return jsonStatus(500, request, env);
  }

  const token = parseMediaPlaybackTokenFromPath(new URL(request.url).pathname);
  if (!token) {
    logStatus(404);
    return jsonStatus(404, request, env);
  }

  const verified = verifyMediaPlaybackToken(token, env.MEDIA_PLAYBACK_SECRET);
  if (!verified.ok) {
    const status = verified.reason === 'expired' ? 410 : 404;
    logStatus(status);
    return jsonStatus(status, request, env);
  }

  const meta = await env.MEDIA.head(verified.videoKey);
  if (meta === null) {
    logStatus(404);
    return jsonStatus(404, request, env);
  }

  const range = parseHttpByteRange(request.headers.get('Range'), meta.size);
  const partial = range && !isFullObjectRange(range, meta.size) ? range : null;

  if (request.method === 'HEAD') {
    logStatus(200);
    return new Response(null, {
      status: 200,
      headers: playbackHeaders(meta, request, env, meta.size, null),
    });
  }

  const object = await env.MEDIA.get(
    verified.videoKey,
    partial ? { range: { offset: partial.offset, length: partial.length } } : undefined,
  );

  if (object === null) {
    logStatus(404);
    return jsonStatus(404, request, env);
  }

  if (!('body' in object) || object.body == null) {
    logStatus(412);
    return new Response(null, {
      status: 412,
      headers: playbackHeaders(object, request, env, meta.size, partial),
    });
  }

  const status = partial ? 206 : 200;
  logStatus(status);
  return new Response(object.body, {
    status,
    headers: playbackHeaders(object, request, env, meta.size, partial),
  });
}

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const headers = corsHeaders(request, env);
      headers.set('Allow', ALLOW_METHODS);
      return new Response(null, { status: 405, headers });
    }
    return playbackResponse(request, env);
  },
} satisfies ExportedHandler<Env>;
