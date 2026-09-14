import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  buildSongFilter: vi.fn(),
}));

vi.mock('@aniquizz/database', () => ({
  prisma: { song: { findMany: mocks.findMany } },
}));

vi.mock('../catalogue/librarySongQuery', () => ({
  buildSongFilter: mocks.buildSongFilter,
}));

import { searchDailyPlayableSongs } from './dailyAdminSearch';

describe('searchDailyPlayableSongs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildSongFilter.mockResolvedValue({ downloadStatus: 'COMPLETED' });
    mocks.findMany.mockResolvedValue([]);
  });

  it('returns nothing until the query has at least two characters', async () => {
    await expect(searchDailyPlayableSongs('')).resolves.toEqual([]);
    await expect(searchDailyPlayableSongs(' n ')).resolves.toEqual([]);
    expect(mocks.buildSongFilter).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('reuses library song matching for playable OP and ED', async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 42,
        title: 'remember',
        artist: 'FLOW',
        songType: 'OP',
        sequence: 1,
        difficulty: 'MEDIUM',
        videoKey: 'k',
        anime: { name: 'Naruto Shippuden', coverImage: null },
      },
    ]);

    const hits = await searchDailyPlayableSongs('naruto', [7]);

    expect(mocks.buildSongFilter).toHaveBeenCalledWith({ q: 'naruto', songType: ['OP', 'ED'] });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { downloadStatus: 'COMPLETED' },
            { videoKey: { not: '' } },
            { id: { notIn: [7] } },
          ]),
        }),
      }),
    );
    expect(hits).toEqual([
      expect.objectContaining({
        id: 42,
        title: 'remember',
        anime: 'Naruto Shippuden',
        typeLabel: 'OP1',
      }),
    ]);
  });
});
