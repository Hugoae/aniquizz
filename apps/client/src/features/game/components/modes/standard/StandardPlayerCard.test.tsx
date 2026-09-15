import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GamePlayer } from '@aniquizz/shared';
import { renderWithProviders as render } from '@/test/renderWithProviders';
import { StandardPlayerCard } from './StandardPlayerCard';

function makePlayer(overrides: Partial<GamePlayer> = {}): GamePlayer {
  return {
    id: 'p1',
    username: 'Akira',
    avatar: 'player1',
    score: 5,
    streak: 0,
    ...overrides,
  };
}

describe('StandardPlayerCard reveal bubble', () => {
  it('shows the effective answer-type label on the reveal bubble', () => {
    render(
      <StandardPlayerCard
        player={makePlayer({
          currentAnswer: 'Naruto',
          isCorrect: true,
          answerType: 'qcm',
        })}
        showResult
      />,
    );

    expect(screen.getByText('Naruto')).toBeInTheDocument();
    expect(screen.getByText('Carré')).toBeInTheDocument();
    expect(screen.getByTitle('Carré')).toBeInTheDocument();
  });

  it('keeps the guessing Check badge free of answer type', () => {
    render(
      <StandardPlayerCard
        player={makePlayer({
          hasAnswered: true,
          answerType: 'typing',
        })}
      />,
    );

    expect(screen.queryByText('Typing')).not.toBeInTheDocument();
    expect(screen.queryByText('Naruto')).not.toBeInTheDocument();
  });

  it('omits the type icon when the player did not answer', () => {
    render(
      <StandardPlayerCard
        player={makePlayer({
          currentAnswer: null,
          isCorrect: false,
          answerType: null,
        })}
        showResult
      />,
    );

    expect(screen.getByText('…')).toBeInTheDocument();
    expect(screen.queryByText('Typing')).not.toBeInTheDocument();
    expect(screen.queryByText('Carré')).not.toBeInTheDocument();
    expect(screen.queryByText('Duo')).not.toBeInTheDocument();
  });
});
