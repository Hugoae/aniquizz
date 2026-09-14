import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  resolveAnilistList: vi.fn(),
  resolveMalList: vi.fn(),
  invalidateMalUserCache: vi.fn(),
  gate: {
    isInBackoff: vi.fn(() => false),
    forgetUser: vi.fn(),
    hasFreshSuccess: vi.fn(() => false),
  },
}));

vi.mock('@aniquizz/database', () => ({
  prisma: { profile: { findUnique: mocks.findUnique } },
}));
vi.mock('../anilist/anilistService', () => ({
  resolveAnilistList: mocks.resolveAnilistList,
}));
vi.mock('../anilist/anilistListGate', () => ({
  anilistListGate: mocks.gate,
}));
vi.mock('../mal/malService', () => ({
  invalidateMalUserCache: mocks.invalidateMalUserCache,
  resolveMalList: mocks.resolveMalList,
}));

import { resolvePlayerCatalogueWithMeta } from './listResolver';

describe('resolvePlayerCatalogueWithMeta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.gate.isInBackoff.mockReturnValue(false);
    mocks.gate.hasFreshSuccess.mockReturnValue(false);
  });

  it('resolves the selected MAL account when both providers are linked', async () => {
    mocks.resolveMalList.mockResolvedValue({
      ids: [7, 8],
      state: 'ok',
      fromNetwork: true,
    });

    await expect(
      resolvePlayerCatalogueWithMeta('user-1', {
        anilistUsername: 'AniUser',
        malUsername: 'MalUser',
        activeListProvider: 'mal',
      }),
    ).resolves.toEqual({
      ids: [7, 8],
      provider: 'mal',
      state: 'ok',
      fromNetwork: true,
    });
    expect(mocks.resolveAnilistList).not.toHaveBeenCalled();
  });

  it('falls back to AniList when the stored MAL source is no longer linked', async () => {
    mocks.resolveAnilistList.mockResolvedValue({
      ids: [42],
      blocked: false,
      stale: false,
    });

    const result = await resolvePlayerCatalogueWithMeta('user-1', {
      anilistUsername: 'AniUser',
      malUsername: null,
      activeListProvider: 'mal',
    });

    expect(result).toMatchObject({ ids: [42], provider: 'anilist', state: 'ok' });
    expect(mocks.resolveMalList).not.toHaveBeenCalled();
  });

  it('invalidates the selected MAL cache for an explicit refresh', async () => {
    mocks.resolveMalList.mockResolvedValue({
      ids: [],
      state: 'private_empty',
      fromNetwork: true,
    });

    const result = await resolvePlayerCatalogueWithMeta(
      'user-1',
      { malUsername: 'MalUser', activeListProvider: 'mal' },
      { bustCache: true },
    );

    expect(mocks.invalidateMalUserCache).toHaveBeenCalledWith('MalUser');
    expect(result).toMatchObject({
      provider: 'mal',
      state: 'private_empty',
      fromNetwork: true,
    });
  });
});
