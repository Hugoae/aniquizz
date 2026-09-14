import { describe, expect, it } from 'vitest';
import {
  canKickFromLobby,
  evaluateLobbyJoin,
  isLobbyOpenForNewPlayers,
  isRoomListJoinable,
} from './lobbyJoin';

describe('isLobbyOpenForNewPlayers', () => {
  it('allows new seats only while waiting', () => {
    expect(isLobbyOpenForNewPlayers('waiting')).toBe(true);
    expect(isLobbyOpenForNewPlayers('starting')).toBe(false);
    expect(isLobbyOpenForNewPlayers('playing')).toBe(false);
    expect(isLobbyOpenForNewPlayers('paused')).toBe(false);
    expect(isLobbyOpenForNewPlayers('finished')).toBe(false);
  });
});

describe('isRoomListJoinable', () => {
  it('requires a waiting room with a free seat', () => {
    expect(isRoomListJoinable({ status: 'waiting', players: 2, maxPlayers: 8 })).toBe(true);
    expect(isRoomListJoinable({ status: 'waiting', players: 8, maxPlayers: 8 })).toBe(false);
    expect(isRoomListJoinable({ status: 'playing', players: 2, maxPlayers: 8 })).toBe(false);
  });
});

const openPublic = {
  roomFound: true,
  isReturning: false,
  isPrivate: false,
  storedPassword: '',
  playerCount: 2,
  maxPlayers: 8,
  status: 'waiting' as const,
};

describe('evaluateLobbyJoin', () => {
  it('rejects a missing room before any other check', () => {
    expect(evaluateLobbyJoin({ ...openPublic, roomFound: false })).toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it('lets a returning player in even when the match is live or the room is private', () => {
    expect(
      evaluateLobbyJoin({
        ...openPublic,
        isReturning: true,
        isPrivate: true,
        storedPassword: 'secret',
        status: 'playing',
        playerCount: 8,
      }),
    ).toEqual({ ok: true });
  });

  it('still requires the password on a private room (invites are not a bypass)', () => {
    expect(
      evaluateLobbyJoin({
        ...openPublic,
        isPrivate: true,
        storedPassword: 'secret',
      }),
    ).toEqual({ ok: false, reason: 'password-required' });
    expect(
      evaluateLobbyJoin({
        ...openPublic,
        isPrivate: true,
        storedPassword: 'secret',
        providedPassword: 'nope',
      }),
    ).toEqual({ ok: false, reason: 'bad-password' });
    expect(
      evaluateLobbyJoin({
        ...openPublic,
        isPrivate: true,
        storedPassword: 'secret',
        providedPassword: 'secret',
      }),
    ).toEqual({ ok: true });
  });

  it('rejects a full waiting room and a live match with free seats', () => {
    expect(evaluateLobbyJoin({ ...openPublic, playerCount: 8 })).toEqual({
      ok: false,
      reason: 'full',
    });
    expect(evaluateLobbyJoin({ ...openPublic, status: 'playing' })).toEqual({
      ok: false,
      reason: 'in-progress',
    });
  });
});

describe('canKickFromLobby', () => {
  it('allows the host to kick another player only while waiting', () => {
    expect(
      canKickFromLobby({
        actorIsHost: true,
        hostId: 'host',
        targetId: 'guest',
        status: 'waiting',
      }),
    ).toBe(true);
    expect(
      canKickFromLobby({
        actorIsHost: true,
        hostId: 'host',
        targetId: 'guest',
        status: 'playing',
      }),
    ).toBe(false);
  });

  it('rejects self-kick and non-host actors', () => {
    expect(
      canKickFromLobby({
        actorIsHost: true,
        hostId: 'host',
        targetId: 'host',
        status: 'waiting',
      }),
    ).toBe(false);
    expect(
      canKickFromLobby({
        actorIsHost: false,
        hostId: 'host',
        targetId: 'guest',
        status: 'waiting',
      }),
    ).toBe(false);
  });
});
