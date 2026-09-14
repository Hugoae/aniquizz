import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  it('stays fixed above the header instead of using sr-only at the origin', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'Aller au contenu principal' });
    expect(link.className).toMatch(/fixed/);
    expect(link.className).toMatch(/z-\[200\]/);
    expect(link.className).not.toMatch(/sr-only/);
  });
});
