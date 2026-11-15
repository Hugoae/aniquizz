import { describe, expect, it } from 'vitest';
import { isSequelVariant } from './sequelVariant';

describe('isSequelVariant', () => {
  it('treats a short season marker as a different title', () => {
    expect(isSequelVariant('tokyoghoul', 'tokyoghoulre')).toBe(true);
    expect(isSequelVariant('myheroacademia', 'myheroacademia2')).toBe(true);
    expect(isSequelVariant('myheroacademia', 'myheroacademiaseason2')).toBe(true);
    expect(isSequelVariant('bokunoheroacademia', 'bokunoheroacademia2ndseason')).toBe(true);
    expect(isSequelVariant('attackontitan', 'attackontitanfinalseason')).toBe(true);
  });

  it('does not treat a trailing typo as a season', () => {
    expect(isSequelVariant('naruto', 'narutoo')).toBe(false);
    expect(isSequelVariant('tokyoghoul', 'tokyoghoul')).toBe(false);
  });
});
