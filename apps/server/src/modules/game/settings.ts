import { z } from 'zod';
import {
  GAME_CONFIG,
  isSpeedBonusEnabled,
  normalizePrecision,
  normalizeTimeBudgetSeconds,
  TIME_ATTACK_RACE_MAX_PLAYERS,
  TIME_ATTACK_RACE_MIN_PLAYERS,
  TIME_ATTACK_STREAK_MAX_POOL,
  normalizeTimeAttackStreakBonusSeconds,
  normalizeTimeAttackStreakLength,
  timeAttackPoolSize,
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
    gameType: z.enum(['standard', 'timeAttack']).default('standard'),
    responseType: z.enum(['typing', 'qcm', 'mix']).default('mix'),
    soundCount: z.coerce.number().int().min(5).max(TIME_ATTACK_STREAK_MAX_POOL).default(20),
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
    timeBudgetSeconds: z.coerce.number().int().optional(),
    timeAttackReveal: z.boolean().optional(),
    timeAttackPunitiveSkip: z.boolean().optional(),
    timeAttackStreakBonus: z.boolean().optional(),
    timeAttackStreakLength: z.coerce.number().int().optional(),
    timeAttackStreakBonusSeconds: z.coerce.number().int().optional(),
    soloInstantReveal: z.boolean().optional(),
    testMatch: z.boolean().optional(),
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
  })
  .transform((data) => {
    if (data.isPrivate && data.password.trim() === '') {
      return { ...data, isPrivate: false, password: '' };
    }
    return data;
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
    gameType: 'standard' | 'timeAttack';
  },
>(settings: T): T {
  if (settings.gameType === 'timeAttack') {
    return { ...settings, speedBonusEnabled: false };
  }
  return {
    ...settings,
    gameType: 'standard',
    speedBonusEnabled: isSpeedBonusEnabled({ ...settings, gameType: 'standard' }),
  };
}

function applyTimeAttackRules<
  T extends {
    gameType: 'standard' | 'timeAttack';
    mode: string;
    maxPlayers: number;
    responseType: string;
    songStartMode: 'random' | 'beginning';
    speedBonusEnabled: boolean;
    timeBudgetSeconds?: number;
    timeAttackReveal?: boolean;
    timeAttackPunitiveSkip?: boolean;
    timeAttackStreakBonus?: boolean;
    timeAttackStreakLength?: number;
    timeAttackStreakBonusSeconds?: number;
    soloInstantReveal?: boolean;
    soundCount: number;
    soundSelection: 'random' | 'mix' | 'watched' | 'playlist';
    playlistWatched: boolean;
    watchedAllowFallback: boolean;
    watchedMode?: 'union' | 'intersection';
  },
>(settings: T): T {
  if (settings.gameType !== 'timeAttack') {
    const solo = settings.mode === 'solo' || settings.maxPlayers <= 1;
    return {
      ...settings,
      gameType: 'standard',
      timeBudgetSeconds: undefined,
      timeAttackReveal: undefined,
      timeAttackPunitiveSkip: undefined,
      timeAttackStreakBonus: undefined,
      timeAttackStreakLength: undefined,
      timeAttackStreakBonusSeconds: undefined,
      soloInstantReveal: solo && settings.soloInstantReveal === true,
      // The schema allows the Chrono pool ceiling. Standard stays on its own slider.
      soundCount: Math.min(100, Math.max(5, settings.soundCount)),
    };
  }

  const solo = settings.mode === 'solo' || settings.maxPlayers <= 1;
  const timeBudgetSeconds = normalizeTimeBudgetSeconds(settings.timeBudgetSeconds);
  const timeAttackStreakBonus = settings.timeAttackStreakBonus === true;
  const shared = {
    ...settings,
    gameType: 'timeAttack' as const,
    responseType: 'typing',
    speedBonusEnabled: false,
    timeBudgetSeconds,
    timeAttackReveal: settings.timeAttackReveal !== false,
    timeAttackPunitiveSkip: settings.timeAttackPunitiveSkip !== false,
    timeAttackStreakBonus,
    timeAttackStreakLength: normalizeTimeAttackStreakLength(settings.timeAttackStreakLength),
    timeAttackStreakBonusSeconds: normalizeTimeAttackStreakBonusSeconds(
      settings.timeAttackStreakBonusSeconds,
    ),
    soloInstantReveal: false,
    soundCount: timeAttackPoolSize(timeBudgetSeconds, timeAttackStreakBonus),
  };
  if (solo) return shared;

  // Versus: every lane plays the same playlist, so a per-player Watched pool would
  // make the draw unfair. The lobby offers neither; the server enforces it too.
  return {
    ...shared,
    maxPlayers: Math.min(
      TIME_ATTACK_RACE_MAX_PLAYERS,
      Math.max(TIME_ATTACK_RACE_MIN_PLAYERS, settings.maxPlayers),
    ),
    soundSelection: settings.soundSelection === 'watched' ? 'random' : settings.soundSelection,
    playlistWatched: false,
    watchedAllowFallback: false,
    watchedMode: undefined,
  };
}

export interface SettingsMeta {
  roomName?: string;
  hostName: string;
  hostAvatar: string;
  /**
   * Only an admin host may turn a match into an unsaved test.
   * Omitted or false forces `testMatch` off at create time.
   */
  allowTestMatch?: boolean;
}

export const normalizeRoomSettings = (input: unknown, meta: SettingsMeta): RoomSettings => {
  const parsed = settingsSchema.parse(liftLegacySprint(input ?? {}));
  const withModes = applyTimeAttackRules(applySpeedBonusRules(parsed));
  const name = (meta.roomName || withModes.roomName || `Salon de ${meta.hostName}`).trim();

  return {
    ...withModes,
    playlistId: withModes.playlistId ?? undefined,
    decadePlaylistId: withModes.decadePlaylistId ?? undefined,
    roomName: name,
    name,
    hostName: meta.hostName,
    hostAvatar: meta.hostAvatar,
    testMatch: meta.allowTestMatch === true && withModes.testMatch === true,
  };
};

const usesWatchedFallback = (settings: RoomSettings): boolean =>
  settings.soundSelection === 'watched' ||
  (settings.soundSelection === 'playlist' && Boolean(settings.playlistWatched));

/** Merge a settings patch onto existing settings (host edits), re-validated. */
export const mergeRoomSettings = (
  current: RoomSettings,
  patch: unknown,
  meta: { allowTestMatch?: boolean } = {},
): RoomSettings => {
  const merged = { ...current, ...(patch as Record<string, unknown>) };
  const next = normalizeRoomSettings(merged, {
    roomName: (merged as RoomSettings).roomName,
    hostName: current.hostName ?? 'Hôte',
    hostAvatar: current.hostAvatar ?? 'player1',
    // The create-time gate would clear a test flag the moment a non-admin
    // host edits anything else. Keep the stored flag unless an admin changes it.
    allowTestMatch: true,
  });
  const patchRecord =
    patch && typeof patch === 'object' ? (patch as Record<string, unknown>) : null;
  const requested =
    patchRecord && 'testMatch' in patchRecord
      ? patchRecord.testMatch === true
      : current.testMatch === true;
  next.testMatch = meta.allowTestMatch === true ? requested : current.testMatch === true;
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
