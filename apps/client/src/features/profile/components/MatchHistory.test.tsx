import { renderWithProviders as render } from '@/test/renderWithProviders';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { toDailyHistoryEntry } from '@aniquizz/shared';
import { MatchHistory } from './MatchHistory';

describe('MatchHistory', () => {
  it('renders a Quiz du jour card without match points', () => {
    render(
      <MatchHistory
        entries={[
          toDailyHistoryEntry({
            id: 'd1',
            playedAt: new Date().toISOString(),
            challengeNumber: 1,
            correctCount: 4,
            activeRoundCount: 5,
            xpAwarded: 17,
            won: true,
            totalResponseMs: 9400,
            rank: 2,
          }),
        ]}
      />,
    );

    expect(screen.getByText('Quiz du jour')).toBeInTheDocument();
    expect(screen.getByText('Victoire')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('4/5')).toBeInTheDocument();
    expect(screen.getByText('+17')).toBeInTheDocument();
    expect(screen.queryByText(/pts/i)).not.toBeInTheDocument();
  });

  it('labels a lost daily as a defeat', () => {
    render(
      <MatchHistory
        entries={[
          toDailyHistoryEntry({
            id: 'd2',
            playedAt: new Date().toISOString(),
            challengeNumber: 2,
            correctCount: 1,
            activeRoundCount: 5,
            xpAwarded: 8,
            won: false,
            totalResponseMs: 12_000,
          }),
        ]}
      />,
    );

    expect(screen.getByText('Défaite')).toBeInTheDocument();
    expect(screen.getByText('1/5')).toBeInTheDocument();
  });
});
