import { describe, expect, it } from 'vitest';
import { hiddenPresence, redactPresence, unavailablePublicProfile } from './privacyRedaction';

describe('privacyRedaction', () => {
  it('returns an explicit hidden presence without room metadata', () => {
    expect(hiddenPresence()).toEqual({
      status: 'hidden',
      roomId: null,
      roomName: null,
      joinable: false,
    });
  });

  it('keeps real presence when the audience allows it', () => {
    const live = { status: 'in_lobby' as const, roomId: 'r1', roomName: 'Salon', joinable: true };
    expect(redactPresence(live, true)).toEqual(live);
  });

  it('strips room fields instead of faking offline', () => {
    const live = { status: 'in_game' as const, roomId: 'r1', roomName: 'Salon', joinable: false };
    expect(redactPresence(live, false)).toEqual({
      status: 'hidden',
      roomId: null,
      roomName: null,
      joinable: false,
    });
  });

  it('builds a generic unavailable public profile', () => {
    const stub = unavailablePublicProfile('user-1');
    expect(stub.unavailable).toBe(true);
    expect(stub.id).toBe('user-1');
    expect(stub.username).toBe('');
    expect(stub.history).toEqual([]);
    expect(stub.historyRedacted).toBe(true);
    expect(stub.status).toBe('hidden');
  });
});
