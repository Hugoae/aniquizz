import { renderWithProviders as render } from '@/test/renderWithProviders';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RoomConfig, ThematicPlaylistSummary } from '@aniquizz/shared';
import { PlaylistPicker } from './PlaylistPicker';

const baseConfig: RoomConfig = {
  mode: 'solo',
  gameType: 'standard',
  responseType: 'mix',
  soundCount: 20,
  soundTypes: ['opening'],
  difficulty: ['medium'],
  guessDuration: 20,
  soundSelection: 'playlist',
  precision: 'franchise',
  isPrivate: false,
  password: '',
  maxPlayers: 1,
  roomName: 'Test',
  name: 'Test',
  hostName: 'Host',
  hostAvatar: 'player1',
};

const packs: ThematicPlaylistSummary[] = [
  {
    id: 'p-shonen',
    slug: 'shonen',
    name: 'Shonen',
    description: 'Should not appear',
    category: 'tag',
    snapshotCount: 287,
    snapshotAt: null,
    sortOrder: 1,
    chips: ['Shounen'],
  },
  {
    id: 'p-slice',
    slug: 'slice-of-life',
    name: 'Tranches de vie',
    description: 'Should not appear',
    category: 'genre',
    snapshotCount: 809,
    snapshotAt: null,
    sortOrder: 2,
    chips: ['Slice of Life'],
  },
];

describe('PlaylistPicker', () => {
  it('renders emoji and a short blurb without category chips or song counts', () => {
    render(
      <PlaylistPicker
        config={baseConfig}
        update={() => {}}
        playlists={packs}
        loading={false}
        loadError={false}
        stats={null}
        isRoom={false}
        watchedListLinked={true}
      />,
    );

    expect(screen.getByRole('button', { name: /shonen/i })).toBeInTheDocument();
    expect(screen.getByText(/naruto/i)).toBeInTheDocument();
    expect(screen.getByText(/k-on!/i)).toBeInTheDocument();
    expect(screen.queryByText(/should not appear/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Shounen')).not.toBeInTheDocument();
    expect(screen.queryByText('TAG')).not.toBeInTheDocument();
    expect(screen.queryByText('GENRE')).not.toBeInTheDocument();
    expect(screen.queryByText(/287/)).not.toBeInTheDocument();
    expect(screen.queryByText(/809/)).not.toBeInTheDocument();
    expect(screen.queryByText(/univers borné/i)).not.toBeInTheDocument();
  });

  it('selects a pack without showing pool-size warnings in the tab', async () => {
    const user = userEvent.setup();
    const update = vi.fn();

    render(
      <PlaylistPicker
        config={{ ...baseConfig, playlistId: 'p-shonen' }}
        update={update}
        playlists={packs}
        loading={false}
        loadError={false}
        stats={{
          playlistId: 'p-shonen',
          snapshotCount: 287,
          filteredCount: 4,
          playableSongs: 4,
          animeCount: 3,
          distinctNames: 3,
          soundCount: 20,
          insufficient: true,
          packInsufficient: true,
          staleDropped: 0,
          playlistWatched: false,
        }}
        isRoom={false}
        watchedListLinked={true}
      />,
    );

    expect(screen.queryByText(/insuffisant/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/assez de sons/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /tranches de vie/i }));
    expect(update).toHaveBeenCalledWith({
      soundSelection: 'playlist',
      playlistId: 'p-slice',
      decadePlaylistId: undefined,
    });
  });

  it('groups decade packs into one Décennie card with a slider', async () => {
    const user = userEvent.setup();
    const update = vi.fn();
    const decades: ThematicPlaylistSummary[] = [
      {
        id: 'id-1990s',
        slug: '1990s',
        name: 'Années 1990',
        description: 'Should not appear',
        category: 'decade',
        snapshotCount: 105,
        snapshotAt: null,
        sortOrder: 110,
        chips: ['1990–1999'],
      },
      {
        id: 'id-2010s',
        slug: '2010s',
        name: 'Années 2010',
        description: 'Should not appear',
        category: 'decade',
        snapshotCount: 900,
        snapshotAt: null,
        sortOrder: 130,
        chips: ['2010–2019'],
      },
    ];

    const { rerender } = render(
      <PlaylistPicker
        config={baseConfig}
        update={update}
        playlists={[...packs, ...decades]}
        loading={false}
        loadError={false}
        stats={null}
        isRoom={false}
        watchedListLinked={true}
      />,
    );

    expect(screen.getByRole('button', { name: /décennie/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /années 1990/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: /décennie/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /décennie/i }));
    expect(update).toHaveBeenCalledWith({
      soundSelection: 'playlist',
      playlistId: undefined,
      decadePlaylistId: 'id-2010s',
    });

    rerender(
      <PlaylistPicker
        config={{ ...baseConfig, decadePlaylistId: 'id-2010s' }}
        update={update}
        playlists={[...packs, ...decades]}
        loading={false}
        loadError={false}
        stats={null}
        isRoom={false}
        watchedListLinked={true}
      />,
    );

    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByText('1990')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
  });

  it('keeps the decade overlay when selecting a genre pack', async () => {
    const user = userEvent.setup();
    const update = vi.fn();
    const decades: ThematicPlaylistSummary[] = [
      {
        id: 'id-2010s',
        slug: '2010s',
        name: 'Années 2010',
        description: '',
        category: 'decade',
        snapshotCount: 900,
        snapshotAt: null,
        sortOrder: 130,
        chips: [],
      },
    ];

    render(
      <PlaylistPicker
        config={{ ...baseConfig, decadePlaylistId: 'id-2010s' }}
        update={update}
        playlists={[...packs, ...decades]}
        loading={false}
        loadError={false}
        stats={null}
        isRoom={false}
        watchedListLinked={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: /shonen/i }));
    expect(update).toHaveBeenCalledWith({
      soundSelection: 'playlist',
      playlistId: 'p-shonen',
      decadePlaylistId: 'id-2010s',
    });
  });

  it('toggles the decade overlay off without dropping the genre pack', async () => {
    const user = userEvent.setup();
    const update = vi.fn();
    const decades: ThematicPlaylistSummary[] = [
      {
        id: 'id-2010s',
        slug: '2010s',
        name: 'Années 2010',
        description: '',
        category: 'decade',
        snapshotCount: 900,
        snapshotAt: null,
        sortOrder: 130,
        chips: [],
      },
    ];

    render(
      <PlaylistPicker
        config={{ ...baseConfig, playlistId: 'p-shonen', decadePlaylistId: 'id-2010s' }}
        update={update}
        playlists={[...packs, ...decades]}
        loading={false}
        loadError={false}
        stats={null}
        isRoom={false}
        watchedListLinked={true}
      />,
    );

    expect(screen.getByRole('button', { name: /décennie/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /shonen/i })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /décennie/i }));
    expect(update).toHaveBeenCalledWith({
      soundSelection: 'playlist',
      playlistId: 'p-shonen',
      decadePlaylistId: null,
    });
  });

  it('hides Hits faciles even if the API still returns it', () => {
    render(
      <PlaylistPicker
        config={baseConfig}
        update={() => {}}
        playlists={[
          ...packs,
          {
            id: 'p-easy',
            slug: 'easy-hits',
            name: 'Hits faciles',
            description: 'Facile',
            category: 'theme',
            snapshotCount: 2029,
            snapshotAt: null,
            sortOrder: 1,
            chips: [],
          },
        ]}
        loading={false}
        loadError={false}
        stats={null}
        isRoom={false}
        watchedListLinked={true}
      />,
    );

    expect(screen.queryByRole('button', { name: /hits faciles/i })).not.toBeInTheDocument();
  });

  it('shows the AniList down message when the watched overlay is empty because the API failed', () => {
    render(
      <PlaylistPicker
        config={{ ...baseConfig, playlistId: 'p-shonen', playlistWatched: true }}
        update={() => {}}
        playlists={packs}
        loading={false}
        loadError={false}
        stats={{
          playlistId: 'p-shonen',
          snapshotCount: 40,
          filteredCount: 20,
          playableSongs: 0,
          animeCount: 0,
          distinctNames: 0,
          soundCount: 20,
          insufficient: true,
          packInsufficient: false,
          staleDropped: 0,
          playlistWatched: true,
          listError: 'anilist_blocked',
        }}
        isRoom={false}
        watchedListLinked={true}
      />,
    );

    expect(screen.getByText(/API AniList est down/i)).toBeInTheDocument();
  });

  it('hides Union/Commun on overlay while creating a salon', () => {
    render(
      <PlaylistPicker
        config={{ ...baseConfig, playlistId: 'p-shonen', playlistWatched: true }}
        update={() => {}}
        playlists={packs}
        loading={false}
        loadError={false}
        stats={null}
        isRoom
        currentPlayersCount={0}
        watchedListLinked
      />,
    );

    expect(screen.queryByText(/mode de fusion/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Union')).not.toBeInTheDocument();
    expect(screen.queryByText('Commun')).not.toBeInTheDocument();
  });

  it('shows Union/Commun on overlay once two humans are in the salon', () => {
    render(
      <PlaylistPicker
        config={{ ...baseConfig, playlistId: 'p-shonen', playlistWatched: true }}
        update={() => {}}
        playlists={packs}
        loading={false}
        loadError={false}
        stats={null}
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
