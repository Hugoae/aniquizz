import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { prisma } from '@aniquizz/database';
import { getUserAnimeIds, verifyMalUser } from './malService';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    isAxiosError: (error: unknown): error is { response?: { status?: number } } =>
      typeof error === 'object' && error !== null && 'response' in error,
  },
}));

vi.mock('@aniquizz/database', () => ({
  prisma: {
    anime: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedGet = vi.mocked(axios.get);
const mockedFindMany = vi.mocked(prisma.anime.findMany);

describe('malService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MAL_CLIENT_ID = 'test-client-id';
  });

  it('verifyMalUser returns exists on 200 with data', async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [{ node: { id: 1 } }] } } as never);
    await expect(verifyMalUser('Hugo_ae')).resolves.toBe('exists');
  });

  it('verifyMalUser returns not_found on 404', async () => {
    mockedGet.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(verifyMalUser('missing_user_xyz')).resolves.toBe('not_found');
  });

  it('getUserAnimeIds maps MAL ids to catalogue ids', async () => {
    mockedGet
      .mockResolvedValueOnce({
        data: {
          data: [{ node: { id: 41457 }, list_status: { status: 'completed' } }],
          paging: {},
        },
      } as never)
      .mockResolvedValueOnce({
        data: { data: [], paging: {} },
      } as never)
      .mockResolvedValueOnce({
        data: { data: [], paging: {} },
      } as never);
    mockedFindMany.mockResolvedValueOnce([{ id: 41457 }]);

    await expect(getUserAnimeIds('mal_map_user')).resolves.toEqual([41457]);
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { idMal: { in: [41457] } },
      select: { id: true },
    });
  });

  it('getUserAnimeIds includes on_hold entries', async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { data: [], paging: {} } } as never)
      .mockResolvedValueOnce({ data: { data: [], paging: {} } } as never)
      .mockResolvedValueOnce({
        data: {
          data: [{ node: { id: 32998 }, list_status: { status: 'on_hold' } }],
          paging: {},
        },
      } as never);
    mockedFindMany.mockResolvedValueOnce([{ id: 32998 }]);

    await expect(getUserAnimeIds('mal_on_hold_user')).resolves.toEqual([32998]);
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { idMal: { in: [32998] } },
      select: { id: true },
    });
  });
});
