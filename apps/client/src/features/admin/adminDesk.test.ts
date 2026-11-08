import { describe, expect, it } from 'vitest';
import { countLiveRooms, formatLiveRooms, formatOpenSuggestions, formatRepair } from './adminDesk';

describe('countLiveRooms', () => {
  it('counts playing and paused rooms only', () => {
    expect(
      countLiveRooms([
        { status: 'playing' },
        { status: 'paused' },
        { status: 'waiting' },
        { status: 'finished' },
      ]),
    ).toBe(2);
  });
});

describe('desk labels', () => {
  it('pluralises the three waiting counts', () => {
    expect(formatLiveRooms(null)).toBe('Indisponible');
    expect(formatLiveRooms(0)).toBe('Aucun salon en partie');
    expect(formatLiveRooms(1)).toBe('1 salon en partie');
    expect(formatLiveRooms(3)).toBe('3 salons en partie');

    expect(formatRepair(0, false)).toBe('Aucun son à réparer');
    expect(formatRepair(1, false)).toBe('1 son à réparer');
    expect(formatRepair(4, false)).toBe('4 sons à réparer');
    expect(formatRepair(50, true)).toBe('50+ sons à réparer');

    expect(formatOpenSuggestions(0)).toBe('Aucune suggestion ouverte');
    expect(formatOpenSuggestions(1)).toBe('1 suggestion ouverte');
    expect(formatOpenSuggestions(2)).toBe('2 suggestions ouvertes');
  });
});
