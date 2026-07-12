import { renderWithProviders as render } from '@/test/renderWithProviders';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RoomConfig } from '@aniquizz/shared';
import { SourceSection } from './SourceSection';

vi.mock('@/lib/socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('@/features/hub/hooks/useWatchedPoolStats', () => ({
  useWatchedPoolStats: () => ({ stats: null, loading: false }),
}));

const baseConfig: RoomConfig = {
  mode: 'solo',
  gameType: 'standard',
  responseType: 'mix',
  soundCount: 20,
  soundTypes: ['opening'],
  difficulty: ['medium'],
  guessDuration: 20,
  soundSelection: 'random',
  precision: 'franchise',
  isPrivate: false,
  password: '',
  maxPlayers: 1,
  roomName: 'Test',
  name: 'Test',
  hostName: 'Host',
  hostAvatar: 'player1',
};

describe('SourceSection', () => {
  it('renders source tabs', () => {
    render(
      <SourceSection
        config={baseConfig}
        update={() => {}}
        isRoom={false}
        watchedListLinked={false}
      />,
    );

    expect(screen.getByRole('tab', { name: /aléatoire/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /watched/i })).toBeInTheDocument();
  });

  it('allows selecting watched even when AniList is not linked', async () => {
    const user = userEvent.setup();
    const update = vi.fn();

    render(
      <SourceSection
        config={baseConfig}
        update={update}
        isRoom={false}
        watchedListLinked={false}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /watched/i }));
    expect(update).toHaveBeenCalledWith({ soundSelection: 'watched' });
  });

  it('shows random mode description when random is selected', () => {
    render(
      <SourceSection
        config={baseConfig}
        update={() => {}}
        isRoom={false}
        watchedListLinked={false}
      />,
    );

    expect(screen.getByText(/mode aléatoire/i)).toBeInTheDocument();
  });
});
