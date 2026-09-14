import { MemoryRouter } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/renderWithProviders';
import { GAME_COPY } from '@/features/game/copy/gameCopy';
import { MissingGameRoom } from './MissingGameRoom';

describe('MissingGameRoom', () => {
  it('links back to the hub with a real anchor', () => {
    renderWithProviders(
      <MemoryRouter>
        <MissingGameRoom />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: GAME_COPY.missingRoom.cta });
    expect(link).toHaveAttribute('href', '/play');
    expect(GAME_COPY.missingRoom.body).toMatch(/Revenez/);
  });
});
