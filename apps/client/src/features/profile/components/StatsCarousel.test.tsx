import { render, screen } from '@testing-library/react';
import { Circle } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { StatsCarousel, type StatItem } from './StatsCarousel';

function items(n: number): StatItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    icon: Circle,
    label: `Stat ${i}`,
    value: i,
    color: 'text-primary',
  }));
}

describe('StatsCarousel', () => {
  it('marks only the active page as current', () => {
    render(<StatsCarousel items={items(9)} />);
    const pages = screen.getAllByRole('button', { name: /Page \d/ });
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0]).toHaveAttribute('aria-current', 'page');
    for (const btn of pages.slice(1)) {
      expect(btn).not.toHaveAttribute('aria-current');
    }
  });
});
