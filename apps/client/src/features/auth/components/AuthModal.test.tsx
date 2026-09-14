import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AUTH_COPY } from '@/features/auth/copy/authCopy';
import { supabase } from '@/lib/supabase';
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
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
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

  it('rejects a weak signup password without calling signUp', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /créer un compte/i }));
    await user.type(screen.getByLabelText(/pseudo/i), 'Ada');
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'weakpass');
    await user.click(screen.getByRole('button', { name: /s'inscrire/i }));
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
    expect(screen.getByText(AUTH_COPY.passwordInvalid)).toBeInTheDocument();
  });

  it('toasts isolated login copy on success', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');
    renderModal();
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'Abcdef1!');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));
    expect(toast.success).toHaveBeenCalledWith(AUTH_COPY.modal.login.toast);
  });

  it('maps Invalid login credentials to French', async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    } as never);
    renderModal();
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'Abcdef1!');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));
    expect(await screen.findByText(AUTH_COPY.errors.invalidLogin)).toBeInTheDocument();
  });
});
