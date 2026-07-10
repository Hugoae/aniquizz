import { describe, expect, it } from 'vitest';
import { isBanSanctionReason, MODERATION_BAN_MESSAGE } from './moderation';

describe('moderation', () => {
  it('exposes the ban play message', () => {
    expect(MODERATION_BAN_MESSAGE).toMatch(/banni/i);
  });

  it('detects ban reasons', () => {
    expect(isBanSanctionReason(MODERATION_BAN_MESSAGE)).toBe(true);
    expect(isBanSanctionReason('Salon fermé.')).toBe(false);
  });
});
