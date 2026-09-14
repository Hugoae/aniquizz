import { describe, expect, it } from 'vitest';
import { isRoomListJoinable, roomJoinButtonLabel } from './roomListJoin';

describe('roomJoinButtonLabel', () => {
  it('does not offer spectate on a live match with free seats', () => {
    const playing = { status: 'playing' as const, players: 2, maxPlayers: 8 };
    expect(isRoomListJoinable(playing)).toBe(false);
    expect(roomJoinButtonLabel(playing)).toBe('EN COURS');
  });

  it('labels a waiting open room as joinable', () => {
    const waiting = { status: 'waiting' as const, players: 1, maxPlayers: 8 };
    expect(isRoomListJoinable(waiting)).toBe(true);
    expect(roomJoinButtonLabel(waiting)).toBe('REJOINDRE');
  });

  it('labels a full waiting room as complete', () => {
    const full = { status: 'waiting' as const, players: 8, maxPlayers: 8 };
    expect(roomJoinButtonLabel(full)).toBe('COMPLET');
  });
});
