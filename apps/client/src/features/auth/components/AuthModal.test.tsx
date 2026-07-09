import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthModal } from './AuthModal';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('AuthModal', () => {
  const renderModal = () =>
    render(
      <MemoryRouter>
        <AuthModal open onOpenChange={() => {}} />
      </MemoryRouter>,
    );

  it('renders login form by default', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
  });

  it('switches to signup mode', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /créer un compte/i }));
    expect(screen.getByRole('heading', { name: /inscription/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/pseudo/i)).toBeInTheDocument();
  });

  it('switches to forgot-password mode', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /mot de passe oublié/i }));
    expect(screen.getByRole('heading', { name: /mot de passe oublié/i })).toBeInTheDocument();
  });
});
