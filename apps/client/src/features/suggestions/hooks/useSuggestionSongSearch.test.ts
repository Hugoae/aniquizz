import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SuggestionSongOptionsResponse } from '@aniquizz/shared';
import { suggestionsApi } from '@/lib/suggestionsApi';
import { useSuggestionSongSearch } from './useSuggestionSongSearch';

vi.mock('@/lib/suggestionsApi', () => ({
  suggestionsApi: {
    songOptions: vi.fn(),
  },
  SuggestionsApiError: class SuggestionsApiError extends Error {
    status = 500;
  },
}));

const songOptions = vi.mocked(suggestionsApi.songOptions);

const page = (titles: string[]): SuggestionSongOptionsResponse => ({
  songs: titles.map((title, index) => ({
    id: index + 1,
    title,
    artist: 'Artist',
    songType: 'OP',
    sequence: 1,
    difficulty: 'EASY',
    animeName: title,
    coverImage: null,
  })),
  pagination: { page: 1, pageSize: 20, totalItems: titles.length, totalPages: 1 },
});

describe('useSuggestionSongSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    songOptions.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the latest query when an older response arrives late', async () => {
    let resolveSlow: ((value: SuggestionSongOptionsResponse) => void) | undefined;
    songOptions
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSlow = resolve;
          }),
      )
      .mockResolvedValueOnce(page(['Naruto']));

    const { result } = renderHook(() => useSuggestionSongSearch(true));

    act(() => {
      result.current.setQuery('boruto');
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    act(() => {
      result.current.setQuery('naruto');
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.songs.map((song) => song.title)).toEqual(['Naruto']);

    await act(async () => {
      resolveSlow?.(page(['Boruto']));
      await Promise.resolve();
    });

    expect(result.current.songs.map((song) => song.title)).toEqual(['Naruto']);
  });
});
