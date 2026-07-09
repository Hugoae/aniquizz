import { renderWithProviders as render } from '@/test/renderWithProviders';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RoomConfig } from '@aniquizz/shared';
import { GameConfigForm } from './GameConfigForm';
import { WATCHED_SOURCE_BLOCK_MESSAGE } from './config/watchedSource';

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
});
