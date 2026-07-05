import { Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { AuthenticatedSocketData } from './authMiddleware';

/**
 * Handler guards for socket events: authentication + in-memory rate limiting.
 * Rate limiting is per-socket and best-effort (single-instance memory); it is a
 * spam/abuse brake, not a security boundary.
 */

type Handler<T> = (payload: T) => void;

interface RateLimitRule {
  /** Max number of calls allowed within the window. */
  points: number;
  /** Sliding window duration in milliseconds. */
  durationMs: number;
}

// Per-socket, per-key timestamps of recent calls.
const buckets = new WeakMap<Socket, Map<string, number[]>>();

const isRateLimited = (socket: Socket, key: string, rule: RateLimitRule): boolean => {
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
export const requireAuth = <T>(socket: Socket, handler: Handler<T>): Handler<T> => {
  return (payload: T) => {
    const data = socket.data as AuthenticatedSocketData;
    if (!data.isAuthenticated || !data.userId) {
      socket.emit('error', { message: 'Vous devez être connecté pour effectuer cette action.' });
      return;
    }
    handler(payload);
  };
};

/**
 * Wrap a handler with rate limiting (and authentication, since every rate-limited
 * event is also a game action). Drops calls that exceed the rule and notifies the
 * client once per breach.
 */
export const guard = <T>(
  socket: Socket,
  key: string,
  rule: RateLimitRule,
  handler: Handler<T>,
): Handler<T> => {
  return requireAuth<T>(socket, (payload: T) => {
    if (isRateLimited(socket, key, rule)) {
      const data = socket.data as AuthenticatedSocketData;
      logger.warn(`Rate limit hit on "${key}" by ${data.username} (${data.userId})`, 'Socket');
      socket.emit('error', { message: 'Trop de requêtes, veuillez patienter un instant.' });
      return;
    }
    handler(payload);
  });
};

/** Rate-limit rules for sensitive events. */
export const RATE_LIMITS = {
  answer: { points: 10, durationMs: 5_000 },
  chat: { points: 5, durationMs: 3_000 },
  createLobby: { points: 3, durationMs: 10_000 },
} as const;
