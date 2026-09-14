import { describe, expect, it } from 'vitest';
import {
  PLAYER_PREFS_DEFAULTS,
  clampAudioVolume,
  mergePlayerPrefsPatch,
  normalizeMotionMode,
  normalizePlayerPrefs,
  playerPrefsEqual,
  resolveMotionReduced,
  resolvePlayerPrefs,
} from './playerPrefs';

describe('clampAudioVolume', () => {
  it('keeps an in-range integer', () => {
    expect(clampAudioVolume(20)).toBe(20);
    expect(clampAudioVolume(0)).toBe(0);
    expect(clampAudioVolume(100)).toBe(100);
  });

  it('rounds to the nearest integer', () => {
    expect(clampAudioVolume(20.4)).toBe(20);
    expect(clampAudioVolume(20.6)).toBe(21);
  });

  it('clamps below 0 and above 100', () => {
    expect(clampAudioVolume(-5)).toBe(0);
    expect(clampAudioVolume(150)).toBe(100);
  });

  it('falls back to the default for non-finite values', () => {
    expect(clampAudioVolume(Number.NaN)).toBe(20);
    expect(clampAudioVolume(Number.POSITIVE_INFINITY)).toBe(20);
    expect(clampAudioVolume(undefined)).toBe(20);
    expect(clampAudioVolume(null)).toBe(20);
    expect(clampAudioVolume('nope')).toBe(20);
  });

  it('parses numeric strings', () => {
    expect(clampAudioVolume('40')).toBe(40);
  });
});

describe('normalizePlayerPrefs', () => {
  it('returns defaults for missing or invalid input', () => {
    expect(normalizePlayerPrefs(null)).toEqual(PLAYER_PREFS_DEFAULTS);
    expect(normalizePlayerPrefs(undefined)).toEqual(PLAYER_PREFS_DEFAULTS);
    expect(normalizePlayerPrefs('x')).toEqual(PLAYER_PREFS_DEFAULTS);
  });

  it('fills omitted fields with defaults and clamps volume', () => {
    expect(normalizePlayerPrefs({ audioVolume: 150 })).toEqual({
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 100,
    });
    expect(normalizePlayerPrefs({ audioMuted: true })).toEqual({
      ...PLAYER_PREFS_DEFAULTS,
      audioMuted: true,
    });
  });

  it('migrates a v1 audio-only snapshot without dropping volume', () => {
    expect(normalizePlayerPrefs({ audioVolume: 70, audioMuted: true })).toEqual({
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 70,
      audioMuted: true,
    });
  });

  it('treats only boolean true as muted / default-off flags', () => {
    expect(normalizePlayerPrefs({ audioMuted: true }).audioMuted).toBe(true);
    expect(normalizePlayerPrefs({ audioMuted: false }).audioMuted).toBe(false);
    expect(normalizePlayerPrefs({ audioMuted: 'true' }).audioMuted).toBe(false);
    expect(normalizePlayerPrefs({ audioMuted: 1 }).audioMuted).toBe(false);
    expect(normalizePlayerPrefs({ soloAutoReveal: true }).soloAutoReveal).toBe(true);
    expect(normalizePlayerPrefs({ soloAutoReveal: 'yes' }).soloAutoReveal).toBe(false);
    expect(normalizePlayerPrefs({ friendRequestSound: true }).friendRequestSound).toBe(true);
    expect(normalizePlayerPrefs({ lobbyInviteSound: false }).lobbyInviteSound).toBe(false);
  });

  it('keeps explicit false on default-on flags', () => {
    expect(normalizePlayerPrefs({ autofocusAnswer: false }).autofocusAnswer).toBe(false);
    expect(normalizePlayerPrefs({ submitOnEnter: false }).submitOnEnter).toBe(false);
    expect(normalizePlayerPrefs({ showShortcutReminder: false }).showShortcutReminder).toBe(false);
    expect(normalizePlayerPrefs({ friendRequestVisual: false }).friendRequestVisual).toBe(false);
    expect(normalizePlayerPrefs({ lobbyInviteVisual: false }).lobbyInviteVisual).toBe(false);
  });
});

describe('normalizeMotionMode', () => {
  it('accepts the three modes and falls back to auto', () => {
    expect(normalizeMotionMode('auto')).toBe('auto');
    expect(normalizeMotionMode('reduced')).toBe('reduced');
    expect(normalizeMotionMode('full')).toBe('full');
    expect(normalizeMotionMode('off')).toBe('auto');
    expect(normalizeMotionMode(null)).toBe('auto');
  });
});

describe('resolveMotionReduced', () => {
  it('follows the OS in auto, forces reduce in reduced, and ignores the OS in full', () => {
    expect(resolveMotionReduced('auto', true)).toBe(true);
    expect(resolveMotionReduced('auto', false)).toBe(false);
    expect(resolveMotionReduced('reduced', false)).toBe(true);
    expect(resolveMotionReduced('reduced', true)).toBe(true);
    expect(resolveMotionReduced('full', true)).toBe(false);
    expect(resolveMotionReduced('full', false)).toBe(false);
  });
});

describe('mergePlayerPrefsPatch', () => {
  it('keeps omitted keys from the current row', () => {
    const current = normalizePlayerPrefs({
      audioVolume: 42,
      audioMuted: true,
      motionMode: 'full',
      autofocusAnswer: false,
    });
    expect(mergePlayerPrefsPatch(current, { audioVolume: 10 })).toEqual({
      ...current,
      audioVolume: 10,
    });
  });

  it('can turn a default-on flag off without resetting volume', () => {
    const current = normalizePlayerPrefs({ audioVolume: 80 });
    expect(mergePlayerPrefsPatch(current, { submitOnEnter: false })).toEqual({
      ...current,
      submitOnEnter: false,
    });
  });
});

describe('playerPrefsEqual', () => {
  it('compares every stored field', () => {
    const a = { ...PLAYER_PREFS_DEFAULTS };
    const b = { ...PLAYER_PREFS_DEFAULTS, motionMode: 'full' as const };
    expect(playerPrefsEqual(a, a)).toBe(true);
    expect(playerPrefsEqual(a, b)).toBe(false);
  });
});

describe('resolvePlayerPrefs', () => {
  it('prefers local when a signed-in write is pending', () => {
    expect(
      resolvePlayerPrefs({
        local: { audioVolume: 80, audioMuted: true, motionMode: 'reduced' },
        account: { audioVolume: 20, audioMuted: false, motionMode: 'full' },
        preferLocal: true,
      }),
    ).toEqual({
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 80,
      audioMuted: true,
      motionMode: 'reduced',
    });
  });

  it('uses the account row when no local write is pending', () => {
    expect(
      resolvePlayerPrefs({
        local: { audioVolume: 80, audioMuted: true },
        account: { audioVolume: 35, audioMuted: false, motionMode: 'full' },
        preferLocal: false,
      }),
    ).toEqual({
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 35,
      motionMode: 'full',
    });
  });

  it('falls back to local when the account is absent', () => {
    expect(
      resolvePlayerPrefs({
        local: { audioVolume: 12, audioMuted: true },
        account: null,
        preferLocal: false,
      }),
    ).toEqual({
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 12,
      audioMuted: true,
    });
  });
});
