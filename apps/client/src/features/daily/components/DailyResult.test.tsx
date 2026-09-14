import { renderWithProviders as render } from '@/test/renderWithProviders';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DailyResultDto } from '@aniquizz/shared';
import { DailyResult } from './DailyResult';

vi.mock('@/features/game/components/modes/standard/gameover/ConfettiLayer', () => ({
  ConfettiLayer: () => null,
}));

const result: DailyResultDto = {
  correctCount: 3,
  activeRoundCount: 5,
  totalResponseMs: 12_000,
  xpAwarded: 14,
  completedAt: new Date().toISOString(),
  tracks: ['correct', 'wrong', 'correct', 'wrong', 'correct'],
  difficulties: ['easy', 'easy', 'medium', 'medium', 'hard'],
  streak: 4,
  recap: [
    { position: 1, songId: 11, anime: 'Naruto', title: 'OP1', artist: 'A', typeLabel: 'OP1', isCorrect: true, voided: false, selectedLabel: 'Naruto' },
    { position: 2, songId: 12, anime: 'Bleach', title: 'OP1', artist: 'A', typeLabel: 'OP1', isCorrect: false, voided: false, selectedLabel: 'One Piece' },
    { position: 3, songId: 13, anime: 'One Piece', title: 'OP1', artist: 'A', typeLabel: 'OP1', isCorrect: true, voided: false, selectedLabel: 'One Piece' },
    { position: 4, songId: 14, anime: 'HxH', title: 'ED1', artist: 'A', typeLabel: 'ED1', isCorrect: false, voided: false, selectedLabel: null },
    { position: 5, songId: 15, anime: 'YYH', title: 'OP1', artist: 'A', typeLabel: 'OP1', isCorrect: true, voided: false, selectedLabel: 'YYH' },
  ],
};

function renderResult(overrides: Partial<DailyResultDto> = {}) {
  const onBack = vi.fn();
  render(
    <DailyResult
      result={{ ...result, ...overrides }}
      username="Kirikou"
      avatar=""
      onBack={onBack}
    />,
  );
  return { onBack };
}

describe('DailyResult', () => {
  it('mirrors the solo recap chrome with a victory from 3/5', async () => {
    const user = userEvent.setup();
    const { onBack } = renderResult();

    expect(screen.getByRole('heading', { name: /victoire/i })).toBeInTheDocument();
    expect(screen.getByText('JOUR')).toBeInTheDocument();
    expect(screen.getByText(/détail de la partie/i)).toBeInTheDocument();
    expect(screen.getByText(/naruto/i)).toBeInTheDocument();
    expect(screen.getByText(/votre réponse/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/temps 12\.0s/i)).toBeInTheDocument();
    expect(screen.getByText('12,0')).toBeInTheDocument();
    expect(screen.getByText('+14 XP')).toBeInTheDocument();
    expect(screen.getByText('KI')).toBeInTheDocument();
    expect(screen.queryByText('+2')).not.toBeInTheDocument();
    expect(screen.queryByText('Récap')).not.toBeInTheDocument();
    expect(screen.queryByText('Or')).not.toBeInTheDocument();
    expect(screen.queryByText('Platine')).not.toBeInTheDocument();
    expect(screen.queryByText(/classement du jour/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /partager/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /rejouer/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^retour$/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('shows a defeat below the 3-song threshold', () => {
    renderResult({
      correctCount: 2,
      tracks: ['correct', 'wrong', 'correct', 'wrong', 'wrong'],
    });

    expect(screen.getByRole('heading', { name: /défaite/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /victoire/i })).not.toBeInTheDocument();
  });
});
