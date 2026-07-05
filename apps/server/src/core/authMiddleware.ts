import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { supabaseAdmin } from '../lib/supabase';

/**
 * Canonical, verified identity attached to every socket.
 * `userId` is the Supabase auth user id — the ONLY trusted identity.
 * Never trust `socket.handshake.auth.userId` sent by the client.
 */
export interface AuthenticatedSocketData {
  userId: string | null;
  username: string;
  isAuthenticated: boolean;
}

interface SupabaseJwtPayload extends jwt.JwtPayload {
  sub?: string;
  user_metadata?: { username?: string; user_name?: string; name?: string };
}

/** Extract a display name from Supabase user metadata (display only, not auth). */
const usernameFromMetadata = (
  metadata: Record<string, unknown> | undefined,
  fallback: string,
): string => {
  if (!metadata) return fallback;
  const name =
    (metadata.username as string | undefined) ||
    (metadata.user_name as string | undefined) ||
    (metadata.name as string | undefined);
  return name?.trim() || fallback;
};

/** Legacy fallback for projects still issuing HS256 tokens signed with the JWT secret. */
const verifyLegacyHs256 = (token: string): SupabaseJwtPayload | null => {
  if (!env.SUPABASE_JWT_SECRET) return null;
  try {
    return jwt.verify(token, env.SUPABASE_JWT_SECRET, {
      algorithms: ['HS256'],
    }) as SupabaseJwtPayload;
  } catch {
    return null;
  }
};

/**
 * Socket.io connection middleware: verifies the Supabase access token from the
 * handshake and derives a trusted identity.
 *
 * Primary path: supabase.auth.getUser(token) — handles RS256 (JWT Signing Keys)
 * and legacy HS256 transparently.
 * Fallback: local HS256 verify when SUPABASE_JWT_SECRET is set.
 *
 * No token → guest (read-only). Present-but-invalid token → rejected.
 */
export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> => {
  const token = socket.handshake.auth?.token as string | undefined;
  const displayName =
    (socket.handshake.auth?.username as string | undefined)?.trim() || 'Anonyme';

  const data = socket.data as AuthenticatedSocketData;
  data.username = displayName;
  data.userId = null;
  data.isAuthenticated = false;

  if (!token) {
    return next();
  }

  // Primary: Supabase Auth API (works with RS256 signing keys).
  const { data: authData, error } = await supabaseAdmin.auth.getUser(token);

  if (!error && authData.user) {
    data.userId = authData.user.id;
    data.isAuthenticated = true;
    data.username = usernameFromMetadata(authData.user.user_metadata, displayName);
    return next();
  }

  // Fallback: legacy HS256 local verify (older projects / dev).
  const legacy = verifyLegacyHs256(token);
  if (legacy?.sub) {
    data.userId = legacy.sub;
    data.isAuthenticated = true;
    data.username = usernameFromMetadata(legacy.user_metadata, displayName);
    return next();
  }

  const reason = error?.message ?? 'verification failed';
  logger.warn(`Rejected socket with invalid token (${reason})`, 'Socket');
  return next(new Error('INVALID_TOKEN'));
};
