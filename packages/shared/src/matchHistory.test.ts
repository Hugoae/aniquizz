import { describe, expect, it } from 'vitest';
import { matchHeardSongIds } from './matchHistory';

describe('matchHeardSongIds', () => {
  it('keeps started rounds and drops leftover playlist ids', () => {
    expect(
      matchHeardSongIds({
        recordedSongIds: [11, 22],
        inProgressSongId: null,
      }),
    ).toEqual([11, 22]);
  });

  it('includes the in-progress clip that started but has not been recorded yet', () => {
    expect(
      matchHeardSongIds({
        recordedSongIds: [11],
        inProgressSongId: 22,
      }),
    ).toEqual([11, 22]);
  });

  it('dedupes a repeated catalogue id', () => {
    expect(
      matchHeardSongIds({
        recordedSongIds: [11, 11],
        inProgressSongId: 11,
      }),
    ).toEqual([11]);
  });
});
