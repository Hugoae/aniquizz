import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConfigPoolCard } from './ConfigPoolCard';

describe('ConfigPoolCard', () => {
  it('does not announce a unit while the count is still loading', () => {
    render(<ConfigPoolCard preview={{ songs: null, animes: null, loading: true }} />);
    expect(screen.queryByText('sons')).not.toBeInTheDocument();
    expect(screen.queryByText('animes')).not.toBeInTheDocument();
    expect(screen.getByText('Analyse…')).toBeInTheDocument();
  });

  it('shows the unit next to a resolved count', () => {
    render(<ConfigPoolCard preview={{ songs: 12, animes: 1, loading: false }} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('sons')).toBeInTheDocument();
    expect(screen.getByText('anime')).toBeInTheDocument();
  });
});
