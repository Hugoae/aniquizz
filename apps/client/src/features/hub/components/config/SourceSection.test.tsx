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

vi.mock('@/features/hub/hooks/usePublishedPlaylists', () => ({
  usePublishedPlaylists: () => ({ playlists: [], loading: false, error: null, retry: () => {} }),
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
    expect(screen.getByRole('tab', { name: /playlists/i })).toBeEnabled();
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
    expect(update).toHaveBeenCalledWith({
      soundSelection: 'watched',
      playlistId: undefined,
      decadePlaylistId: undefined,
      playlistWatched: false,
    });
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

  it('opens the playlists picker without locking the tab', async () => {
    const user = userEvent.setup();
    render(
      <SourceSection
        config={baseConfig}
        update={() => {}}
        isRoom={false}
        watchedListLinked={false}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /playlists/i }));
    expect(screen.getByText(/aucune playlist publiée/i)).toBeInTheDocument();
  });

  it('shows a server-offline message instead of an infinite pool spinner', () => {
    render(
      <SourceSection
        config={{ ...baseConfig, soundSelection: 'watched' }}
        update={() => {}}
        isRoom={false}
        watchedListLinked
        watchedPoolLoading
        watchedPoolOffline
      />,
    );

    expect(screen.getByText(/serveur de jeu n'est pas joignable/i)).toBeInTheDocument();
    expect(screen.queryByText(/analyse du pool/i)).not.toBeInTheDocument();
  });

  it('hides Union/Commun while creating a salon', () => {
    render(
      <SourceSection
        config={{ ...baseConfig, soundSelection: 'watched' }}
        update={() => {}}
        isRoom
        currentPlayersCount={0}
        watchedListLinked
      />,
    );

    expect(screen.queryByText(/mode de fusion/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Union')).not.toBeInTheDocument();
    expect(screen.queryByText('Commun')).not.toBeInTheDocument();
  });

  it('shows Union/Commun once two humans are in the salon', () => {
    render(
      <SourceSection
        config={{ ...baseConfig, soundSelection: 'watched' }}
        update={() => {}}
        isRoom
        currentPlayersCount={2}
        watchedListLinked
      />,
    );

    expect(screen.getByText(/mode de fusion/i)).toBeInTheDocument();
    expect(screen.getByText('Union')).toBeInTheDocument();
    expect(screen.getByText('Commun')).toBeInTheDocument();
  });
});
