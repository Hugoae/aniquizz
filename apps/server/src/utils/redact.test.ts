import { describe, expect, it } from 'vitest';
import { sanitizePayload, summarizeSocketPayload } from './redact';

describe('sanitizePayload', () => {
  it('redacts sensitive keys at any depth, case-insensitively', () => {
    const out = sanitizePayload({
      roomId: 'ABC',
      password: 'hunter2',
      nested: { Token: 'jwt', inner: { apiKey: 'k', keep: 1 } },
    });
    expect(out).toEqual({
      roomId: 'ABC',
      password: '[REDACTED]',
      nested: { Token: '[REDACTED]', inner: { apiKey: '[REDACTED]', keep: 1 } },
    });
  });

  it('redacts the password inside room settings', () => {
    const out = sanitizePayload({ settings: { isPrivate: true, password: 'secret' } });
    expect(out).toEqual({ settings: { isPrivate: true, password: '[REDACTED]' } });
  });

  it('summarizes long arrays and keeps short ones', () => {
    expect(sanitizePayload([1, 2, 3])).toEqual([1, 2, 3]);
    expect(sanitizePayload({ ids: [1, 2, 3, 4, 5, 6] })).toEqual({
      ids: { _summary: 'array', length: 6 },
    });
  });

  it('stops at max depth', () => {
    let deep: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 10; i += 1) deep = { child: deep };
    expect(JSON.stringify(sanitizePayload(deep))).toContain('[max depth]');
  });

  it('serializes errors without losing the message', () => {
    const out = sanitizePayload(new Error('boom')) as { message: string; name: string };
    expect(out.name).toBe('Error');
    expect(out.message).toBe('boom');
  });

  it('passes primitives through', () => {
    expect(sanitizePayload('x')).toBe('x');
    expect(sanitizePayload(null)).toBeNull();
  });
});

describe('summarizeSocketPayload', () => {
  it('never logs the raw anime search query', () => {
    expect(summarizeSocketPayload('anime:search', 'inbound', { query: 'naruto' })).toEqual({
      _summary: 'anime_search',
      queryLength: 6,
    });
  });

  it('summarizes game state sync', () => {
    const out = summarizeSocketPayload('game_state_sync', 'outbound', {
      status: 'playing',
      currentRound: 2,
      totalRounds: 10,
      players: [{}, {}],
    });
    expect(out).toEqual({
      _summary: 'game_state',
      status: 'playing',
      currentRound: 2,
      totalRounds: 10,
      players: 2,
    });
  });

  it('redacts secrets on summarized read events', () => {
    expect(
      summarizeSocketPayload('get_game_state', 'inbound', { roomId: 'ABC', token: 'jwt' }),
    ).toEqual({ _summary: 'get_game_state', roomId: 'ABC', token: '[REDACTED]' });
  });

  it('falls back to sanitization for mutation events', () => {
    expect(
      summarizeSocketPayload('lobby:join', 'inbound', { roomId: 'ABC', password: 'pw' }),
    ).toEqual({ roomId: 'ABC', password: '[REDACTED]' });
  });
});
