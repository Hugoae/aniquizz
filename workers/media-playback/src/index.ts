import {
  parseMediaPlaybackTokenFromPath,
  verifyMediaPlaybackToken,
} from '../../../packages/shared/src/mediaPlayback';

const ALLOW_METHODS = 'GET, HEAD, OPTIONS';
const ALLOW_HEADERS = 'Range, If-Range, If-None-Match, If-Modified-Since';
const EXPOSE_HEADERS = 'Accept-Ranges, Content-Length, Content-Range, ETag, Last-Modified';
const CONDITIONAL_HEADERS = [
  'if-match',
  'if-none-match',
  'if-modified-since',
  'if-unmodified-since',
] as const;

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

function applyContentRange(headers: Headers, object: R2Object): void {
  const range = object.range;
  if (!range) return;
  const size = object.size;
  let start: number;
  let end: number;
  if ('suffix' in range) {
    start = Math.max(0, size - range.suffix);
    end = size - 1;
  } else {
    start = range.offset ?? 0;
    const length = range.length ?? size - start;
    end = start + length - 1;
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
}

function objectHeaders(object: R2Object, request: Request, env: Env): Headers {
  const headers = corsHeaders(request, env);
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Type', 'video/mp4');
  headers.delete('Content-Disposition');
  applyContentRange(headers, object);
  headers.set('Cache-Control', 'private, max-age=300');
  return headers;
}

function r2GetOptions(request: Request): R2GetOptions {
  const options: R2GetOptions = {};
  if (request.headers.has('Range')) {
    options.range = request.headers;
  }
  if (CONDITIONAL_HEADERS.some((name) => request.headers.has(name))) {
    options.onlyIf = request.headers;
  }
  return options;
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

  if (request.method === 'HEAD') {
    const object = await env.MEDIA.head(verified.videoKey);
    if (object === null) {
      logStatus(404);
      return jsonStatus(404, request, env);
    }
    return new Response(null, { status: 200, headers: objectHeaders(object, request, env) });
  }

  const object = await env.MEDIA.get(verified.videoKey, r2GetOptions(request));

  if (object === null) {
    logStatus(404);
    return jsonStatus(404, request, env);
  }

  const headers = objectHeaders(object, request, env);
  if (!('body' in object) || object.body == null) {
    return new Response(null, { status: 412, headers });
  }

  // Browsers reject 206 without Content-Range. Chrome always sends Range for <video>.
  const status = headers.has('Content-Range') ? 206 : 200;
  return new Response(object.body, { status, headers });
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
