import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock('@aniquizz/database', () => ({
  prisma: { song: { findMany: mocks.findMany } },
}));

import { DAILY_PLAYABLE_POOL_TTL_MS, invalidateDailyPlayablePool, loadPlayablePool } from './dailyPlayablePool';

describe('loadPlayablePool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateDailyPlayablePool();
    mocks.findMany.mockResolvedValue([]);
  });

  it('shares one catalogue scan across concurrent callers', async () => {
    await Promise.all([loadPlayablePool(), loadPlayablePool(), loadPlayablePool()]);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });

  it('reuses the cached pool within the TTL', async () => {
    await loadPlayablePool();
    await loadPlayablePool();
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });

  it('refetches after invalidate or TTL', async () => {
    vi.useFakeTimers();
    try {
      await loadPlayablePool();
      invalidateDailyPlayablePool();
      await loadPlayablePool();
      expect(mocks.findMany).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(DAILY_PLAYABLE_POOL_TTL_MS + 1);
      await loadPlayablePool();
      expect(mocks.findMany).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
