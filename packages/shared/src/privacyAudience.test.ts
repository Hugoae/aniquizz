import { describe, expect, it } from 'vitest';
import {
  canSendLobbyInvite,
  canViewAudience,
  normalizeAccountPrivacy,
  ACCOUNT_PRIVACY_DEFAULTS,
} from './privacyAudience';

describe('canViewAudience', () => {
  it('lets self see every audience, including nobody', () => {
    expect(canViewAudience('everyone', 'self')).toBe(true);
    expect(canViewAudience('friends', 'self')).toBe(true);
    expect(canViewAudience('nobody', 'self')).toBe(true);
  });

  it('hides every audience from a blocked viewer', () => {
    expect(canViewAudience('everyone', 'blocked')).toBe(false);
    expect(canViewAudience('friends', 'blocked')).toBe(false);
    expect(canViewAudience('nobody', 'blocked')).toBe(false);
  });

  it('applies everyone / friends / nobody for friend and stranger', () => {
    expect(canViewAudience('everyone', 'friend')).toBe(true);
    expect(canViewAudience('everyone', 'stranger')).toBe(true);
    expect(canViewAudience('friends', 'friend')).toBe(true);
    expect(canViewAudience('friends', 'stranger')).toBe(false);
    expect(canViewAudience('nobody', 'friend')).toBe(false);
    expect(canViewAudience('nobody', 'stranger')).toBe(false);
  });
});

describe('canSendLobbyInvite', () => {
  it('allows accepted friends only when the target chose Friends', () => {
    expect(canSendLobbyInvite('friends', 'friend')).toBe(true);
    expect(canSendLobbyInvite('nobody', 'friend')).toBe(false);
    expect(canSendLobbyInvite('friends', 'stranger')).toBe(false);
    expect(canSendLobbyInvite('friends', 'blocked')).toBe(false);
    expect(canSendLobbyInvite('friends', 'self')).toBe(false);
  });
});

describe('normalizeAccountPrivacy', () => {
  it('fills defaults and rejects an everyone invite audience', () => {
    expect(normalizeAccountPrivacy(null)).toEqual(ACCOUNT_PRIVACY_DEFAULTS);
    expect(normalizeAccountPrivacy({ lobbyInviteAudience: 'everyone' }).lobbyInviteAudience).toBe(
      'friends',
    );
    expect(
      normalizeAccountPrivacy({
        onlineStatusAudience: 'nobody',
        matchHistoryAudience: 'friends',
        lobbyInviteAudience: 'nobody',
        showFavoriteSongs: false,
      }),
    ).toEqual({
      ...ACCOUNT_PRIVACY_DEFAULTS,
      onlineStatusAudience: 'nobody',
      matchHistoryAudience: 'friends',
      lobbyInviteAudience: 'nobody',
      showFavoriteSongs: false,
    });
  });
});
