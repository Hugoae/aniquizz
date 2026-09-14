import { describe, expect, it } from 'vitest';
import { PROFILE_COPY } from './profileCopy';

const TU_MARKERS = /\b(tu|ton|ta|tes|t’|t')\b|saisis ton|utilise le/i;

function collectCopy(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') {
    try {
      return [String((value as (...args: never[]) => unknown)(...(['Akira'] as never[])))];
    } catch {
      return [];
    }
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectCopy);
  }
  return [];
}

describe('profileCopy', () => {
  it('keeps favorites and delete copy French and isolated', () => {
    expect(PROFILE_COPY.favoriteSongsTitle).toBe('Titres favoris');
    expect(PROFILE_COPY.deleteTitle).toBe('Supprimer mon compte');
    expect(PROFILE_COPY.pokedexTitle).toBe('Pokédex Musical');
  });

  it('uses vousvoiement in session, delete, watchlist, and pin copy', () => {
    expect(PROFILE_COPY.sessionStillActive).toMatch(/Votre session/);
    expect(PROFILE_COPY.sessionStillActive).toMatch(/Réessayez/);
    expect(PROFILE_COPY.deleteBody).toMatch(/votre profil/);
    expect(PROFILE_COPY.deleteConfirmLead).toMatch(/Saisissez votre/);
    expect(PROFILE_COPY.customizeHint).toMatch(/Choisissez/);
    expect(PROFILE_COPY.customizeMaxReached(5)).toMatch(/Vous ne pouvez/);
    expect(PROFILE_COPY.watchlistAnilistHint).toMatch(/Utilisez/);
    expect(PROFILE_COPY.watchlistMalHint).toMatch(/Utilisez/);
  });

  it('does not mix tu into isolated profile strings', () => {
    const samples = [
      PROFILE_COPY.sessionStillActive,
      PROFILE_COPY.deleteBody,
      PROFILE_COPY.deleteConfirmLead,
      PROFILE_COPY.deleteTimeout,
      PROFILE_COPY.customizeHint,
      PROFILE_COPY.watchlistAnilistHint,
      PROFILE_COPY.watchlistMalHint,
    ];
    for (const sample of samples) {
      expect(sample).not.toMatch(TU_MARKERS);
    }
  });

  it('walks the copy table without leftover tu forms', () => {
    for (const sample of collectCopy(PROFILE_COPY)) {
      expect(sample).not.toMatch(/\bTa session\b/);
      expect(sample).not.toMatch(/Saisis ton/);
      expect(sample).not.toMatch(/^Utilise le/);
    }
  });
});
