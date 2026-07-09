import { logger } from '../utils/logger';
import type { TypedSocket } from './socketTypes';

/**
 * Handler guards for socket events: authentication + in-memory rate limiting.
 * Rate limiting is per-socket and best-effort (single-instance memory); it is a
 * spam/abuse brake, not a security boundary.
 */

/** A socket event listener with arbitrary arity (0-arg events included). */
type Listener<A extends unknown[]> = (...args: A) => void;

interface RateLimitRule {
  /** Max number of calls allowed within the window. */
  points: number;
  /** Sliding window duration in milliseconds. */
  durationMs: number;
}

// Per-socket, per-key timestamps of recent calls.
const buckets = new WeakMap<TypedSocket, Map<string, number[]>>();

const isRateLimited = (socket: TypedSocket, key: string, rule: RateLimitRule): boolean => {
  let socketBucket = buckets.get(socket);
  if (!socketBucket) {
    socketBucket = new Map();
    buckets.set(socket, socketBucket);
  }

  const now = Date.now();
  const windowStart = now - rule.durationMs;
  const hits = (socketBucket.get(key) ?? []).filter((ts) => ts > windowStart);

  if (hits.length >= rule.points) {
    socketBucket.set(key, hits);
    return true;
  }

  hits.push(now);
  socketBucket.set(key, hits);
  return false;
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
    handler(...args);
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
): Listener<A> => {
  return requireAuth<A>(socket, (...args: A) => {
    if (isRateLimited(socket, key, rule)) {
      const data = socket.data;
      logger.warn(`Rate limit hit on "${key}" by ${data.username} (${data.userId})`, 'Socket');
      socket.emit('error', { message: 'Trop de requêtes, veuillez patienter un instant.' });
      return;
    }
    handler(...args);
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
    handler(...args);
  });
};

/** Rate-limit rules for sensitive events. */
export const RATE_LIMITS = {
  answer: { points: 10, durationMs: 5_000 },
  chat: { points: 5, durationMs: 3_000 },
  createLobby: { points: 3, durationMs: 10_000 },
  friends: { points: 15, durationMs: 10_000 },
  /** Autocomplete: client debounces (~10/s worst case); drop silently past this. */
  animeSearch: { points: 30, durationMs: 5_000 },
} as const;
