import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from './constants';
import {
  addCalendarDays,
  assignDailyRanks,
  clampDailyResponseMs,
  compareDailyLeaderboard,
  DAILY_PRECISION,
  DAILY_GUESS_MS,
  DAILY_GUESS_WALL_MS,
  DAILY_REVEAL_MS,
  DAILY_RELAXATION_STEPS,
  dailyCalendarDate,
  dailyGuessVisualEndsAt,
  dailyHeardSongs,
  dailyResetsAt,
  dailyRoundTimeMs,
  dailyTrackStates,
  dailyXp,
  decideDailySettle,
  isDailyQcmCorrect,
  isDailyVictory,
  mergeProfileHistory,
  nextDailyStreak,
  offeredDailyChoice,
  summarizeDailyRounds,
  summarizeDailyCareer,
  summarizeDailyCareerFromAggregates,
  toDailyHistoryEntry,
  zonedWallTimeToUtc,
} from './daily';

describe('daily calendar (Europe/Paris)', () => {
  it('uses the Paris civil date in winter (UTC+1)', () => {
    const now = new Date('2026-01-15T00:30:00.000Z');
    expect(dailyCalendarDate(now)).toBe('2026-01-15');
  });

  it('still belongs to the previous Paris day just before midnight CET', () => {
    const now = new Date('2026-01-14T22:59:59.000Z');
    expect(dailyCalendarDate(now)).toBe('2026-01-14');
  });

  it('rolls at Paris midnight across the March 2026 DST start', () => {
    const before = new Date('2026-03-28T22:30:00.000Z');
    expect(dailyCalendarDate(before)).toBe('2026-03-28');
    expect(dailyResetsAt(before).toISOString()).toBe('2026-03-28T23:00:00.000Z');

    const afterMidnight = new Date('2026-03-28T23:00:00.000Z');
    expect(dailyCalendarDate(afterMidnight)).toBe('2026-03-29');
    expect(dailyResetsAt(afterMidnight).toISOString()).toBe('2026-03-29T22:00:00.000Z');
  });

  it('rolls at Paris midnight across the October 2026 DST end', () => {
    const summerEvening = new Date('2026-10-24T21:30:00.000Z');
    expect(dailyCalendarDate(summerEvening)).toBe('2026-10-24');
    expect(dailyResetsAt(summerEvening).toISOString()).toBe('2026-10-24T22:00:00.000Z');

    const afterFallBack = new Date('2026-10-25T23:00:00.000Z');
    expect(dailyCalendarDate(afterFallBack)).toBe('2026-10-26');
  });

  it('converts Paris wall midnight to the matching UTC instant', () => {
    expect(zonedWallTimeToUtc(2026, 1, 15, 0, 0, 0).toISOString()).toBe('2026-01-14T23:00:00.000Z');
    expect(zonedWallTimeToUtc(2026, 7, 15, 0, 0, 0).toISOString()).toBe('2026-07-14T22:00:00.000Z');
  });

  it('adds civil days without using the local timezone', () => {
    expect(addCalendarDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('daily XP and scoring', () => {
  it('awards match-rate participation and correct XP, plus win and perfect bonuses', () => {
    expect(dailyXp(0)).toBe(15);
    expect(dailyXp(1)).toBe(27);
    expect(dailyXp(2)).toBe(39);
    expect(dailyXp(3)).toBe(71);
    expect(dailyXp(4)).toBe(83);
    expect(dailyXp(5)).toBe(105);
    expect(dailyXp(9)).toBe(105);
    expect(dailyXp(-2)).toBe(15);
  });

  it('caps XP against a reduced voided-round denominator', () => {
    expect(dailyXp(4, 4)).toBe(90);
    expect(dailyXp(5, 4)).toBe(90);
  });

  it('treats 3 correct songs as a recap victory', () => {
    expect(isDailyVictory(3, 5)).toBe(true);
    expect(isDailyVictory(2, 5)).toBe(false);
    expect(isDailyVictory(3, 4)).toBe(true);
    expect(isDailyVictory(2, 2)).toBe(true);
    expect(isDailyVictory(0, 5)).toBe(false);
    expect(isDailyVictory(1, 0)).toBe(false);
  });

  it('maps a daily attempt onto the profile history card', () => {
    const entry = toDailyHistoryEntry({
      id: 'att-1',
      playedAt: '2026-09-13T10:00:00.000Z',
      challengeNumber: 12,
      correctCount: 4,
      activeRoundCount: 5,
      xpAwarded: 17,
      won: true,
      totalResponseMs: 9400,
    });
    expect(entry.kind).toBe('daily');
    expect(entry.isWinner).toBe(true);
    expect(entry.score).toBe(0);
    expect(entry.correctCount).toBe(4);
    expect(entry.challengeNumber).toBe(12);
    expect(entry.rank).toBeNull();
  });

  it('keeps a daily leaderboard rank on the history card', () => {
    const entry = toDailyHistoryEntry({
      id: 'att-2',
      playedAt: '2026-09-13T10:00:00.000Z',
      challengeNumber: 12,
      correctCount: 5,
      activeRoundCount: 5,
      xpAwarded: 105,
      won: true,
      totalResponseMs: 8000,
      rank: 2,
    });
    expect(entry.rank).toBe(2);
  });

  it('averages career rank and time from finished attempts', () => {
    expect(summarizeDailyCareer([])).toEqual({
      dailyTotalCorrect: 0,
      dailyTotalResponseMs: 0,
      dailyAvgRank: null,
      dailyBestRank: null,
      dailyAvgTimeMs: null,
      dailyBestTimeMs: null,
    });
    expect(
      summarizeDailyCareer([
        { rank: 1, totalResponseMs: 10_000, correctCount: 5 },
        { rank: 4, totalResponseMs: 20_000, correctCount: 3 },
      ]),
    ).toEqual({
      dailyTotalCorrect: 8,
      dailyTotalResponseMs: 30_000,
      dailyAvgRank: 2.5,
      dailyBestRank: 1,
      dailyAvgTimeMs: 15_000,
      dailyBestTimeMs: 10_000,
    });
  });

  it('matches row summaries when built from SQL aggregates', () => {
    expect(
      summarizeDailyCareerFromAggregates({
        count: 2,
        totalCorrect: 8,
        totalMs: 30_000,
        avgRank: 2.5,
        bestRank: 1,
        bestTimeMs: 10_000,
      }),
    ).toEqual({
      dailyTotalCorrect: 8,
      dailyTotalResponseMs: 30_000,
      dailyAvgRank: 2.5,
      dailyBestRank: 1,
      dailyAvgTimeMs: 15_000,
      dailyBestTimeMs: 10_000,
    });
  });

  it('interleaves daily and match rows by recency', () => {
    const merged = mergeProfileHistory(
      [
        {
          id: 'm1',
          playedAt: '2026-09-13T11:00:00.000Z',
          mode: 'STANDARD',
          answerMode: 'QCM',
          totalRounds: 10,
          score: 12,
          rank: null,
          isWinner: true,
          correctCount: 6,
          xpEarned: 20,
          playerCount: 1,
          durationMs: 120000,
        },
      ],
      [
        toDailyHistoryEntry({
          id: 'd1',
          playedAt: '2026-09-13T12:00:00.000Z',
          challengeNumber: 1,
          correctCount: 5,
          activeRoundCount: 5,
          xpAwarded: 20,
          won: true,
          totalResponseMs: 8000,
        }),
      ],
      8,
    );
    expect(merged.map((row) => row.id)).toEqual(['d1', 'm1']);
  });

  it('locks daily QCM to anime precision', () => {
    expect(DAILY_PRECISION).toBe('anime');
    expect(GAME_CONFIG.MEDALS.PRECISION_OFFSET.anime).toBe(-0.05);
  });
});

describe('daily streak', () => {
  it('starts at 1 on a first completion', () => {
    expect(
      nextDailyStreak({
        currentStreak: 0,
        longestStreak: 0,
        lastCompletionDate: null,
        challengeDate: '2026-09-13',
      }),
    ).toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it('continues after a consecutive Paris day, including a 0/5 finish', () => {
    expect(
      nextDailyStreak({
        currentStreak: 4,
        longestStreak: 10,
        lastCompletionDate: '2026-09-12',
        challengeDate: '2026-09-13',
      }),
    ).toEqual({ currentStreak: 5, longestStreak: 10 });
  });

  it('resets after a gap and is idempotent on the same day', () => {
    expect(
      nextDailyStreak({
        currentStreak: 6,
        longestStreak: 6,
        lastCompletionDate: '2026-09-10',
        challengeDate: '2026-09-13',
      }),
    ).toEqual({ currentStreak: 1, longestStreak: 6 });

    expect(
      nextDailyStreak({
        currentStreak: 3,
        longestStreak: 8,
        lastCompletionDate: '2026-09-13',
        challengeDate: '2026-09-13',
      }),
    ).toEqual({ currentStreak: 3, longestStreak: 8 });
  });
});

describe('daily leaderboard ordering', () => {
  it('sorts by correct desc, then response time, then completion time', () => {
    const rows = [
      { id: 'a', correctCount: 4, totalResponseMs: 12_000, completedAtMs: 200 },
      { id: 'b', correctCount: 5, totalResponseMs: 40_000, completedAtMs: 100 },
      { id: 'c', correctCount: 4, totalResponseMs: 11_000, completedAtMs: 300 },
      { id: 'd', correctCount: 4, totalResponseMs: 12_000, completedAtMs: 50 },
    ];
    const ordered = [...rows].sort(compareDailyLeaderboard).map((row) => row.id);
    expect(ordered).toEqual(['b', 'c', 'd', 'a']);
  });

  it('shares competition ranks on a full tie', () => {
    const ranks = assignDailyRanks([
      { id: 'a', correctCount: 5, totalResponseMs: 10_000, completedAtMs: 1 },
      { id: 'b', correctCount: 5, totalResponseMs: 10_000, completedAtMs: 1 },
      { id: 'c', correctCount: 4, totalResponseMs: 8_000, completedAtMs: 2 },
    ]);
    expect(ranks.get('a')).toBe(1);
    expect(ranks.get('b')).toBe(1);
    expect(ranks.get('c')).toBe(3);
  });

  it('ties rank on the same score and time, ignoring who finished first', () => {
    const ranks = assignDailyRanks([
      { id: 'a', correctCount: 4, totalResponseMs: 12_000, completedAtMs: 200 },
      { id: 'b', correctCount: 5, totalResponseMs: 40_000, completedAtMs: 100 },
      { id: 'c', correctCount: 4, totalResponseMs: 11_000, completedAtMs: 300 },
      { id: 'd', correctCount: 4, totalResponseMs: 12_000, completedAtMs: 50 },
    ]);
    expect(ranks.get('b')).toBe(1);
    expect(ranks.get('c')).toBe(2);
    expect(ranks.get('d')).toBe(3);
    expect(ranks.get('a')).toBe(3);
  });
});

describe('daily round timing and grading', () => {
  it('keeps reveal as long as the guess window', () => {
    expect(DAILY_REVEAL_MS).toBe(DAILY_GUESS_MS);
    expect(DAILY_REVEAL_MS).toBe(15_000);
  });

  it('uses the same soft timer margins as Standard matches', () => {
    expect(DAILY_GUESS_WALL_MS).toBe(
      DAILY_GUESS_MS + GAME_CONFIG.TIMERS.GUESS_START_BUFFER + GAME_CONFIG.TIMERS.GUESS_END_GRACE,
    );
  });

  it('clamps response time to the guess window', () => {
    expect(clampDailyResponseMs(1_000, 1_400, 15_000)).toBe(400);
    expect(clampDailyResponseMs(1_000, 20_000, 15_000)).toBe(15_000);
    expect(clampDailyResponseMs(5_000, 4_000, 15_000)).toBe(0);
  });

  it('counts unanswered rounds as the full guess duration, voided as zero', () => {
    expect(dailyRoundTimeMs({ answered: false, responseMs: null })).toBe(15_000);
    expect(dailyRoundTimeMs({ answered: true, responseMs: 1_200 })).toBe(1_200);
    expect(dailyRoundTimeMs({ answered: false, responseMs: null, voided: true })).toBe(0);
  });

  it('accepts only an offered QCM label and grades against valid answers', () => {
    const choices = ['Naruto', 'Bleach', 'One Piece', 'Hunter x Hunter'];
    expect(offeredDailyChoice('naruto', choices)).toBe('Naruto');
    expect(offeredDailyChoice('Death Note', choices)).toBeNull();
    expect(isDailyQcmCorrect('Naruto', ['Naruto', 'Naruto Shippuden'])).toBe(true);
    expect(isDailyQcmCorrect('Bleach', ['Naruto'])).toBe(false);
  });

  it('does not time out the next round using the previous round start', () => {
    const base = {
      terminal: false,
      nowMs: 20_000,
      revealUntilMs: 10_000,
      currentRound: 1,
      currentRoundStartedAtMs: 0,
      unansweredPosition: 2,
    };
    expect(decideDailySettle(base)).toEqual({ type: 'start_unanswered' });
    expect(decideDailySettle({ ...base, allowAdvance: false })).toEqual({ type: 'noop' });
    expect(decideDailySettle({ ...base, revealUntilMs: 25_000 })).toEqual({ type: 'wait_reveal' });
    expect(
      decideDailySettle({ ...base, unansweredPosition: 1, nowMs: DAILY_GUESS_WALL_MS + 500 }),
    ).toEqual({
      type: 'timeout_guess',
      enterReveal: true,
    });
    expect(decideDailySettle({ ...base, unansweredPosition: 1, nowMs: DAILY_GUESS_MS })).toEqual({
      type: 'noop',
    });
    expect(decideDailySettle({ ...base, unansweredPosition: null, revealUntilMs: null })).toEqual({
      type: 'complete',
    });
    expect(decideDailySettle({ ...base, unansweredPosition: 1, nowMs: 15 * 60_000 })).toEqual({
      type: 'timeout_guess',
      enterReveal: false,
    });
    expect(
      decideDailySettle({
        ...base,
        unansweredPosition: 1,
        nowMs: 15 * 60_000,
        allowAdvance: false,
      }),
    ).toEqual({
      type: 'noop',
    });
    expect(
      decideDailySettle({
        ...base,
        unansweredPosition: null,
        revealUntilMs: null,
        allowAdvance: false,
      }),
    ).toEqual({
      type: 'complete',
    });
  });

  it('shows 0 at the playable 15s mark, before the guess wall', () => {
    expect(dailyGuessVisualEndsAt(DAILY_GUESS_WALL_MS)).toBe(DAILY_GUESS_MS);
    expect(dailyGuessVisualEndsAt(DAILY_GUESS_WALL_MS)).toBeLessThan(DAILY_GUESS_WALL_MS);
  });
});

describe('daily tracks and voided denominator', () => {
  it('summarizes voided rounds out of the score denominator', () => {
    const summary = summarizeDailyRounds([
      { correct: true },
      { correct: false },
      { correct: true, voided: true },
      { correct: false },
      { correct: true },
    ]);
    expect(summary).toEqual({ correctCount: 2, activeRoundCount: 4 });
  });

  it('maps finished rounds onto track states', () => {
    expect(
      dailyTrackStates([
        { position: 1, correct: true },
        { position: 2, correct: true },
        { position: 3, correct: false },
        { position: 4, correct: false },
        { position: 5, correct: true },
      ]),
    ).toEqual(['correct', 'correct', 'wrong', 'wrong', 'correct']);
  });

  it('marks voided tracks without counting them in the score squares', () => {
    expect(
      dailyTrackStates([
        { position: 1, correct: true },
        { position: 2, voided: true, correct: true },
        { position: 3, correct: false },
        { position: 4, correct: true },
        { position: 5, correct: false },
      ]),
    ).toEqual(['correct', 'voided', 'wrong', 'correct', 'wrong']);
  });

  it('documents a deterministic generator relaxation order', () => {
    expect(DAILY_RELAXATION_STEPS[0]).toBe('drop_discovery_bucket');
    expect(DAILY_RELAXATION_STEPS.at(-1)).toBe('relax_type_mix');
  });
});

describe('daily heard songs (pokédex)', () => {
  const rounds = [
    { id: 'r1', position: 1, voided: false, songId: 10 },
    { id: 'r2', position: 2, voided: false, songId: 20 },
    { id: 'r3', position: 3, voided: true, songId: 30 },
    { id: 'r4', position: 4, voided: false, songId: 40 },
    { id: 'r5', position: 5, voided: false, songId: null },
  ];

  it('counts started clips only, not forfeited leftovers or voided rows', () => {
    expect(
      dailyHeardSongs({
        currentRound: 2,
        rounds,
        answers: [
          { roundId: 'r1', isCorrect: true },
          { roundId: 'r2', isCorrect: false },
          { roundId: 'r4', isCorrect: false },
        ],
      }),
    ).toEqual([
      { songId: 10, correct: true },
      { songId: 20, correct: false },
    ]);
  });

  it('treats a started round without an answer as heard and missed', () => {
    expect(
      dailyHeardSongs({
        currentRound: 1,
        rounds,
        answers: [],
      }),
    ).toEqual([{ songId: 10, correct: false }]);
  });

  it('merges a repeated catalogue id into one pokédex update', () => {
    expect(
      dailyHeardSongs({
        currentRound: 2,
        rounds: [
          { id: 'a', position: 1, voided: false, songId: 10 },
          { id: 'b', position: 2, voided: false, songId: 10 },
        ],
        answers: [
          { roundId: 'a', isCorrect: false },
          { roundId: 'b', isCorrect: true },
        ],
      }),
    ).toEqual([{ songId: 10, correct: true }]);
  });
});
