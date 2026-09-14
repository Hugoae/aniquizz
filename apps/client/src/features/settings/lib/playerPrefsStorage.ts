import { normalizePlayerPrefs, type PlayerPrefs } from '@aniquizz/shared';

export const PLAYER_PREFS_STORAGE_KEY = 'aniquizz-player-prefs-v2';
export const PLAYER_PREFS_LEGACY_STORAGE_KEY = 'aniquizz-player-prefs-v1';

export function readPlayerPrefs(): unknown {
  try {
    const raw = localStorage.getItem(PLAYER_PREFS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as unknown;

    const legacy = localStorage.getItem(PLAYER_PREFS_LEGACY_STORAGE_KEY);
    if (!legacy) return null;
    const parsed = JSON.parse(legacy) as unknown;
    writePlayerPrefs(normalizePlayerPrefs(parsed));
    localStorage.removeItem(PLAYER_PREFS_LEGACY_STORAGE_KEY);
    return parsed;
  } catch {
    return null;
  }
}

export function writePlayerPrefs(prefs: PlayerPrefs): void {
  try {
    localStorage.setItem(PLAYER_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    localStorage.removeItem(PLAYER_PREFS_LEGACY_STORAGE_KEY);
  } catch {
    // Private mode / quota — live state still works for this session.
  }
}
