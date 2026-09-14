import { describe, expect, it } from 'vitest';
import { matchRankMedalToken } from './matchHistoryAccent';

describe('matchRankMedalToken', () => {
  it('maps podium ranks to theme tokens', () => {
    expect(matchRankMedalToken(1)).toBe('hsl(var(--warning))');
    expect(matchRankMedalToken(2)).toBe('hsl(var(--silver))');
    expect(matchRankMedalToken(3)).toBe('hsl(var(--medal-bronze))');
    expect(matchRankMedalToken(4)).toBeNull();
  });
});
