import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { prisma } from '@aniquizz/database';
import { WATCHED_MAL_STATUSES, type WatchedMalStatus } from '@aniquizz/shared';
import {
  getUserAnimeIds,
  invalidateMalUserCache,
  peekMalListCache,
  resolveMalList,
  verifyMalUser,
} from './malService';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    head: vi.fn(),
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
const mockedHead = vi.mocked(axios.head);
const mockedFindMany = vi.mocked(prisma.anime.findMany);

type MalListEntry = { node?: { id?: number }; list_status?: { status?: string } };

function mockMalPagesByStatus(filled: Partial<Record<WatchedMalStatus, MalListEntry[]>> = {}) {
  for (const status of WATCHED_MAL_STATUSES) {
    mockedGet.mockResolvedValueOnce({
      data: { data: filled[status] ?? [], paging: {} },
    } as never);
  }
}

describe('malService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MAL_CLIENT_ID = 'test-client-id';
    invalidateMalUserCache('mal_map_user');
    invalidateMalUserCache('mal_on_hold_user');
    invalidateMalUserCache('mal_dropped_user');
    invalidateMalUserCache('private_list_user');
    invalidateMalUserCache('unavailable_user');
    invalidateMalUserCache('peek_user');
  });

  it('verifyMalUser returns exists on 200 even without a data array', async () => {
    mockedGet.mockResolvedValueOnce({ status: 200, data: { paging: {} } } as never);
    await expect(verifyMalUser('Hugo_ae')).resolves.toBe('exists');
    expect(mockedHead).not.toHaveBeenCalled();
  });

  it('verifyMalUser treats a private animelist (403) as exists', async () => {
    mockedGet.mockRejectedValueOnce({ response: { status: 403 } });
    await expect(verifyMalUser('private_user')).resolves.toBe('exists');
    expect(mockedHead).not.toHaveBeenCalled();
  });

  it('verifyMalUser uses a profile HEAD when the animelist is 404', async () => {
    mockedGet.mockRejectedValueOnce({ response: { status: 404 } });
    mockedHead.mockResolvedValueOnce({ status: 200 } as never);
    await expect(verifyMalUser('https://myanimelist.net/profile/Hugo_ae')).resolves.toBe('exists');
    expect(mockedHead).toHaveBeenCalledWith(
      'https://myanimelist.net/profile/Hugo_ae',
      expect.objectContaining({ headers: { 'User-Agent': expect.any(String) } }),
    );
  });

  it('verifyMalUser returns not_found on 404 + missing profile', async () => {
    mockedGet.mockRejectedValueOnce({ response: { status: 404 } });
    mockedHead.mockResolvedValueOnce({ status: 404 } as never);
    await expect(verifyMalUser('missing_user_xyz')).resolves.toBe('not_found');
  });

  it('verifyMalUser returns unconfigured when MAL_CLIENT_ID is missing', async () => {
    delete process.env.MAL_CLIENT_ID;
    await expect(verifyMalUser('Hugo_ae')).resolves.toBe('unconfigured');
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('getUserAnimeIds maps MAL ids to catalogue ids', async () => {
    mockMalPagesByStatus({
      completed: [{ node: { id: 41457 }, list_status: { status: 'completed' } }],
    });
    mockedFindMany.mockResolvedValueOnce([{ id: 41457 }]);

    await expect(getUserAnimeIds('mal_map_user')).resolves.toEqual([41457]);
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { idMal: { in: [41457] } },
      select: { id: true },
    });
  });

  it('getUserAnimeIds includes on_hold entries', async () => {
    mockMalPagesByStatus({
      on_hold: [{ node: { id: 32998 }, list_status: { status: 'on_hold' } }],
    });
    mockedFindMany.mockResolvedValueOnce([{ id: 32998 }]);

    await expect(getUserAnimeIds('mal_on_hold_user')).resolves.toEqual([32998]);
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { idMal: { in: [32998] } },
      select: { id: true },
    });
  });

  it('getUserAnimeIds includes dropped entries', async () => {
    mockMalPagesByStatus({
      dropped: [{ node: { id: 5114 }, list_status: { status: 'dropped' } }],
    });
    mockedFindMany.mockResolvedValueOnce([{ id: 5114 }]);

    await expect(getUserAnimeIds('mal_dropped_user')).resolves.toEqual([5114]);
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { idMal: { in: [5114] } },
      select: { id: true },
    });
  });

  it('reports private lists as a successful network resolution', async () => {
    mockedGet.mockRejectedValue({ response: { status: 403 } });

    await expect(resolveMalList('private_list_user')).resolves.toEqual({
      ids: [],
      state: 'private_empty',
      fromNetwork: true,
    });
  });

  it('does not cache unavailable MAL responses', async () => {
    mockedGet.mockRejectedValue({ response: { status: 503 } });

    await expect(resolveMalList('unavailable_user')).resolves.toMatchObject({
      state: 'unavailable',
      fromNetwork: false,
    });
    await expect(resolveMalList('unavailable_user')).resolves.toMatchObject({
      state: 'unavailable',
      fromNetwork: false,
    });
    expect(mockedGet).toHaveBeenCalledTimes(WATCHED_MAL_STATUSES.length * 2);
  });

  it('exposes a settled cache peek after a successful fetch', async () => {
    mockMalPagesByStatus({
      completed: [{ node: { id: 1 }, list_status: { status: 'completed' } }],
    });
    mockedFindMany.mockResolvedValueOnce([{ id: 1 }]);

    expect(peekMalListCache('peek_user')).toBeNull();
    await expect(resolveMalList('peek_user')).resolves.toMatchObject({
      ids: [1],
      state: 'ok',
    });
    expect(peekMalListCache('peek_user')).toEqual({
      ids: [1],
      state: 'ok',
      fromNetwork: true,
    });
  });
});
