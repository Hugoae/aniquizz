import { afterEach, describe, expect, it } from 'vitest';
import { PLAYER_PREFS_DEFAULTS, normalizePlayerPrefs } from '@aniquizz/shared';
import {
  PLAYER_PREFS_LEGACY_STORAGE_KEY,
  PLAYER_PREFS_STORAGE_KEY,
  readPlayerPrefs,
  writePlayerPrefs,
} from './playerPrefsStorage';

afterEach(() => {
  localStorage.removeItem(PLAYER_PREFS_STORAGE_KEY);
  localStorage.removeItem(PLAYER_PREFS_LEGACY_STORAGE_KEY);
});

describe('playerPrefsStorage', () => {
  it('returns null when nothing is stored', () => {
    expect(readPlayerPrefs()).toBeNull();
  });

  it('round-trips a prefs object', () => {
    const prefs = { ...PLAYER_PREFS_DEFAULTS, audioVolume: 55, audioMuted: true };
    writePlayerPrefs(prefs);
    expect(readPlayerPrefs()).toEqual(prefs);
  });

  it('returns null for malformed JSON so callers fall back to defaults', () => {
    localStorage.setItem(PLAYER_PREFS_STORAGE_KEY, '{not-json');
    expect(readPlayerPrefs()).toBeNull();
    expect(normalizePlayerPrefs(readPlayerPrefs())).toEqual(PLAYER_PREFS_DEFAULTS);
  });

  it('migrates a v1 audio snapshot to v2 without losing volume or mute', () => {
    localStorage.setItem(
      PLAYER_PREFS_LEGACY_STORAGE_KEY,
      JSON.stringify({ audioVolume: 70, audioMuted: true }),
    );
    expect(readPlayerPrefs()).toEqual({ audioVolume: 70, audioMuted: true });
    expect(JSON.parse(localStorage.getItem(PLAYER_PREFS_STORAGE_KEY) ?? '{}')).toEqual({
      ...PLAYER_PREFS_DEFAULTS,
      audioVolume: 70,
      audioMuted: true,
    });
    expect(localStorage.getItem(PLAYER_PREFS_LEGACY_STORAGE_KEY)).toBeNull();
  });
});
