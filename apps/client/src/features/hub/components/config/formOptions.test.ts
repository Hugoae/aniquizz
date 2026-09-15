import { describe, expect, it } from 'vitest';
import { estimateMatchMinutes } from './formOptions';

describe('estimateMatchMinutes', () => {
  it('counts each song as guess plus the derived reveal window', () => {
    // 10 × (20s guess + 15s capped reveal) = 350s → 6 min
    expect(estimateMatchMinutes({ soundCount: 10, guessDuration: 20 })).toBe(6);
    // 10 × (5s + 5s) = 100s → 2 min
    expect(estimateMatchMinutes({ soundCount: 10, guessDuration: 5 })).toBe(2);
  });
});
