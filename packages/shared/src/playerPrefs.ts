/** Player-scoped comfort prefs (not lobby/room settings, not account privacy). */

export type MotionMode = 'auto' | 'reduced' | 'full';

export interface PlayerPrefs {
  audioVolume: number;
  audioMuted: boolean;
  motionMode: MotionMode;
  autofocusAnswer: boolean;
  submitOnEnter: boolean;
  soloAutoReveal: boolean;
  showShortcutReminder: boolean;
  friendRequestVisual: boolean;
  friendRequestSound: boolean;
  lobbyInviteVisual: boolean;
  lobbyInviteSound: boolean;
}

/** Partial wire payload — omitted keys keep the stored value after a merge. */
export type PlayerPrefsInput = Partial<PlayerPrefs>;

/** @deprecated Use PlayerPrefs — kept while audio-only call sites migrate. */
export type PlayerAudioPrefs = PlayerPrefs;
/** @deprecated Use PlayerPrefsInput. */
export type PlayerAudioPrefsInput = PlayerPrefsInput;

export const PLAYER_PREFS_DEFAULTS: PlayerPrefs = {
  audioVolume: 20,
  audioMuted: false,
  motionMode: 'auto',
  autofocusAnswer: true,
  submitOnEnter: true,
  soloAutoReveal: false,
  showShortcutReminder: true,
  friendRequestVisual: true,
  friendRequestSound: false,
  lobbyInviteVisual: true,
  lobbyInviteSound: false,
};

export const PLAYER_PREFS_KEYS = [
  'audioVolume',
  'audioMuted',
  'motionMode',
  'autofocusAnswer',
  'submitOnEnter',
  'soloAutoReveal',
  'showShortcutReminder',
  'friendRequestVisual',
  'friendRequestSound',
  'lobbyInviteVisual',
  'lobbyInviteSound',
] as const satisfies ReadonlyArray<keyof PlayerPrefs>;

export function clampAudioVolume(value: unknown): number {
  if (value === null || value === undefined) return PLAYER_PREFS_DEFAULTS.audioVolume;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return PLAYER_PREFS_DEFAULTS.audioVolume;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function isMotionMode(value: unknown): value is MotionMode {
  return value === 'auto' || value === 'reduced' || value === 'full';
}

export function normalizeMotionMode(value: unknown): MotionMode {
  return isMotionMode(value) ? value : PLAYER_PREFS_DEFAULTS.motionMode;
}

/**
 * Resolve whether motion should be reduced.
 * `auto` follows the OS; `reduced` always reduces; `full` always keeps animations.
 */
export function resolveMotionReduced(mode: MotionMode, osPrefersReduced: boolean): boolean {
  if (mode === 'reduced') return true;
  if (mode === 'full') return false;
  return osPrefersReduced;
}

function readFlag(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === true;
}

export function normalizePlayerPrefs(input: unknown): PlayerPrefs {
  if (!input || typeof input !== 'object') {
    return { ...PLAYER_PREFS_DEFAULTS };
  }
  const rec = input as Record<string, unknown>;
  return {
    audioVolume:
      rec.audioVolume === undefined
        ? PLAYER_PREFS_DEFAULTS.audioVolume
        : clampAudioVolume(rec.audioVolume),
    audioMuted: rec.audioMuted === true,
    motionMode: normalizeMotionMode(rec.motionMode),
    autofocusAnswer: readFlag(rec.autofocusAnswer, PLAYER_PREFS_DEFAULTS.autofocusAnswer),
    submitOnEnter: readFlag(rec.submitOnEnter, PLAYER_PREFS_DEFAULTS.submitOnEnter),
    soloAutoReveal: readFlag(rec.soloAutoReveal, PLAYER_PREFS_DEFAULTS.soloAutoReveal),
    showShortcutReminder: readFlag(
      rec.showShortcutReminder,
      PLAYER_PREFS_DEFAULTS.showShortcutReminder,
    ),
    friendRequestVisual: readFlag(
      rec.friendRequestVisual,
      PLAYER_PREFS_DEFAULTS.friendRequestVisual,
    ),
    friendRequestSound: readFlag(rec.friendRequestSound, PLAYER_PREFS_DEFAULTS.friendRequestSound),
    lobbyInviteVisual: readFlag(rec.lobbyInviteVisual, PLAYER_PREFS_DEFAULTS.lobbyInviteVisual),
    lobbyInviteSound: readFlag(rec.lobbyInviteSound, PLAYER_PREFS_DEFAULTS.lobbyInviteSound),
  };
}

/**
 * Merge a partial wire patch onto the stored row, then normalize.
 * Callers must pass the current row so omitted keys are not defaulted away.
 */
export function mergePlayerPrefsPatch(current: PlayerPrefs, patch: unknown): PlayerPrefs {
  const rec = patch && typeof patch === 'object' ? (patch as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...current };
  for (const key of PLAYER_PREFS_KEYS) {
    if (rec[key] !== undefined) merged[key] = rec[key];
  }
  return normalizePlayerPrefs(merged);
}

export function playerPrefsEqual(a: PlayerPrefs, b: PlayerPrefs): boolean {
  return PLAYER_PREFS_KEYS.every((key) => a[key] === b[key]);
}

/**
 * Pick the live prefs: a pending local write wins over the account snapshot;
 * otherwise the account is the cross-device source of truth.
 */
export function resolvePlayerPrefs(input: {
  local: unknown;
  account: unknown;
  preferLocal: boolean;
}): PlayerPrefs {
  if (input.preferLocal) return normalizePlayerPrefs(input.local);
  if (input.account != null) return normalizePlayerPrefs(input.account);
  return normalizePlayerPrefs(input.local);
}

/** True when a profile snapshot has enough audio fields to treat as account prefs. */
export function hasAccountPlayerPrefs(profile: unknown): boolean {
  if (!profile || typeof profile !== 'object') return false;
  const rec = profile as Record<string, unknown>;
  return typeof rec.audioVolume === 'number' && typeof rec.audioMuted === 'boolean';
}
