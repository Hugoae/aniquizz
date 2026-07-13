import { z } from 'zod';
import { GAME_CONFIG, normalizePrecision, type RoomSettings } from '@aniquizz/shared';
/**
 * Server-side validation/normalization of client-provided room settings.
 * Unknown extra keys are stripped; every field gets a safe default so the
 * engine never sees `any`.
 */
const settingsSchema = z
  .object({
    mode: z.enum(['solo', 'multiplayer', 'competitive']).default('multiplayer'),
    gameType: z.enum(['standard', 'sprint']).default('standard'),
    responseType: z.enum(['typing', 'qcm', 'mix']).default('mix'),
    soundCount: z.coerce.number().int().min(5).max(100).default(20),
    soundTypes: z.array(z.string()).min(1).default(['opening']),
    difficulty: z.array(z.string()).default(['medium']),
    guessDuration: z.coerce.number().int().min(5).max(120).default(20),
    soundSelection: z.enum(['random', 'mix', 'watched', 'playlist']).default('random'),
    precision: z.preprocess(
      (val) => normalizePrecision(val),
      z.enum(['anime', 'franchise']).default('franchise'),
    ),    watchedMode: z.enum(['union', 'intersection']).optional(),
    watchedAllowFallback: z.boolean().default(false),
    videoMode: z.enum(['hidden', 'blurred', 'peek']).default('hidden'),
    songStartMode: z.enum(['random', 'beginning']).default('random'),
    isPrivate: z.boolean().default(false),
    password: z.string().default(''),
    maxPlayers: z.coerce
      .number()
      .int()
      .min(1)
      .max(GAME_CONFIG.LIMITS.MAX_PLAYERS_PER_LOBBY)
      .default(16),
    roomName: z.string().optional(),
  })
  .strip()
  .superRefine((data, ctx) => {
    if (data.gameType === 'sprint' && data.maxPlayers < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sprint requires at least 2 players.',
        path: ['gameType'],
      });
    }
  });

function applySprintRules<T extends { gameType: string; responseType: string; maxPlayers: number }>(
  settings: T,
): T {
  if (settings.gameType !== 'sprint') return settings;
  return { ...settings, responseType: 'typing' };
}

export interface SettingsMeta {
  roomName?: string;
  hostName: string;
  hostAvatar: string;
}

export const normalizeRoomSettings = (input: unknown, meta: SettingsMeta): RoomSettings => {
  const parsed = settingsSchema.parse(input ?? {});
  const withSprint = applySprintRules(parsed);
  const name = (meta.roomName || withSprint.roomName || `Salon de ${meta.hostName}`).trim();

  return {
    ...withSprint,
    roomName: name,
    name,
    hostName: meta.hostName,
    hostAvatar: meta.hostAvatar,
  };
};

/** Merge a settings patch onto existing settings (host edits), re-validated. */
export const mergeRoomSettings = (
  current: RoomSettings,
  patch: unknown,
): RoomSettings => {
  const merged = { ...current, ...(patch as Record<string, unknown>) };
  const next = normalizeRoomSettings(merged, {
    roomName: (merged as RoomSettings).roomName,
    hostName: current.hostName ?? 'Hôte',
    hostAvatar: current.hostAvatar ?? 'player1',
  });
  if (next.soundSelection !== 'watched') {
    next.watchedAllowFallback = false;
  }
  return next;
};
