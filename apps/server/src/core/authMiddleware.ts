import jwt from 'jsonwebtoken';
import { prisma } from '@aniquizz/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { supabaseAdmin } from '../lib/supabase';
import { levelFromXp, type SocketData, type UserRole } from '@aniquizz/shared';
import type { TypedSocket } from './socketTypes';

/**
 * Canonical, verified identity attached to every socket.
 * `userId` is the Supabase auth user id — the ONLY trusted identity.
 * Never trust `socket.handshake.auth.userId` sent by the client.
 */
export type AuthenticatedSocketData = SocketData;

interface SupabaseJwtPayload extends jwt.JwtPayload {
  sub?: string;
  user_metadata?: { username?: string; user_name?: string; name?: string };
}

export interface ResolvedIdentity {
  userId: string;
  username: string;
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
 * Verify a Supabase access token and derive a trusted identity.
 *
 * Primary path: supabase.auth.getUser(token) — handles RS256 (JWT Signing Keys)
 * and legacy HS256 transparently. Fallback: local HS256 verify.
 * Returns null when the token is present but invalid.
 */
export const resolveIdentityFromToken = async (
  token: string,
  fallbackName = 'Anonyme',
): Promise<ResolvedIdentity | null> => {
  const { data: authData, error } = await supabaseAdmin.auth.getUser(token);
  if (!error && authData.user) {
    return {
      userId: authData.user.id,
      username: usernameFromMetadata(authData.user.user_metadata, fallbackName),
    };
  }

  const legacy = verifyLegacyHs256(token);
  if (legacy?.sub) {
    return {
      userId: legacy.sub,
      username: usernameFromMetadata(legacy.user_metadata, fallbackName),
    };
  }

  return null;
};

/** DB-resolved moderation state for an authenticated user. */
interface ModerationState {
  role: UserRole;
  bannedUntil: Date | null;
  mutedUntil: Date | null;
  level: number;
  anilistUsername: string | null;
}

const loadModeration = async (userId: string): Promise<ModerationState | null> => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true, bannedUntil: true, mutedUntil: true, xp: true, anilistUsername: true },
    });
    if (!profile) return null;
    return {
      role: profile.role as UserRole,
      bannedUntil: profile.bannedUntil,
      mutedUntil: profile.mutedUntil,
      level: levelFromXp(profile.xp),
      anilistUsername: profile.anilistUsername,
    };
  } catch (e) {
    logger.error('Failed to load moderation state', 'Socket', e);
    return null;
  }
};

/**
 * Socket.io connection middleware: verifies the Supabase access token from the
 * handshake and derives a trusted identity + role + moderation state.
 *
 * No token → guest (read-only). Present-but-invalid token → rejected.
 * Banned user → rejected.
 */
export const socketAuthMiddleware = async (
  socket: TypedSocket,
  next: (err?: Error) => void,
): Promise<void> => {
  const token = socket.handshake.auth?.token as string | undefined;
  const displayName =
    (socket.handshake.auth?.username as string | undefined)?.trim() || 'Anonyme';

  const data = socket.data;
  data.username = displayName;
  data.userId = null;
  data.isAuthenticated = false;
  data.role = null;
  data.mutedUntil = null;
  data.level = null;
  data.anilistUsername = null;

  if (!token) {
    return next();
  }

  const identity = await resolveIdentityFromToken(token, displayName);
  if (!identity) {
    logger.warn('Rejected socket with invalid token', 'Socket');
    return next(new Error('INVALID_TOKEN'));
  }

  data.userId = identity.userId;
  data.isAuthenticated = true;
  data.username = identity.username;

  const moderation = await loadModeration(identity.userId);
  const now = Date.now();

  if (moderation?.bannedUntil && moderation.bannedUntil.getTime() > now) {
    logger.warn(`Rejected banned user ${identity.userId}`, 'Socket');
    return next(new Error('BANNED'));
  }

  data.role = moderation?.role ?? 'USER';
  data.level = moderation?.level ?? 1;
  data.anilistUsername = moderation?.anilistUsername ?? null;
  data.mutedUntil =
    moderation?.mutedUntil && moderation.mutedUntil.getTime() > now
      ? moderation.mutedUntil.toISOString()
      : null;

  return next();
};
