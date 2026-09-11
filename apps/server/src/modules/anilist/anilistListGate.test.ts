import { describe, expect, it } from 'vitest';
import {
  AnilistListGate,
  ANILIST_INITIAL_BACKOFF_MS,
  isAnilistIpBlockStatus,
  isAnilistOutageStatus,
  isAnilistUnavailableStatus,
} from './anilistListGate';

describe('isAnilistIpBlockStatus', () => {
  it('treats 403 and 429 as IP / rate-limit blocks', () => {
    expect(isAnilistIpBlockStatus(403)).toBe(true);
    expect(isAnilistIpBlockStatus(429)).toBe(true);
    expect(isAnilistIpBlockStatus(404)).toBe(false);
    expect(isAnilistIpBlockStatus(500)).toBe(false);
  });
});

describe('isAnilistUnavailableStatus', () => {
  it('treats 403, 429 and 5xx as AniList-side failures', () => {
    expect(isAnilistUnavailableStatus(403)).toBe(true);
    expect(isAnilistUnavailableStatus(429)).toBe(true);
    expect(isAnilistOutageStatus(500)).toBe(true);
    expect(isAnilistUnavailableStatus(502)).toBe(true);
    expect(isAnilistUnavailableStatus(503)).toBe(true);
    expect(isAnilistUnavailableStatus(404)).toBe(false);
    expect(isAnilistUnavailableStatus(400)).toBe(false);
    expect(isAnilistUnavailableStatus(undefined)).toBe(false);
  });
});

describe('AnilistListGate', () => {
  it('serves the last success after an outage instead of emptying the pool', () => {
    const gate = new AnilistListGate();
    gate.rememberSuccess('Kirikou', [1, 2, 3], 1_000);
    const blocked = gate.onUnavailable('Kirikou', 2_000);
    expect(blocked).toEqual({ ids: [1, 2, 3], blocked: true, stale: true });
    expect(gate.isInBackoff(2_000 + ANILIST_INITIAL_BACKOFF_MS - 1)).toBe(true);
    expect(gate.serveBackoff('Kirikou').ids).toEqual([1, 2, 3]);
  });

  it('returns an empty blocked result when there is no prior success', () => {
    const gate = new AnilistListGate();
    expect(gate.onUnavailable('Kirikou', 0)).toEqual({ ids: [], blocked: true, stale: false });
  });

  it('doubles backoff on repeated failures up to the cap', () => {
    const gate = new AnilistListGate(1_000, 4_000);
    gate.onUnavailable('a', 0);
    expect(gate.isInBackoff(999)).toBe(true);
    expect(gate.isInBackoff(1_000)).toBe(false);
    gate.onUnavailable('a', 1_000);
    expect(gate.isInBackoff(1_000 + 2_000 - 1)).toBe(true);
    gate.onUnavailable('a', 3_000);
    expect(gate.isInBackoff(3_000 + 4_000 - 1)).toBe(true);
  });

  it('resets backoff after a fresh success', () => {
    const gate = new AnilistListGate(1_000, 4_000);
    gate.onUnavailable('a', 0);
    gate.rememberSuccess('a', [9], 500);
    expect(gate.isInBackoff(500)).toBe(false);
    expect(gate.hasFreshSuccess('a', 500)).toBe(true);
  });
});
