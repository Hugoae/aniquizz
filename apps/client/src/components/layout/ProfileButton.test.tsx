import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AUTH_COPY } from '@/features/auth/copy/authCopy';
import { ProfileButton } from './ProfileButton';

describe('ProfileButton', () => {
  it('shows the XP level from xp when the profile loaded', () => {
    render(<ProfileButton username="Ada" xp={0} />);
    expect(screen.getByRole('button', { name: 'Profil de Ada, niveau 1' })).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('does not render a fake level-1 ring when Profile SELECT failed', () => {
    render(
      <ProfileButton
        username="Ada"
        xp={0}
        degraded
        label={AUTH_COPY.profileUnavailable}
        chipTitle={AUTH_COPY.profileUnavailableHint}
      />,
    );
    expect(screen.getByRole('button', { name: AUTH_COPY.profileUnavailable })).toBeInTheDocument();
    expect(screen.getByText(AUTH_COPY.profileUnavailable)).toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});
