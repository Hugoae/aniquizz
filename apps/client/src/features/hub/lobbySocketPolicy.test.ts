import { describe, expect, it } from 'vitest';
import {
  isLobbyJoinRejectedMessage,
  resolveLobbyJoinedKind,
  shouldPollHubHomeStats,
  shouldRejoinLobbyOnConnect,
} from './lobbySocketPolicy';

describe('shouldRejoinLobbyOnConnect', () => {
  it('rejoins a waiting lobby after the socket is replaced', () => {
    expect(shouldRejoinLobbyOnConnect('A3K9ZQ', 'waiting')).toBe(true);
    expect(shouldRejoinLobbyOnConnect('A3K9ZQ', 'playing')).toBe(false);
    expect(shouldRejoinLobbyOnConnect('A3K9ZQ', 'starting')).toBe(false);
    expect(shouldRejoinLobbyOnConnect('', 'waiting')).toBe(false);
  });
});

describe('isLobbyJoinRejectedMessage', () => {
  it('matches join failures without catching start-game “en cours” copy', () => {
    expect(isLobbyJoinRejectedMessage('La partie est déjà en cours.')).toBe(true);
    expect(isLobbyJoinRejectedMessage('Salon introuvable.')).toBe(true);
    expect(isLobbyJoinRejectedMessage('Le salon est complet.')).toBe(true);
    expect(isLobbyJoinRejectedMessage('Préparation de la partie en cours')).toBe(false);
  });
});

describe('resolveLobbyJoinedKind', () => {
  it('treats host reconnect to the same room as a join, not a create', () => {
    expect(resolveLobbyJoinedKind({ isHost: true, isSameRoom: false })).toBe('created');
    expect(resolveLobbyJoinedKind({ isHost: true, isSameRoom: true })).toBe('joined');
    expect(resolveLobbyJoinedKind({ isHost: false, isSameRoom: false })).toBe('joined');
  });
});

describe('shouldPollHubHomeStats', () => {
  it('polls only the /play mode-select landing', () => {
    expect(shouldPollHubHomeStats('/play', 'modes')).toBe(true);
    expect(shouldPollHubHomeStats('/play', 'lobby')).toBe(false);
    expect(shouldPollHubHomeStats('/play/join', 'modes')).toBe(false);
    expect(shouldPollHubHomeStats('/play/create', 'modes')).toBe(false);
  });
});
