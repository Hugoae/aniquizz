import { describe, expect, it } from 'vitest';
import { GAME_COPY, playerDisconnectedToast, playerLeftMatchToast } from './gameCopy';

describe('gameCopy', () => {
  it('keeps loading and leave dialogs French and isolated', () => {
    expect(GAME_COPY.loading.title).toBe('CHARGEMENT...');
    expect(GAME_COPY.loading.headphones).toMatch(/écouteurs/);
    expect(GAME_COPY.leaveMatch.title).toBe('Quitter le match ?');
    expect(GAME_COPY.leaveSalon.title).toBe('Quitter le salon ?');
    expect(GAME_COPY.missingRoom.cta).toBe('Retour au hub');
  });

  it('uses vousvoiement in loading, leave, and missing-room copy', () => {
    expect(GAME_COPY.missingRoom.body).toMatch(/Revenez/);
    expect(GAME_COPY.loading.headphones).toMatch(/Préparez vos/);
    expect(GAME_COPY.leaveMatch.returnLobbyBody).toMatch(/vous quittez/);
    expect(GAME_COPY.leaveSalon.profile).toMatch(/Vous quitterez/);
    expect(GAME_COPY.leaveSalon.profile).not.toMatch(/\bta\b/);
  });

  it('interpolates presence toasts without tu', () => {
    expect(playerDisconnectedToast('Akira')).toBe("Akira s'est déconnecté.");
    expect(playerLeftMatchToast('Akira')).toBe('Akira a quitté la partie.');
  });
});
