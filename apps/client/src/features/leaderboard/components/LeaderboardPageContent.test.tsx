import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderboardResponse } from '@aniquizz/shared';
import { LeaderboardPageContent } from './LeaderboardPageContent';
import { AuthModalProvider, useAuthModal } from '@/features/auth/context/AuthModalContext';

const authState = vi.hoisted(() => ({
  session: null as { access_token: string } | null,
  profile: null as { id: string } | null,
}));

const boardState = vi.hoisted(() => ({
  loading: false,
  refreshing: false,
}));

vi.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => ({
    session: authState.session,
    profile: authState.profile,
    authReady: true,
  }),
}));

vi.mock('@/features/leaderboard/hooks/useLeaderboard', () => ({
  useLeaderboard: () => ({
    metric: 'xp',
    loading: boardState.loading,
    refreshing: boardState.refreshing,
    error: null,
    setMetric: vi.fn(),
    retry: vi.fn(),
    data: {
      metric: 'xp',
      entries: [
        {
          metric: 'xp',
          rank: 1,
          id: 'player-1',
          username: 'Ada',
          avatar: 'default_avatar.png',
          level: 8,
          xp: 1200,
        },
        {
          metric: 'xp',
          rank: 4,
          id: 'player-4',
          username: 'Bea',
          avatar: 'default_avatar.png',
          level: 3,
          xp: 200,
        },
      ],
      podium: [
        {
          rank: 1,
          count: 1,
          entries: [
            {
              metric: 'xp',
              rank: 1,
              id: 'player-1',
              username: 'Ada',
              avatar: 'default_avatar.png',
              level: 8,
              xp: 1200,
            },
          ],
        },
      ],
      pagination: { page: 1, pageSize: 25, totalItems: 4, totalPages: 1 },
      catalogueSize: 10,
      viewer: null,
    } satisfies LeaderboardResponse,
  }),
}));

vi.mock('@/components/layout/Header', () => ({
  Header: () => <div />,
}));

function AuthProbe() {
  const { showAuthModal } = useAuthModal();
  return showAuthModal ? <div>auth-open</div> : null;
}

describe('LeaderboardPageContent', () => {
  beforeEach(() => {
    authState.session = null;
    authState.profile = null;
    boardState.loading = false;
    boardState.refreshing = false;
  });

  it('opens login when a logged-out visitor selects a player', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthModalProvider>
          <LeaderboardPageContent />
          <AuthProbe />
        </AuthModalProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Ada/i }));
    expect(screen.getByText('auth-open')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /séries/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pokédex/i })).toBeInTheDocument();
    expect(screen.getAllByText('Ada')).toHaveLength(1);
    expect(screen.getByText('Bea')).toBeInTheDocument();
    expect(screen.queryByText('Voir le profil')).not.toBeInTheDocument();
  });

  it('uses profile links when the visitor is signed in', () => {
    authState.session = { access_token: 'token' };
    authState.profile = { id: 'me' };
    render(
      <MemoryRouter>
        <AuthModalProvider>
          <LeaderboardPageContent />
        </AuthModalProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Ada/i })).toHaveAttribute(
      'href',
      '/profile/player-1?from=leaderboard&metric=xp',
    );
  });

  it('marks the board busy while a metric is loading', () => {
    boardState.loading = true;
    const { container } = render(
      <MemoryRouter>
        <AuthModalProvider>
          <LeaderboardPageContent />
        </AuthModalProvider>
      </MemoryRouter>,
    );
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });
});
