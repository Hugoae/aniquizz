import { renderWithProviders as render } from '@/test/renderWithProviders';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DailySongSearch } from './DailySongSearch';

const searchDailySongs = vi.fn();

vi.mock('@/lib/adminApi', () => ({
  AdminApiError: class AdminApiError extends Error {},
  adminApi: {
    searchDailySongs: (...args: unknown[]) => searchDailySongs(...args),
  },
}));

describe('DailySongSearch', () => {
  beforeEach(() => {
    searchDailySongs.mockReset();
    searchDailySongs.mockResolvedValue({ songs: [] });
  });

  it('does not search or list songs while the field is empty', async () => {
    const user = userEvent.setup();
    render(<DailySongSearch excludeIds={[]} onPick={() => {}} />);

    await user.click(screen.getByPlaceholderText(/titre, artiste ou anime/i));
    await new Promise((resolve) => window.setTimeout(resolve, 300));

    expect(searchDailySongs).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('searches after two characters and lists matching songs', async () => {
    const user = userEvent.setup();
    searchDailySongs.mockResolvedValue({
      songs: [
        {
          id: 1,
          title: 'remember',
          artist: 'FLOW',
          songType: 'OP',
          sequence: 1,
          typeLabel: 'OP1',
          difficulty: 'MEDIUM',
          anime: 'Naruto',
          cover: null,
          videoKey: 'k',
        },
        {
          id: 2,
          title: 'Silhouette',
          artist: 'KANA-BOON',
          songType: 'OP',
          sequence: 16,
          typeLabel: 'OP16',
          difficulty: 'MEDIUM',
          anime: 'Naruto Shippuden',
          cover: null,
          videoKey: 'k2',
        },
      ],
    });

    render(<DailySongSearch excludeIds={[]} onPick={() => {}} />);
    await user.type(screen.getByPlaceholderText(/titre, artiste ou anime/i), 'naruto');

    await waitFor(() => {
      expect(searchDailySongs).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'naruto' }),
      );
    });
    expect(await screen.findByRole('option', { name: /remember/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /silhouette/i })).toBeInTheDocument();
  });
});
