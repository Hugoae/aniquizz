import { describe, expect, it } from 'vitest';
import {
  normalizeSongStartMode,
  SONG_START_MODE_DEFAULT,
  SONG_START_MODE_DESCRIPTIONS,
  SONG_START_MODE_LABELS,
} from './songStartMode';

describe('songStartMode', () => {
  it('defaults unknown values to random', () => {
    expect(normalizeSongStartMode(undefined)).toBe('random');
    expect(normalizeSongStartMode(null)).toBe('random');
    expect(normalizeSongStartMode('invalid')).toBe('random');
    expect(SONG_START_MODE_DEFAULT).toBe('random');
  });

  it('accepts beginning', () => {
    expect(normalizeSongStartMode('beginning')).toBe('beginning');
  });

  it('exposes French labels and descriptions for both modes', () => {
    expect(SONG_START_MODE_LABELS.random).toBeTruthy();
    expect(SONG_START_MODE_LABELS.beginning).toBeTruthy();
    expect(SONG_START_MODE_DESCRIPTIONS.random).toContain('aléatoire');
    expect(SONG_START_MODE_DESCRIPTIONS.beginning).toContain('début');
  });
});
