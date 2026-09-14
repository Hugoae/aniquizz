import { describe, expect, it } from 'vitest';
import { HOME_COPY } from './homeCopy';

describe('HOME_COPY', () => {
  it('advertises a 3000+ playable catalogue', () => {
    expect(HOME_COPY.eyebrow).toMatch(/3\u00a0000 sons jouables/);
  });

  it('advertises a free, ad-free anime-from-music pitch', () => {
    expect(HOME_COPY.sub).toMatch(/anime à partir de la musique/i);
    expect(HOME_COPY.sub).toMatch(/sans pubs/i);
    expect(HOME_COPY.sub).toMatch(/gratuit/i);
  });

  it('keeps landing CTAs in the copy module', () => {
    expect(HOME_COPY.play).toBe('Jouer');
    expect(HOME_COPY.library).toBe('Librairie');
    expect(HOME_COPY.leaderboard).toBe('Classement');
    expect(HOME_COPY.ideas).toBe('Idées');
  });
});
