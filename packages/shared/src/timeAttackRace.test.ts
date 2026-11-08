import { describe, expect, it } from 'vitest';
import { computeRaceWinners, rankRaceStandings } from './timeAttackRace';

const row = (userId: string, found: number, heard = found, remainingMs = 0) => ({
  userId,
  found,
  heard,
  remainingMs,
});

describe('rankRaceStandings', () => {
  it('orders by titles found, highest first', () => {
    const out = rankRaceStandings([row('a', 10), row('b', 14), row('c', 12)]);
    expect(out.map((s) => s.userId)).toEqual(['b', 'c', 'a']);
    expect(out.map((s) => s.rank)).toEqual([1, 2, 3]);
  });

  it('breaks a tie on titles with fewer songs heard (8/13 beats 8/15)', () => {
    const out = rankRaceStandings([row('a', 8, 15), row('b', 8, 13)]);
    expect(out.map((s) => s.userId)).toEqual(['b', 'a']);
    expect(out.map((s) => s.rank)).toEqual([1, 2]);
  });

  it('keeps titles found ahead of a better ratio', () => {
    const out = rankRaceStandings([row('a', 8, 8), row('b', 9, 20)]);
    expect(out.map((s) => s.userId)).toEqual(['b', 'a']);
  });

  it('shares a rank when found and heard match, whatever the time left', () => {
    const out = rankRaceStandings([
      row('a', 12, 14, 0),
      row('b', 12, 14, 9_000),
      row('c', 9, 10, 0),
    ]);
    expect(out.map((s) => s.userId)).toEqual(['a', 'b', 'c']);
    expect(out.map((s) => s.rank)).toEqual([1, 1, 3]);
  });

  it('keeps input order stable on a full tie', () => {
    const out = rankRaceStandings([row('a', 5), row('b', 5)]);
    expect(out.map((s) => s.userId)).toEqual(['a', 'b']);
  });
});

describe('computeRaceWinners', () => {
  it('crowns only rank 1 below the podium threshold', () => {
    const standings = rankRaceStandings([row('a', 10), row('b', 8), row('c', 6)]);
    expect(computeRaceWinners(standings).winnerIds).toEqual(['a']);
  });

  it('crowns the top three from five players on, ties on the line included', () => {
    const standings = rankRaceStandings([
      row('a', 10),
      row('b', 8),
      row('c', 8),
      row('d', 8),
      row('e', 1),
    ]);
    expect(computeRaceWinners(standings).winnerIds.sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('never crowns a player with no title found', () => {
    const standings = rankRaceStandings([row('a', 0), row('b', 0)]);
    expect(computeRaceWinners(standings).winnerIds).toEqual([]);
  });

  it('crowns a lone remaining player who found something', () => {
    const standings = rankRaceStandings([row('a', 3)]);
    expect(computeRaceWinners(standings).winnerIds).toEqual(['a']);
  });
});
