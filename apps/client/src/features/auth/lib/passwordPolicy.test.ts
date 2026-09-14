import { describe, expect, it } from 'vitest';
import { isPasswordValid } from './passwordPolicy';

describe('isPasswordValid', () => {
  it('rejects too-short or missing character classes', () => {
    expect(isPasswordValid('Ab1!')).toBe(false);
    expect(isPasswordValid('abcdefgh')).toBe(false);
    expect(isPasswordValid('ABCDEFGH1')).toBe(false);
    expect(isPasswordValid('Abcdefgh1')).toBe(false);
  });

  it('accepts 8+ with upper, lower, digit, and special', () => {
    expect(isPasswordValid('Abcdef1!')).toBe(true);
  });
});
