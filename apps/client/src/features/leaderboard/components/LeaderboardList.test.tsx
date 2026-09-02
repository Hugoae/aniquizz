import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { LeaderboardEntry } from '@aniquizz/shared';
import { LeaderboardList } from './LeaderboardList';
import { LeaderboardPodium } from './LeaderboardPodium';
import { LeaderboardYouStrip } from './LeaderboardYouStrip';
import { profileFromLeaderboardState } from '@/features/leaderboard/lib/leaderboardNavigation';
import { AuthModalProvider } from '@/features/auth/context/AuthModalContext';

const xpEntry = (id: string, rank: number, username: string): LeaderboardEntry => ({
  metric: 'xp',
  rank,
  id,
  username,
  avatar: 'default_avatar.png',
  level: 4,
  xp: 400,
});

describe('LeaderboardList', () => {
  it('marks the viewer row and exposes buttons for profile navigation', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <LeaderboardList
        entries={[xpEntry('a', 1, 'Ada'), xpEntry('me', 2, 'Moi')]}
        viewerId="me"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText('Vous')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Ada/i }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    expect(screen.queryByText('Niveau 4')).not.toBeInTheDocument();
    expect(screen.getAllByText('400 XP')).toHaveLength(2);
  });

  it('renders profile links that are keyboard-focusable', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LeaderboardList
          entries={[xpEntry('a', 4, 'Ada')]}
          hrefFor={(entry) => `/profile/${entry.id}?from=leaderboard&metric=xp`}
          linkState={profileFromLeaderboardState('xp')}
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /Ada/i });
    expect(link).toHaveAttribute('href', '/profile/a?from=leaderboard&metric=xp');
    await user.tab();
    expect(link).toHaveFocus();
  });
});

describe('LeaderboardPodium', () => {
  it('shows the tied count when a rank group is larger than the sample', () => {
    render(
      <LeaderboardPodium
        groups={[
          {
            rank: 1,
            count: 5,
            entries: [xpEntry('a', 1, 'Ada'), xpEntry('b', 1, 'Bea')],
          },
        ]}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText(/Ex-aequo/)).toBeInTheDocument();
    expect(screen.getByText('+3 ex-aequo')).toBeInTheDocument();
    expect(screen.queryByText('Voir le profil')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ada/i })).toBeInTheDocument();
  });
});

describe('LeaderboardYouStrip', () => {
  it('asks visitors to log in and explains the accuracy gate', () => {
    const { rerender } = render(
      <AuthModalProvider>
        <LeaderboardYouStrip
          viewer={null}
          session={false}
          visibleIds={new Set()}
          onSelect={() => undefined}
        />
      </AuthModalProvider>,
    );
    expect(screen.getByText(/Connectez-vous pour voir votre rang/)).toBeInTheDocument();

    rerender(
      <AuthModalProvider>
        <LeaderboardYouStrip
          viewer={{ status: 'ineligible', totalGuesses: 10, requiredGuesses: 50 }}
          session
          visibleIds={new Set()}
          onSelect={() => undefined}
        />
      </AuthModalProvider>,
    );
    expect(screen.getByText(/Encore 40 manches/)).toBeInTheDocument();
  });

  it('shows the viewer when they are outside the visible top', () => {
    render(
      <AuthModalProvider>
        <LeaderboardYouStrip
          viewer={{ status: 'ranked', page: 2, entry: xpEntry('me', 26, 'Moi') }}
          session
          visibleIds={new Set(['a'])}
          onSelect={() => undefined}
        />
      </AuthModalProvider>,
    );
    expect(screen.getByText(/Hors du top 25/)).toBeInTheDocument();
    expect(screen.getByText('Moi')).toBeInTheDocument();
  });
});
