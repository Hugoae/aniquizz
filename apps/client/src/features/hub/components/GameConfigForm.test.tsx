import { renderWithProviders as render } from '@/test/renderWithProviders';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RoomConfig } from '@aniquizz/shared';
import { GameConfigForm } from './GameConfigForm';
import { WATCHED_SOURCE_BLOCK_MESSAGE } from './config/watchedSource';

vi.mock('@/lib/socket', () => ({
  socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));

vi.mock('@/features/hub/hooks/useWatchedPoolStats', () => ({
  useWatchedPoolStats: () => ({ stats: null, loading: false }),
}));

vi.mock('@/features/hub/hooks/usePlaylistPoolStats', () => ({
  usePlaylistPoolStats: () => ({ stats: null, loading: false }),
}));

vi.mock('@/features/hub/hooks/useCataloguePoolStats', () => ({
  useCataloguePoolStats: () => ({
    stats: { playableSongs: 3002, animeCount: 846, soundCount: 20 },
    loading: false,
  }),
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

describe('GameConfigForm', () => {
  it('shows watched block message when AniList is not linked', () => {
    render(
      <GameConfigForm
        config={{ ...baseConfig, soundSelection: 'watched' }}
        setConfig={() => {}}
        toggleSoundType={() => {}}
        onReset={() => {}}
        onSubmit={() => {}}
        user={{ id: 'u1' } as never}
        profile={{ anilistUsername: null } as never}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(WATCHED_SOURCE_BLOCK_MESSAGE);
    expect(screen.getByRole('button', { name: /lancer la partie/i })).toBeDisabled();
  });

  it('calls onSubmit when configuration is valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <GameConfigForm
        config={baseConfig}
        setConfig={() => {}}
        toggleSoundType={() => {}}
        onReset={() => {}}
        onSubmit={onSubmit}
        user={{ id: 'u1' } as never}
        profile={{ anilistUsername: 'PlayerOne' } as never}
      />,
    );

    await user.click(screen.getByRole('button', { name: /lancer la partie/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('allows endings to be selected', async () => {
    const user = userEvent.setup();
    const toggleSoundType = vi.fn();

    render(
      <GameConfigForm
        config={baseConfig}
        setConfig={() => {}}
        toggleSoundType={toggleSoundType}
        onReset={() => {}}
        onSubmit={() => {}}
        user={{ id: 'u1' } as never}
        profile={{ anilistUsername: 'PlayerOne' } as never}
      />,
    );

    const endings = screen.getByRole('button', { name: 'Endings' });
    expect(endings).toBeEnabled();
    await user.click(endings);
    expect(toggleSoundType).toHaveBeenCalledWith('ending');
  });

  it('shows catalogue pool counts under the config sections', () => {
    render(
      <GameConfigForm
        config={baseConfig}
        setConfig={() => {}}
        toggleSoundType={() => {}}
        onReset={() => {}}
        onSubmit={() => {}}
        user={{ id: 'u1' } as never}
        profile={{ anilistUsername: 'PlayerOne' } as never}
      />,
    );

    expect(screen.getByText(/disponible/i)).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && (el.textContent ?? '').replace(/\s/g, '').startsWith('3002')),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && (el.textContent ?? '').replace(/\s/g, '').startsWith('846')),
    ).toBeInTheDocument();
    expect(screen.getByText(/uniquement les cases cochées/i)).toBeInTheDocument();
  });
});
