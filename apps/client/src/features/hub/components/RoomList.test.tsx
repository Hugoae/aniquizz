import type { RoomListItem } from '@aniquizz/shared';
import { renderWithProviders as render } from '@/test/renderWithProviders';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoomList } from './RoomList';

vi.mock('@/features/friends/FriendsContext', () => ({
  useFriends: () => ({ friends: [] }),
}));

vi.mock('@/features/hub/hooks/usePublishedPlaylists', () => ({
  usePublishedPlaylists: () => ({ playlists: [] }),
}));

const settings: RoomListItem['settings'] = {
  gameType: 'standard',
  soundCount: 10,
  difficulty: ['medium'],
  guessDuration: 15,
  precision: 'franchise',
  responseType: 'mix',
  soundSelection: 'random',
};

function room(overrides: Partial<RoomListItem> = {}): RoomListItem {
  return {
    id: 'A3K9ZQ',
    name: 'Salon test',
    host: 'Hôte',
    hostAvatar: 'player1',
    mode: 'multiplayer',
    players: 2,
    maxPlayers: 8,
    isPrivate: false,
    status: 'waiting',
    settings,
    ...overrides,
  };
}

describe('RoomList', () => {
  it('does not let a visitor join a match already in progress', () => {
    const onJoin = vi.fn();
    render(<RoomList rooms={[room({ status: 'playing' })]} onJoin={onJoin} onRefresh={() => {}} />);

    const cta = screen.getByRole('button', { name: 'EN COURS' });
    expect(cta).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'REGARDER' })).toBeNull();
  });

  it('keeps waiting rooms joinable', () => {
    render(<RoomList rooms={[room()]} onJoin={() => {}} onRefresh={() => {}} />);
    expect(screen.getByRole('button', { name: 'REJOINDRE' })).toBeEnabled();
  });

  it('disables join when the waiting room is already full', () => {
    render(
      <RoomList
        rooms={[room({ players: 8, maxPlayers: 8 })]}
        onJoin={() => {}}
        onRefresh={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'COMPLET' })).toBeDisabled();
  });
});
