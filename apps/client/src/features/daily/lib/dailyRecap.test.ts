import { describe, expect, it } from 'vitest';
import type { DailyResultDto } from '@aniquizz/shared';
import { dailyRecapToHistory, formatDailyClock, formatDailyClockValue } from './dailyRecap';

const result = (overrides: Partial<DailyResultDto> = {}): DailyResultDto => ({
  correctCount: 1,
  activeRoundCount: 2,
  totalResponseMs: 12_000,
  xpAwarded: 8,
  completedAt: new Date().toISOString(),
  tracks: ['correct', 'wrong'],
  difficulties: ['easy', 'medium'],
  streak: 1,
  recap: [
    {
      position: 1,
      songId: 101,
      anime: 'Naruto',
      title: 'GO!!!',
      artist: 'FLOW',
      typeLabel: 'OP1',
      isCorrect: true,
      voided: false,
      selectedLabel: 'Naruto',
    },
    {
      position: 2,
      songId: 202,
      anime: 'Bleach',
      title: '*~Asterisk~',
      artist: 'Orange Range',
      typeLabel: 'OP1',
      isCorrect: false,
      voided: false,
      selectedLabel: 'One Piece',
    },
  ],
  ...overrides,
});

describe('dailyRecapToHistory', () => {
  it('maps recap rows onto the solo round-history shape', () => {
    const history = dailyRecapToHistory(result());
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      round: 1,
      isCorrect: true,
      points: 0,
      answerType: 'qcm',
      myAnswer: 'Naruto',
      song: { anime: 'Naruto', title: 'GO!!!', type: 'OP1', id: 101 },
    });
    expect(history[1]).toMatchObject({
      isCorrect: false,
      points: 0,
      myAnswer: 'One Piece',
    });
  });

  it('formats cumulative time like the recap clock', () => {
    expect(formatDailyClock(32_600)).toBe('32.6s');
    expect(formatDailyClockValue(32_600)).toBe('32,6');
  });
});
