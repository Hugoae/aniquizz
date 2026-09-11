import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseAnimeThemesSelectionConfig,
  resolveAnimeThemeSelection,
  type SelectableAnime,
} from './animethemes-selection';

const anime = (
  id: number,
  popularity: number,
  isLocked: boolean,
): SelectableAnime => ({ id, popularity, isLocked, name: `Anime ${id}` });

describe('AnimeThemes selection', () => {
  it('keeps the historical unlocked-only behavior by default', () => {
    const config = parseAnimeThemesSelectionConfig({});
    const result = resolveAnimeThemeSelection(
      [anime(1, 500, true), anime(2, 400, false)],
      config,
    );

    assert.deepEqual(result.selectedIds, [2]);
    assert.deepEqual(result.missingIds, []);
  });

  it('selects locked anime when all rows are explicitly requested', () => {
    const config = parseAnimeThemesSelectionConfig({
      ANIMETHEMES_INCLUDE_LOCKED: 'true',
    });
    const result = resolveAnimeThemeSelection(
      [anime(1, 500, true), anime(2, 400, false)],
      config,
    );

    assert.deepEqual(result.selectedIds, [1, 2]);
  });

  it('selects exact ids regardless of lock state and reports missing ids', () => {
    const config = parseAnimeThemesSelectionConfig({
      ANIMETHEMES_TARGET_IDS: '3,1,99,3',
    });
    const result = resolveAnimeThemeSelection(
      [anime(1, 500, true), anime(2, 400, false), anime(3, 300, true)],
      config,
    );

    assert.deepEqual(result.selectedIds, [3, 1]);
    assert.deepEqual(result.missingIds, [99]);
  });

  it('uses the live AniList ranking order for a top selection', () => {
    const config = parseAnimeThemesSelectionConfig({
      ANIMETHEMES_TOP_LIMIT: '3',
    });
    const result = resolveAnimeThemeSelection(
      [anime(10, 1, true), anime(20, 999, true), anime(30, 500, false)],
      config,
      [30, 10, 20],
    );

    assert.deepEqual(result.selectedIds, [30, 10, 20]);
    assert.deepEqual(result.missingIds, []);
  });

  it('rejects incompatible top and exact-id scopes', () => {
    assert.throws(
      () =>
        parseAnimeThemesSelectionConfig({
          ANIMETHEMES_TOP_LIMIT: '100',
          ANIMETHEMES_TARGET_IDS: '1,2',
        }),
      /cannot be combined/i,
    );
  });

  it('rejects a top selection when no live ranking was provided', () => {
    const config = parseAnimeThemesSelectionConfig({
      ANIMETHEMES_TOP_LIMIT: '100',
    });

    assert.throws(
      () => resolveAnimeThemeSelection([anime(1, 500, true)], config),
      /live AniList ranking/i,
    );
  });
});
