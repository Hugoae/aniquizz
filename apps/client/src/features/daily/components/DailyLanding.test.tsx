import { renderWithProviders as render } from '@/test/renderWithProviders';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DailyTodayResponse } from '@aniquizz/shared';
import { DailyLanding } from './DailyLanding';

vi.mock('@/lib/dailyApi', () => ({
  dailyApi: {
    leaderboard: vi.fn().mockResolvedValue({
      challengeDate: '2026-09-13',
      participantCount: 0,
      entries: [],
    }),
  },
}));

const baseToday = (overrides: Partial<DailyTodayResponse> = {}): DailyTodayResponse => ({
  challengeId: 'c1',
  challengeDate: '2026-09-13',
  challengeNumber: 12,
  resetsAt: new Date(Date.now() + 3_600_000).toISOString(),
  rulesVersion: 1,
  roundCount: 5,
  guessSeconds: 15,
  revealSeconds: 15,
  available: true,
  status: 'available',
  streak: { current: 3, longest: 8, completions: 10, perfectDays: 1 },
  result: null,
  openAttemptId: null,
  ...overrides,
});

describe('DailyLanding', () => {
  it('confirms one attempt, five rounds, and 15 seconds per answer', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<DailyLanding today={baseToday()} onStart={onStart} onViewResult={() => {}} onLogin={() => {}} />);

    await user.click(screen.getByRole('button', { name: /^commencer$/i }));
    expect(onStart).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/une seule tentative/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/5 manches/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/15 secondes/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/moment aléatoire/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/questions restantes sont fausses/i)).toBeInTheDocument();
    expect(within(dialog).queryByText(/réinitialise/i)).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^commencer$/i }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('uses lobby setting chips for the daily rules', () => {
    render(<DailyLanding today={baseToday()} onStart={() => {}} onViewResult={() => {}} onLogin={() => {}} />);
    expect(screen.getByText('QCM')).toBeInTheDocument();
    expect(screen.getByText('Anime')).toBeInTheDocument();
    expect(screen.getByText('15s')).toBeInTheDocument();
    expect(screen.getByText('Aléatoire')).toBeInTheDocument();
    expect(screen.getByTestId('daily-rule-chips')).toHaveClass('flex-col');
  });

  it('formats the date, shows the flame streak, and hides the record', () => {
    render(<DailyLanding today={baseToday()} onStart={() => {}} onViewResult={() => {}} onLogin={() => {}} />);
    expect(screen.getByText(/réinitialisation dans \d+h \d{2}m/i)).toBeInTheDocument();
    expect(screen.getByText(/13 septembre 2026/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/série 3/i)).toBeInTheDocument();
    expect(screen.queryByText(/record/i)).not.toBeInTheDocument();
  });

  it('opens the recap without a second confirmation', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const onViewResult = vi.fn();
    render(
      <DailyLanding
        today={baseToday({
          status: 'completed',
          result: {
            correctCount: 3,
            activeRoundCount: 5,
            totalResponseMs: 12_000,
            xpAwarded: 14,
            completedAt: new Date().toISOString(),
            tracks: ['correct', 'wrong', 'correct', 'wrong', 'correct'],
            difficulties: ['easy', 'easy', 'medium', 'medium', 'hard'],
            streak: 4,
            recap: [],
          },
        })}
        onStart={onStart}
        onViewResult={onViewResult}
        onLogin={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /voir le résultat/i }));
    expect(onViewResult).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('asks guests to log in', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    render(<DailyLanding today={baseToday({ status: 'guest' })} onStart={() => {}} onViewResult={() => {}} onLogin={onLogin} />);
    await user.click(screen.getByRole('button', { name: /connexion requise/i }));
    expect(onLogin).toHaveBeenCalledOnce();
  });

  it('shows the leaderboard before the player has started', async () => {
    render(<DailyLanding today={baseToday()} onStart={() => {}} onViewResult={() => {}} onLogin={() => {}} />);
    expect(await screen.findByRole('heading', { name: /classement du jour/i })).toBeInTheDocument();
    expect(screen.getByText(/personne n.a encore terminé/i)).toBeInTheDocument();
  });

  it('does not offer start while an abandoned run is still open', () => {
    const onStart = vi.fn();
    const onViewResult = vi.fn();
    render(
      <DailyLanding
        today={baseToday({ status: 'in_progress' })}
        onStart={onStart}
        onViewResult={onViewResult}
        onLogin={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /tentative en cours/i })).toBeDisabled();
    expect(onStart).not.toHaveBeenCalled();
    expect(onViewResult).not.toHaveBeenCalled();
  });
});
