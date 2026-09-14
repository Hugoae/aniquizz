import { logger } from '../utils/logger';
import { captureError } from '../utils/errorReporter';
import { env } from '../config/env';
import type { TypedSocket } from './socketTypes';
import { handshakeClientIp } from './httpClientIp';

/**
 * Handler guards for socket events: authentication + in-memory rate limiting.
 * Rate limiting is per-socket and best-effort (single-instance memory); it is a
 * spam/abuse brake, not a security boundary.
 */

/** A socket event listener with arbitrary arity (0-arg events included). */
type Listener<A extends unknown[]> = (...args: A) => unknown;

/** Socket.io never awaits listeners — settle async work and surface rejections. */
const settleListener = (result: unknown, source: string): void => {
  void Promise.resolve(result).catch((error: unknown) => {
    captureError(error, { context: 'Socket', source });
  });
};

interface RateLimitRule {
  /** Max number of calls allowed within the window. */
  points: number;
  /** Sliding window duration in milliseconds. */
  durationMs: number;
}

// Per-socket, per-key timestamps of recent calls.
const buckets = new WeakMap<TypedSocket, Map<string, number[]>>();
/** Survives socket reconnect; keyed by event + client IP. */
const ipBuckets = new Map<string, number[]>();

const pruneHits = (hits: number[], now: number, durationMs: number): number[] =>
  hits.filter((ts) => ts > now - durationMs);

const isRateLimited = (socket: TypedSocket, key: string, rule: RateLimitRule): boolean => {
  let socketBucket = buckets.get(socket);
  if (!socketBucket) {
    socketBucket = new Map();
    buckets.set(socket, socketBucket);
  }

  const now = Date.now();
  const hits = pruneHits(socketBucket.get(key) ?? [], now, rule.durationMs);

  if (hits.length >= rule.points) {
    socketBucket.set(key, hits);
    return true;
  }

  hits.push(now);
  socketBucket.set(key, hits);
  return false;
};

/** Sliding-window IP limit (reconnect does not reset). Returns true when the call should drop. */
export const consumeIpRateLimit = (ip: string, key: string, rule: RateLimitRule): boolean => {
  const mapKey = `${key}:${ip}`;
  const now = Date.now();
  const hits = pruneHits(ipBuckets.get(mapKey) ?? [], now, rule.durationMs);
  if (hits.length >= rule.points) {
    ipBuckets.set(mapKey, hits);
    return true;
  }
  hits.push(now);
  ipBuckets.set(mapKey, hits);
  return false;
};

export const resetIpRateLimitForTests = (): void => {
  ipBuckets.clear();
};

/** Wrap a handler so it only runs for authenticated sockets. */
export const requireAuth = <A extends unknown[]>(
  socket: TypedSocket,
  handler: Listener<A>,
): Listener<A> => {
  return (...args: A) => {
    const data = socket.data;
    if (!data.isAuthenticated || !data.userId) {
      socket.emit('error', { message: 'Vous devez être connecté pour effectuer cette action.' });
      return;
    }
    settleListener(handler(...args), 'requireAuth');
  };
};

/**
 * Wrap a handler with rate limiting (and authentication, since every rate-limited
 * event is also a game action). Drops calls that exceed the rule and notifies the
 * client once per breach.
 */
export const guard = <A extends unknown[]>(
  socket: TypedSocket,
  key: string,
  rule: RateLimitRule,
  handler: Listener<A>,
  options?: { byIp?: boolean },
): Listener<A> => {
  return requireAuth<A>(socket, (...args: A) => {
    if (isRateLimited(socket, key, rule)) {
      const data = socket.data;
      logger.warn(`Rate limit hit on "${key}" by ${data.username} (${data.userId})`, 'Socket');
      socket.emit('error', { message: 'Trop de requêtes, veuillez patienter un instant.' });
      return;
    }
    if (options?.byIp) {
      const ip = handshakeClientIp(socket.handshake, env.NODE_ENV);
      if (consumeIpRateLimit(ip, key, rule)) {
        const data = socket.data;
        logger.warn(`IP rate limit hit on "${key}" by ${data.username} (${data.userId})`, 'Socket');
        socket.emit('error', { message: 'Trop de requêtes, veuillez patienter un instant.' });
        return;
      }
    }
    return handler(...args);
  });
};

/**
 * Like `guard`, but silently drops rate-limited calls instead of emitting an
 * error toast. For high-frequency, low-cost read events (e.g. autocomplete)
 * where a breach should throttle, not surface a scary message to the user.
 */
export const guardSilent = <A extends unknown[]>(
  socket: TypedSocket,
  key: string,
  rule: RateLimitRule,
  handler: Listener<A>,
): Listener<A> => {
  return requireAuth<A>(socket, (...args: A) => {
    if (isRateLimited(socket, key, rule)) return;
    return handler(...args);
  });
};

/** Rate-limit rules for sensitive events. */
export const RATE_LIMITS = {
  answer: { points: 10, durationMs: 5_000 },
  chat: { points: 5, durationMs: 3_000 },
  createLobby: { points: 3, durationMs: 10_000 },
  /** Private-room password guesses + join spam. Per-socket and per-IP (reconnect does not reset IP). */
  joinLobby: { points: 8, durationMs: 60_000 },
  friends: { points: 15, durationMs: 10_000 },
  /** Dedicated invite cap + per-target cooldown in the handler. */
  invite: { points: 6, durationMs: 60_000 },
  /** Autocomplete: client debounces (~10/s worst case); drop silently past this. */
  animeSearch: { points: 30, durationMs: 5_000 },
  /** Playlist/catalogue pool preview. Client debounces; drop silently past this. */
  poolStats: { points: 20, durationMs: 10_000 },
  /** Full catalogue fetch: once per session; allow a few retries on reconnect. */
  animeCatalogue: { points: 8, durationMs: 10_000 },
  /** Player comfort prefs: client debounces (~700 ms); cap slider spam. */
  updatePrefs: { points: 12, durationMs: 10_000 },
  /** Privacy audiences: infrequent, still capped. */
  updatePrivacy: { points: 8, durationMs: 10_000 },
  /** Manual list sync is expensive (AniList/MAL); keep it tight. */
  listsMutate: { points: 8, durationMs: 60_000 },
  listsRefresh: { points: 3, durationMs: 60_000 },
  /** Start-game clicks; status==='starting' still dedupes double-submit. */
  startGame: { points: 5, durationMs: 10_000 },
  /** Pause / skip / skip-round votes. Same order of magnitude as chat. */
  vote: { points: 8, durationMs: 5_000 },
  /** Account deletion: strict cap to slow abuse / accidental double-submit. */
  deleteAccount: { points: 3, durationMs: 60 * 60_000 },
} as const;
