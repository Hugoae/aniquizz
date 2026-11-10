import { describe, expect, it } from 'vitest';
import { noteDailyAnswer, noteDailyClock } from './dailyAttemptMemory';
import { runDailyPlayer } from './dailyPlayerGate';

describe('noteDailyAnswer', () => {
  it('records a grade once per round', () => {
    const attempt = { id: 'attempt-1', answers: [] };
    const row = {
      roundId: 'round-1',
      selectedLabel: 'Naruto',
      isCorrect: true,
      responseMs: 1200,
      answeredAt: new Date('2026-11-10T12:00:00Z'),
    };
    noteDailyAnswer(attempt, row);
    noteDailyAnswer(attempt, { ...row, isCorrect: false });
    expect(attempt.answers).toHaveLength(1);
    expect(attempt.answers[0]).toMatchObject({
      attemptId: 'attempt-1',
      roundId: 'round-1',
      isCorrect: true,
    });
  });
});

describe('noteDailyClock', () => {
  it('patches only the fields that were written', () => {
    const attempt = {
      currentRound: 1,
      currentRoundStartedAt: new Date('2026-11-10T12:00:00Z'),
      revealUntil: null as Date | null,
    };
    noteDailyClock(attempt, { revealUntil: new Date('2026-11-10T12:00:15Z') });
    expect(attempt.currentRound).toBe(1);
    expect(attempt.currentRoundStartedAt?.toISOString()).toBe('2026-11-10T12:00:00.000Z');
    expect(attempt.revealUntil?.toISOString()).toBe('2026-11-10T12:00:15.000Z');
  });
});

describe('runDailyPlayer', () => {
  it('runs one player in order and leaves another player free', async () => {
    const order: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const first = runDailyPlayer('player-a', async () => {
      await gate;
      order.push('a1');
    });
    const second = runDailyPlayer('player-a', async () => {
      order.push('a2');
    });
    const other = runDailyPlayer('player-b', async () => {
      order.push('b');
    });
    await other;
    expect(order).toEqual(['b']);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(['b', 'a1', 'a2']);
  });

  it('keeps the queue alive after a rejection', async () => {
    await expect(
      runDailyPlayer('player-c', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await expect(runDailyPlayer('player-c', async () => 'ok')).resolves.toBe('ok');
  });
});
