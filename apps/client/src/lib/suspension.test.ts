import { describe, expect, it } from 'vitest';
import { getPlayBannedMessage, isSanctionActive, notifyModerationBan } from './suspension';

describe('getPlayBannedMessage', () => {
  it('returns base message when ban has no remaining label', () => {
    expect(getPlayBannedMessage(null)).toMatch(/banni par la modération/i);
    expect(getPlayBannedMessage(undefined)).toMatch(/Impossible de jouer/i);
  });

  it('includes remaining time when ban is active', () => {
    const until = new Date(Date.now() + 60 * 60_000).toISOString();
    expect(getPlayBannedMessage(until)).toMatch(/Reprise dans/i);
  });
});

describe('notifyModerationBan', () => {
  it('recognizes ban messages', () => {
    expect(notifyModerationBan('Vous avez été banni par la modération.')).toBe(true);
    expect(notifyModerationBan('Salon fermé.')).toBe(false);
  });

  it('does not treat empty or missing messages as a ban', () => {
    expect(notifyModerationBan(null)).toBe(false);
    expect(notifyModerationBan(undefined)).toBe(false);
    expect(notifyModerationBan('')).toBe(false);
    expect(notifyModerationBan('   ')).toBe(false);
  });
});

describe('isSanctionActive', () => {
  it('returns true for a future ban end', () => {
    const until = new Date(Date.now() + 60_000).toISOString();
    expect(isSanctionActive(until)).toBe(true);
  });

  it('returns false for an expired ban', () => {
    const until = new Date(Date.now() - 60_000).toISOString();
    expect(isSanctionActive(until)).toBe(false);
  });
});
