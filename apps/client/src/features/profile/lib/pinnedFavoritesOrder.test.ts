import { describe, expect, it } from 'vitest';
import { addPinnedSong, movePinnedSong, removePinnedSong } from './pinnedFavoritesOrder';

describe('pinnedFavoritesOrder', () => {
  it('adds until the cap and rejects duplicates', () => {
    expect(addPinnedSong([1, 2], 3, 5)).toEqual({ ids: [1, 2, 3], rejected: null });
    expect(addPinnedSong([1, 2], 2, 5)).toEqual({ ids: [1, 2], rejected: 'duplicate' });
    expect(addPinnedSong([1, 2, 3, 4, 5], 9, 5)).toEqual({
      ids: [1, 2, 3, 4, 5],
      rejected: 'max',
    });
  });

  it('moves a pin within bounds', () => {
    expect(movePinnedSong([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
    expect(movePinnedSong([1, 2, 3], 1, -1)).toEqual([1, 2, 3]);
    expect(removePinnedSong([1, 2, 3], 2)).toEqual([1, 3]);
  });
});
