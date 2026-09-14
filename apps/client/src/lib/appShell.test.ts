import { describe, expect, it } from 'vitest';
import { findHomePlayCta } from './appShell';

describe('findHomePlayCta', () => {
  it('prefers the /play link over a Jouer button (middle-clickable CTA)', () => {
    const root = document.createElement('div');
    root.innerHTML = `<a href="/play">Jouer</a><button type="button">Jouer</button>`;
    expect(findHomePlayCta(root)?.tagName).toBe('A');
  });

  it('falls back to a button whose label includes Jouer', () => {
    const root = document.createElement('div');
    root.innerHTML = `<button type="button">Jouer</button>`;
    expect(findHomePlayCta(root)?.tagName).toBe('BUTTON');
  });
});
