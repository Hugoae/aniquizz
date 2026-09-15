import { describe, expect, it } from 'vitest';
import { formatStaffDuration } from './adminCopy';

describe('formatStaffDuration', () => {
  it('labels lifts, hours, days, and permanent', () => {
    expect(formatStaffDuration(null)).toBe('—');
    expect(formatStaffDuration(60)).toBe('1 h');
    expect(formatStaffDuration(1440)).toBe('1 j');
    expect(formatStaffDuration(45)).toBe('45 min');
    expect(formatStaffDuration(52_560_000)).toBe('Permanent');
  });
});
