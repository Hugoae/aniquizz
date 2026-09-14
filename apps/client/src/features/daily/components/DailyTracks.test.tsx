import { renderWithProviders as render } from '@/test/renderWithProviders';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { DailyTracks } from './DailyTracks';
import { DailyQuizCard } from '@/features/hub/components/DailyQuizCard';

vi.mock('@/lib/dailyApi', () => ({
  dailyApi: {
    peekToday: vi.fn().mockReturnValue(null),
    today: vi.fn().mockResolvedValue({
      status: 'available',
      roundCount: 5,
      challengeNumber: 1,
      result: null,
      openAttemptId: null,
    }),
  },
}));

describe('DailyTracks', () => {
  it('exposes progress semantics without relying on color alone', () => {
    render(<DailyTracks tracks={['correct', 'wrong', 'pending', 'empty', 'voided']} />);
    expect(screen.getByRole('img', { name: /son 1 Trouvé/i })).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

describe('DailyQuizCard', () => {
  it('links to the daily route', async () => {
    render(
      <MemoryRouter>
        <DailyQuizCard />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /quiz du jour/i });
    expect(link).toHaveAttribute('href', '/daily');
    expect(await screen.findByText('#1')).toBeInTheDocument();
    expect(screen.getByText('QCM')).toBeInTheDocument();
  });
});
