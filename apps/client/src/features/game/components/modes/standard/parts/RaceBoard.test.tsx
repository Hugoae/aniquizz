import { renderWithProviders as render } from '@/test/renderWithProviders';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GamePlayer, RaceBoardEntry } from '@aniquizz/shared';
import { RaceBoard } from './RaceBoard';

vi.mock('@/lib/socket', () => ({
  socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));

const player = (id: string, username: string): GamePlayer => ({
  id,
  username,
  avatar: '',
  score: 0,
  streak: 0,
});

const entry = (
  userId: string,
  foundCount: number,
  heardCount: number,
  remainingMs: number,
  streak = 0,
): RaceBoardEntry => ({
  userId,
  foundCount,
  heardCount,
  skips: 0,
  remainingMs,
  running: false,
  finished: false,
  streak,
});

describe('RaceBoard', () => {
  const players = ['Ada', 'Bea', 'Cio', 'Dan', 'Eve'].map((name, index) =>
    player(`p${index}`, name),
  );

  it('shows the top 4 with rank pills and found / heard, and opens the full ranking', async () => {
    const onOpenRoster = vi.fn();
    render(
      <RaceBoard
        players={players}
        currentUserId="p0"
        onOpenRoster={onOpenRoster}
        board={{
          receivedAt: Date.now(),
          entries: [
            entry('p0', 10, 12, 90_000, 4),
            entry('p1', 10, 15, 80_000),
            entry('p2', 6, 8, 70_000),
            entry('p3', 1, 2, 10_000),
            entry('p4', 1, 4, 60_000),
          ],
        }}
      />,
    );

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('#4')).toBeInTheDocument();
    expect(screen.queryByText('#5')).toBeNull();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.queryByText('Eve')).toBeNull();
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(screen.getByText(/\/ 12/)).toBeInTheDocument();
    expect(screen.getByLabelText('Série de 4')).toBeInTheDocument();
    expect(screen.queryByLabelText('Série de 0')).toBeNull();
    expect(screen.getByText('0:10').className).toContain('text-destructive');

    await userEvent.click(screen.getByRole('button', { name: /voir le classement/i }));
    expect(onOpenRoster).toHaveBeenCalledOnce();
  });
});
