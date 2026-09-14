import { afterEach, describe, expect, it } from 'vitest';
import { consumeIpRateLimit, RATE_LIMITS, resetIpRateLimitForTests } from './guards';

describe('consumeIpRateLimit', () => {
  afterEach(() => {
    resetIpRateLimitForTests();
  });

  it('allows the first joinLobby window then blocks extra hits from the same IP', () => {
    const rule = RATE_LIMITS.joinLobby;
    for (let i = 0; i < rule.points; i++) {
      expect(consumeIpRateLimit('203.0.113.10', 'lobby:join', rule)).toBe(false);
    }
    expect(consumeIpRateLimit('203.0.113.10', 'lobby:join', rule)).toBe(true);
  });

  it('keeps a separate bucket per IP', () => {
    const rule = RATE_LIMITS.joinLobby;
    for (let i = 0; i < rule.points; i++) {
      consumeIpRateLimit('203.0.113.10', 'lobby:join', rule);
    }
    expect(consumeIpRateLimit('203.0.113.11', 'lobby:join', rule)).toBe(false);
  });

  it('caps startGame at 5 hits per 10s window', () => {
    const rule = RATE_LIMITS.startGame;
    expect(rule.points).toBe(5);
    expect(rule.durationMs).toBe(10_000);
    for (let i = 0; i < rule.points; i++) {
      expect(consumeIpRateLimit('203.0.113.10', 'start_game', rule)).toBe(false);
    }
    expect(consumeIpRateLimit('203.0.113.10', 'start_game', rule)).toBe(true);
  });

  it('caps vote actions at 8 hits per 5s window', () => {
    const rule = RATE_LIMITS.vote;
    expect(rule.points).toBe(8);
    expect(rule.durationMs).toBe(5_000);
    for (let i = 0; i < rule.points; i++) {
      expect(consumeIpRateLimit('203.0.113.10', 'vote_pause', rule)).toBe(false);
    }
    expect(consumeIpRateLimit('203.0.113.10', 'vote_pause', rule)).toBe(true);
  });
});
