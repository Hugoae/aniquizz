import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderboardResponse } from '@aniquizz/shared';
import { leaderboardApi } from '@/lib/leaderboardApi';
import { useLeaderboard } from './useLeaderboard';

vi.mock('@/lib/leaderboardApi', () => ({
  leaderboardApi: { browse: vi.fn() },
  LeaderboardApiError: class LeaderboardApiError extends Error {
    status = 500;
  },
}));

const browse = vi.mocked(leaderboardApi.browse);

const payload = (metric: LeaderboardResponse['metric']): LeaderboardResponse => ({
  metric,
  entries: [],
  podium: [],
  pagination: { page: 1, pageSize: 25, totalItems: 0, totalPages: 1 },
  catalogueSize: 100,
  viewer: null,
});

function wrapper({ children, initial }: { children: ReactNode; initial: string }) {
  return (
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/leaderboard" element={children} />
      </Routes>
    </MemoryRouter>
  );
}

describe('useLeaderboard', () => {
  beforeEach(() => {
    browse.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the latest metric when an older response arrives late', async () => {
    let resolveSlow: ((value: LeaderboardResponse) => void) | undefined;
    browse
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSlow = resolve;
          }),
      )
      .mockResolvedValueOnce(payload('accuracy'));

    const { result } = renderHook(() => useLeaderboard(), {
      wrapper: ({ children }) => wrapper({ children, initial: '/leaderboard' }),
    });

    await act(async () => {
      result.current.setMetric('accuracy');
    });

    await waitFor(() => {
      expect(result.current.metric).toBe('accuracy');
      expect(result.current.data?.metric).toBe('accuracy');
    });

    await act(async () => {
      resolveSlow?.(payload('xp'));
    });

    expect(result.current.data?.metric).toBe('accuracy');
  });

  it('does not keep previous metric rows while the next tab loads', async () => {
    let resolveAccuracy: ((value: LeaderboardResponse) => void) | undefined;
    browse
      .mockResolvedValueOnce(payload('xp'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveAccuracy = resolve;
          }),
      );

    const { result } = renderHook(() => useLeaderboard(), {
      wrapper: ({ children }) => wrapper({ children, initial: '/leaderboard' }),
    });

    await waitFor(() => expect(result.current.data?.metric).toBe('xp'));

    await act(async () => {
      result.current.setMetric('accuracy');
    });

    expect(result.current.metric).toBe('accuracy');
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveAccuracy?.(payload('accuracy'));
    });

    await waitFor(() => expect(result.current.data?.metric).toBe('accuracy'));
  });

  it('writes the metric in the URL without a page', async () => {
    browse.mockResolvedValue(payload('xp'));
    let locationPath = '';

    const { result } = renderHook(
      () => {
        locationPath = useLocation().search;
        return useLeaderboard();
      },
      {
        wrapper: ({ children }) => wrapper({ children, initial: '/leaderboard' }),
      },
    );

    await waitFor(() => expect(result.current.data).toBeTruthy());

    await act(async () => {
      result.current.setMetric('games');
    });

    await waitFor(() => {
      expect(result.current.metric).toBe('games');
      expect(locationPath).toContain('metric=games');
      expect(locationPath).not.toContain('page=');
    });
  });
});
