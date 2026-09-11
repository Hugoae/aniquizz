import { describe, expect, it } from 'vitest';
import { HOME_COPY } from './homeCopy';

describe('HOME_COPY', () => {
  it('advertises a 3000+ playable catalogue', () => {
    expect(HOME_COPY.eyebrow).toMatch(/3\u00a0000 sons jouables/);
  });

  it('names openings and endings in the hero subtitle', () => {
    expect(HOME_COPY.sub).toMatch(/opening/i);
    expect(HOME_COPY.sub).toMatch(/ending/i);
  });
});
