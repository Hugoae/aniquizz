import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Canonical, verified identity attached to every socket.
 * `userId` is the Supabase auth user id (JWT `sub`) — the ONLY trusted identity.
 * Never trust `socket.handshake.auth.userId` sent by the client.
 */
export interface AuthenticatedSocketData {
  userId: string | null;
  username: string;
  isAuthenticated: boolean;
}

interface SupabaseJwtPayload extends jwt.JwtPayload {
  sub?: string;
  email?: string;
  user_metadata?: { username?: string; user_name?: string; name?: string };
}

/**
 * Socket.io connection middleware: verifies the Supabase access token from the
 * handshake and derives a trusted identity. Connection is still allowed without
 * a valid token (guests can browse), but `isAuthenticated` gates game actions.
 * A token that is present but invalid is rejected outright (likely tampering).
 */
export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
): void => {
  const token = socket.handshake.auth?.token as string | undefined;
  const displayName =
    (socket.handshake.auth?.username as string | undefined)?.trim() || 'Anonyme';

  const data = socket.data as AuthenticatedSocketData;
  data.username = displayName;
  data.userId = null;
  data.isAuthenticated = false;

  if (!token) {
    // No token → guest connection (read-only browsing). Game actions are gated.
    return next();
  }

  try {
    const payload = jwt.verify(token, env.SUPABASE_JWT_SECRET, {
      algorithms: ['HS256'],
    }) as SupabaseJwtPayload;

    if (!payload.sub) {
      logger.warn('Token verified but missing `sub` claim', 'Socket');
      return next(new Error('INVALID_TOKEN'));
    }

    data.userId = payload.sub;
    data.isAuthenticated = true;
    data.username =
      payload.user_metadata?.username ||
      payload.user_metadata?.user_name ||
      payload.user_metadata?.name ||
      displayName;

    return next();
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown';
    logger.warn(`Rejected socket with invalid token (${reason})`, 'Socket');
    return next(new Error('INVALID_TOKEN'));
  }
};
