import { z } from 'zod';
import {
  GAME_CONFIG,
  isSpeedBonusEnabled,
  normalizePrecision,
  type RoomSettings,
} from '@aniquizz/shared';

/**
 * Server-side validation/normalization of client-provided room settings.
 * Unknown extra keys are stripped; every field gets a safe default so the
 * engine never sees `any`.
 */
const settingsSchema = z
  .object({
    mode: z.enum(['solo', 'multiplayer', 'competitive']).default('multiplayer'),
    gameType: z.enum(['standard']).default('standard'),
    responseType: z.enum(['typing', 'qcm', 'mix']).default('mix'),
    soundCount: z.coerce.number().int().min(5).max(100).default(20),
    soundTypes: z.array(z.string()).min(1).default(['opening']),
    difficulty: z.array(z.string()).default(['medium']),
    guessDuration: z.coerce.number().int().min(5).max(120).default(20),
    soundSelection: z.enum(['random', 'mix', 'watched', 'playlist']).default('random'),
    precision: z.preprocess(
      (val) => normalizePrecision(val),
      z.enum(['anime', 'franchise', 'artist']).default('franchise'),
    ),
    watchedMode: z.enum(['union', 'intersection']).optional(),
    watchedAllowFallback: z.boolean().default(false),
    playlistId: z.string().uuid().nullable().optional(),
    decadePlaylistId: z.string().uuid().nullable().optional(),
    playlistWatched: z.boolean().default(false),
    speedBonusEnabled: z.boolean().default(false),
    videoMode: z.enum(['hidden', 'blurred', 'peek']).default('hidden'),
    songStartMode: z.enum(['random', 'beginning']).default('random'),
    isPrivate: z.boolean().default(false),
    password: z.string().max(GAME_CONFIG.LIMITS.MAX_ROOM_PASSWORD_LENGTH).default(''),
    maxPlayers: z.coerce
      .number()
      .int()
      .min(1)
      .max(GAME_CONFIG.LIMITS.MAX_PLAYERS_PER_LOBBY)
      .default(16),
    roomName: z.string().max(GAME_CONFIG.LIMITS.MAX_ROOM_NAME_LENGTH).optional(),
  })
  .strip()
  .superRefine((data, ctx) => {
    if (data.soundSelection === 'playlist' && !data.playlistId && !data.decadePlaylistId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A playlist is required.',
        path: ['playlistId'],
      });
    }
  });

/** One-release compat: old clients still send `gameType: 'sprint'`. */
function liftLegacySprint(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  const data = { ...(input as Record<string, unknown>) };
  if (data.gameType === 'sprint') {
    data.gameType = 'standard';
    data.speedBonusEnabled = true;
    data.responseType = 'typing';
  }
  return data;
}

function applySpeedBonusRules<
  T extends {
    speedBonusEnabled: boolean;
    responseType: string;
    maxPlayers: number;
    mode: string;
    gameType: 'standard';
  },
>(settings: T): T {
  return {
    ...settings,
    gameType: 'standard',
    speedBonusEnabled: isSpeedBonusEnabled(settings),
  };
}

export interface SettingsMeta {
  roomName?: string;
  hostName: string;
  hostAvatar: string;
}

export const normalizeRoomSettings = (input: unknown, meta: SettingsMeta): RoomSettings => {
  const parsed = settingsSchema.parse(liftLegacySprint(input ?? {}));
  const withSpeedBonus = applySpeedBonusRules(parsed);
  const name = (meta.roomName || withSpeedBonus.roomName || `Salon de ${meta.hostName}`).trim();

  return {
    ...withSpeedBonus,
    playlistId: withSpeedBonus.playlistId ?? undefined,
    decadePlaylistId: withSpeedBonus.decadePlaylistId ?? undefined,
    roomName: name,
    name,
    hostName: meta.hostName,
    hostAvatar: meta.hostAvatar,
  };
};

const usesWatchedFallback = (settings: RoomSettings): boolean =>
  settings.soundSelection === 'watched' ||
  (settings.soundSelection === 'playlist' && Boolean(settings.playlistWatched));

/** Merge a settings patch onto existing settings (host edits), re-validated. */
export const mergeRoomSettings = (current: RoomSettings, patch: unknown): RoomSettings => {
  const merged = { ...current, ...(patch as Record<string, unknown>) };
  const next = normalizeRoomSettings(merged, {
    roomName: (merged as RoomSettings).roomName,
    hostName: current.hostName ?? 'Hôte',
    hostAvatar: current.hostAvatar ?? 'player1',
  });
  if (!usesWatchedFallback(next)) {
    next.watchedAllowFallback = false;
  }
  if (next.soundSelection !== 'playlist') {
    next.playlistId = undefined;
    next.decadePlaylistId = undefined;
    next.playlistWatched = false;
  }
  return next;
};
