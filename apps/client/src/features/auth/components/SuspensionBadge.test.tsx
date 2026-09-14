import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/features/auth/context/AuthContext';
import { SuspensionBadge } from './SuspensionBadge';

vi.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('SuspensionBadge', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not start a 1s interval when the player has no sanction', () => {
    const spy = vi.spyOn(globalThis, 'setInterval');
    vi.mocked(useAuth).mockReturnValue({
      profile: { bannedUntil: null, mutedUntil: null },
    } as never);
    const { container } = render(<SuspensionBadge />);
    expect(container.firstChild).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('shows the ban countdown while a sanction is active', () => {
    vi.mocked(useAuth).mockReturnValue({
      profile: { bannedUntil: new Date(Date.now() + 60_000).toISOString(), mutedUntil: null },
    } as never);
    render(<SuspensionBadge />);
    expect(screen.getByText(/Banni/)).toBeInTheDocument();
  });
});
