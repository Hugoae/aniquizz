import { describe, expect, it } from 'vitest';
import {
  resolveAuthenticatedUsername,
  resolveLobbyUsername,
  usernameFromMetadata,
} from './displayUsername';

describe('usernameFromMetadata', () => {
  it('reads username then user_name then name', () => {
    expect(usernameFromMetadata({ username: 'Ada' }, 'Anonyme')).toBe('Ada');
    expect(usernameFromMetadata({ user_name: 'Ada' }, 'Anonyme')).toBe('Ada');
    expect(usernameFromMetadata({ name: 'Ada' }, 'Anonyme')).toBe('Ada');
  });

  it('uses the handshake fallback when metadata is empty', () => {
    expect(usernameFromMetadata({}, 'Guest')).toBe('Guest');
    expect(usernameFromMetadata(undefined, 'Guest')).toBe('Guest');
  });
});

describe('resolveAuthenticatedUsername', () => {
  it('prefers the Profile username after a rename', () => {
    expect(resolveAuthenticatedUsername('NouveauPseudo', 'OldSignupName')).toBe('NouveauPseudo');
  });

  it('keeps metadata when Profile has no username yet', () => {
    expect(resolveAuthenticatedUsername(null, 'SignupName')).toBe('SignupName');
    expect(resolveAuthenticatedUsername('   ', 'SignupName')).toBe('SignupName');
  });
});

describe('resolveLobbyUsername', () => {
  it('ignores the client-sent name once the socket is authenticated', () => {
    expect(resolveLobbyUsername(true, 'Ada', 'Spoofed')).toBe('Ada');
  });

  it('uses the payload name for guests', () => {
    expect(resolveLobbyUsername(false, 'Anonyme', 'GuestNick')).toBe('GuestNick');
    expect(resolveLobbyUsername(false, 'Anonyme', undefined)).toBe('Anonyme');
  });
});
