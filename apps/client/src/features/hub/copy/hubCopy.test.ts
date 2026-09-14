import { describe, expect, it } from 'vitest';
import { HUB_COPY, multiplayerTeaser, soloRoomName } from './hubCopy';

describe('hubCopy', () => {
  it('names a solo room in French', () => {
    expect(soloRoomName('Akira')).toBe('Solo de Akira');
  });

  it('keeps hub CTAs French and isolated', () => {
    expect(HUB_COPY.reset).toBe('Réinitialiser');
    expect(HUB_COPY.passwordDialog.description).toMatch(/mot de passe du salon/i);
    expect(HUB_COPY.room.inProgress).toBe('EN COURS');
    expect(HUB_COPY.room.join).toBe('REJOINDRE');
  });

  it('uses vousvoiement in SEO and toasts', () => {
    expect(HUB_COPY.seo.playDescription).toMatch(/Configurez votre/);
    expect(HUB_COPY.seo.playDescription).not.toMatch(/Configure ta/);
    expect(HUB_COPY.toasts.youAreHost).toMatch(/Vous êtes/);
    expect(HUB_COPY.toasts.missingRoom).toMatch(/Revenez/);
  });

  it('pluralizes the live multiplayer teaser', () => {
    expect(multiplayerTeaser(1)).toBe('1 joueur en multijoueur');
    expect(multiplayerTeaser(3)).toBe('3 joueurs en multijoueur');
  });
});
