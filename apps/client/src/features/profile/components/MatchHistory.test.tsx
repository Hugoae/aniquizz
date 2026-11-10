import { renderWithProviders as render } from '@/test/renderWithProviders';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { toDailyHistoryEntry, type MatchHistoryEntry } from '@aniquizz/shared';
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
            tracks: ['wrong', 'correct', 'correct', 'correct', 'correct'],
          }),
        ]}
      />,
    );

    expect(screen.getByText('Quiz du jour')).toBeInTheDocument();
    expect(screen.getByText('Victoire')).toHaveClass('text-success');
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /son 1 Raté/ })).toBeInTheDocument();
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

    expect(screen.getByText('Défaite')).toHaveClass('text-destructive');
    expect(screen.queryByRole('img', { name: /Progression/ })).not.toBeInTheDocument();
  });

  it('shows a replay button only when the match stored its rules', () => {
    const entry: MatchHistoryEntry = {
      id: 'm1',
      playedAt: new Date().toISOString(),
      mode: 'EVOLVING',
      kind: 'match',
      answerMode: 'Typing',
      totalRounds: 5,
      score: 14,
      rank: 2,
      isWinner: true,
      correctCount: 3,
      xpEarned: 56,
      playerCount: 4,
      durationMs: 60_000,
      replay: {
        gameType: 'evolving',
        responseType: 'typing',
        soundCount: 20,
        soundTypes: ['opening'],
        difficulty: ['medium'],
        guessDuration: 15,
        soundSelection: 'random',
        precision: 'franchise',
      },
    };
    const onReplay = () => undefined;
    render(
      <MatchHistory
        entries={[
          entry,
          { ...entry, id: 'm2', replay: null },
          {
            ...entry,
            id: 'm3',
            mode: 'STANDARD',
            answerMode: 'QCM',
            playerCount: 1,
            rank: null,
            medal: 'gold',
            difficulties: ['medium', 'hard'],
            replay: null,
          },
        ]}
        onReplay={onReplay}
      />,
    );
    expect(screen.getAllByRole('button', { name: 'Rejouer' })).toHaveLength(1);
    expect(screen.getAllByText('Victoire')[0]).toHaveClass('text-success');
    expect(screen.getAllByLabelText('2e sur 4')).toHaveLength(2);
    expect(screen.queryByText('Typing')).not.toBeInTheDocument();
    expect(screen.getByText('QCM')).toBeInTheDocument();
    expect(screen.getByText('Moyen')).toBeInTheDocument();
    expect(screen.getByText('Difficile')).toBeInTheDocument();
    expect(screen.getByLabelText('Or')).toBeInTheDocument();
  });
});
