import { describe, expect, it } from 'vitest';
import {
  PUBLIC_PROFILE_LOAD_ERROR_EVENT,
  publicProfileLoadErrorMessage,
  unavailablePublicProfileView,
} from './publicProfileLoad';

describe('publicProfileLoad', () => {
  it('uses profile:error so friends:error cannot abort the public view', () => {
    expect(PUBLIC_PROFILE_LOAD_ERROR_EVENT).not.toBe('friends:error');
    expect(PUBLIC_PROFILE_LOAD_ERROR_EVENT).toBe('profile:error');
  });

  it('falls back to a French unavailable message', () => {
    expect(publicProfileLoadErrorMessage(undefined)).toBe('Profil introuvable.');
    expect(publicProfileLoadErrorMessage({ message: 'Profil introuvable.' })).toBe(
      'Profil introuvable.',
    );
  });

  it('builds an unavailable card that keeps the requested id', () => {
    const id = '00000000-0000-4000-8000-deadbeef0001';
    const card = unavailablePublicProfileView(id);
    expect(card.id).toBe(id);
    expect(card.unavailable).toBe(true);
  });
});
