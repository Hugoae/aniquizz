import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { logger } from '../../utils/logger';
import { recordHeardSongs, rewindHeardSongs } from './songHistoryService';

interface SqlStatement {
  strings: string[];
  values: unknown[];
}

const sqlText = (statement: SqlStatement): string => statement.strings.join(' ');

const flatten = (value: unknown, out: unknown[] = []): unknown[] => {
  if (Array.isArray(value)) {
    for (const item of value) flatten(item, out);
    return out;
  }
  if (value && typeof value === 'object' && 'values' in value) {
    flatten((value as { values: unknown }).values, out);
    return out;
  }
  out.push(value);
  return out;
};

describe('recordHeardSongs', () => {
  it('writes every song in one upsert and sums repeats', async () => {
    const queryRaw = vi.fn(async () => [{ songId: 7 }]);
    const executeRaw = vi.fn();
    await recordHeardSongs({ $queryRaw: queryRaw, $executeRaw: executeRaw }, 'player-1', [
      { songId: 7, correct: true },
      { songId: 7, correct: false },
      { songId: 8, correct: false },
    ]);

    expect(executeRaw).not.toHaveBeenCalled();
    expect(queryRaw).toHaveBeenCalledTimes(1);
    const statement = queryRaw.mock.calls[0]?.[0] as SqlStatement;
    expect(sqlText(statement)).toContain('ON CONFLICT ("profileId", "songId")');
    const leaves = flatten(statement.values);
    expect(leaves.filter((value) => value === 7)).toHaveLength(1);
    expect(leaves).toEqual(expect.arrayContaining([7, 2, 1, 8, 1, 0, 'player-1']));
  });

  it('does not query when there is nothing to record', async () => {
    const queryRaw = vi.fn();
    await recordHeardSongs({ $queryRaw: queryRaw, $executeRaw: vi.fn() }, 'player-1', []);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('warns when a catalogue id is absent and still returns', async () => {
    const queryRaw = vi.fn(async () => []);
    await recordHeardSongs({ $queryRaw: queryRaw, $executeRaw: vi.fn() }, 'player-1', [
      { songId: 99, correct: true },
    ]);
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('rewindHeardSongs', () => {
  it('decrements in one update, then deletes rows that hit zero', async () => {
    const executeRaw = vi.fn(async () => 0);
    await rewindHeardSongs({ $queryRaw: vi.fn(), $executeRaw: executeRaw }, 'player-1', [
      { songId: 4, correct: true },
      { songId: 4, correct: true },
    ]);
    expect(executeRaw).toHaveBeenCalledTimes(2);
    const update = executeRaw.mock.calls[0]?.[0] as SqlStatement;
    const remove = executeRaw.mock.calls[1]?.[0] as SqlStatement;
    expect(sqlText(update)).toContain('UPDATE "SongHistory"');
    expect(sqlText(remove)).toContain('DELETE FROM "SongHistory"');
    expect(flatten(update.values)).toEqual(expect.arrayContaining([4, 2, 2, 'player-1']));
  });
});
