import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { prisma } from '@aniquizz/database';
import { DAILY_LEAK_KEYS, dailyCalendarDate, dailyXp, isDailyVictory } from '@aniquizz/shared';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { getTestAccessToken, TEST_USER_IDS } from '../test/testJwt';
import { clearModeration, setModeration } from '../test/dbHelpers';
import { dateFromIsoDay } from '../modules/daily/dailySnapshot';

const snapshot = (position: number, anime: string, songId: number) => ({
  id: songId,
  anime,
  franchise: anime,
  validAnswers: [anime],
  title: `Song ${position}`,
  artist: 'Artist',
  typeLabel: position % 2 ? 'OP1' : 'ED1',
  difficulty: position === 5 ? 'hard' : position <= 2 ? 'easy' : 'medium',
  videoKey: `daily-test-${position}.mp4`,
  videoStartTime: 1,
  guessDuration: 15,
  cover: null,
  animeId: 900000 + position,
  year: 2020,
  season: 'FALL',
  format: 'TV',
  episodeRange: '1-12',
  coverColor: null,
  siteUrl: 'https://anilist.co/anime/1',
  tags: [],
  choices: [anime, 'Bleach', 'One Piece', 'Hunter x Hunter'],
  songType: position % 2 ? 'OP' : 'ED',
  franchiseId: 900000 + position,
  popularity: 1000,
});

describe.skipIf(!hasIntegrationEnv)('daily quiz HTTP', () => {
  let bundle: ServerBundle;
  let token: string;
  let challengeId: string;
  let createdByTest = false;
  const today = dailyCalendarDate(new Date());
  const challengeNumber = 810000 + Math.floor(Math.random() * 1000);

  beforeAll(async () => {
    bundle = await createServerBundle();
    token = await getTestAccessToken('admin');
    const catalogue = await prisma.song.findMany({
      where: { downloadStatus: 'COMPLETED' },
      take: 5,
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    const existing = await prisma.dailyChallenge.findUnique({
      where: { challengeDate: dateFromIsoDay(today) },
      select: { id: true },
    });
    if (existing) {
      challengeId = existing.id;
    } else {
      createdByTest = true;
      challengeId = randomUUID();
      await prisma.dailyChallenge.create({
        data: {
          id: challengeId,
          challengeDate: dateFromIsoDay(today),
          challengeNumber,
          status: 'READY',
          rounds: {
            create: [1, 2, 3, 4, 5].map((position) => {
              const songId = catalogue[position - 1]?.id ?? 900000 + position;
              return {
                id: randomUUID(),
                position,
                songId: catalogue[position - 1]?.id ?? null,
                snapshot: snapshot(position, `Anime ${position}`, songId),
                videoStartTime: 1,
                choices: [`Anime ${position}`, 'Bleach', 'One Piece', 'Hunter x Hunter'],
              };
            }),
          },
        },
      });
    }
    await prisma.dailyAttempt.deleteMany({
      where: { profileId: TEST_USER_IDS.admin, challengeId },
    });
    await prisma.dailyPlayerStats.deleteMany({
      where: { profileId: TEST_USER_IDS.admin },
    });
  });

  afterAll(async () => {
    await prisma.dailyAttempt.deleteMany({
      where: { profileId: TEST_USER_IDS.admin, challengeId },
    });
    await prisma.dailyPlayerStats.deleteMany({
      where: { profileId: TEST_USER_IDS.admin },
    });
    if (createdByTest) {
      await prisma.dailyChallenge.deleteMany({ where: { id: challengeId } });
    }
    await bundle.close();
  });

  const authHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  it('returns public today metadata without answers', async () => {
    const res = await fetch(`${bundle.url}/daily/today`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.challengeDate).toBe(today);
    expect(body.status).toBe('guest');
    const json = JSON.stringify(body);
    expect(json).not.toContain('validAnswers');
  });

  it('creates a unique attempt and ignores a concurrent second start', async () => {
    const [a, b] = await Promise.all([
      fetch(`${bundle.url}/daily/attempt`, { method: 'POST', headers: authHeaders() }),
      fetch(`${bundle.url}/daily/attempt`, { method: 'POST', headers: authHeaders() }),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const first = await a.json();
    const second = await b.json();
    expect(first.attempt.attemptId).toBe(second.attempt.attemptId);
    expect(first.attempt.choices).toHaveLength(4);
    const leak = JSON.stringify(first.attempt);
    expect(leak).not.toContain('validAnswers');
    for (const key of DAILY_LEAK_KEYS) {
      if (key === 'cover') continue;
      expect(leak.includes(`"${key}"`)).toBe(false);
    }
    const count = await prisma.dailyAttempt.count({
      where: { challengeId, profileId: TEST_USER_IDS.admin },
    });
    expect(count).toBe(1);
  });

  it('rejects an answer that was not offered, then grades a valid one', async () => {
    const started = await fetch(`${bundle.url}/daily/attempt`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const { attempt } = await started.json();
    const bad = await fetch(`${bundle.url}/daily/attempt/${attempt.attemptId}/answer`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ selected: 'Death Note' }),
    });
    expect(bad.status).toBe(400);

    const ok = await fetch(`${bundle.url}/daily/attempt/${attempt.attemptId}/answer`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ selected: attempt.choices[0] }),
    });
    expect(ok.status).toBe(200);
    const reveal = await ok.json();
    expect(reveal.reveal.song.anime).toBeTruthy();

    const dup = await fetch(`${bundle.url}/daily/attempt/${attempt.attemptId}/answer`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ selected: attempt.choices[0] }),
    });
    expect(dup.status).toBe(200);
    const dupBody = await dup.json();
    expect(dupBody.reveal.song.anime).toBe(reveal.reveal.song.anime);
  });

  it('accepts a late answer after the guess wall and opens reveal', async () => {
    await prisma.dailyAttempt.deleteMany({
      where: { profileId: TEST_USER_IDS.admin, challengeId },
    });
    const started = await fetch(`${bundle.url}/daily/attempt`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const { attempt } = await started.json();
    await prisma.dailyAttempt.update({
      where: { id: attempt.attemptId },
      data: { currentRoundStartedAt: new Date(Date.now() - 20_000) },
    });
    const late = await fetch(`${bundle.url}/daily/attempt/${attempt.attemptId}/answer`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ selected: attempt.choices[0] }),
    });
    expect(late.status).toBe(200);
    const body = await late.json();
    expect(body.reveal.selectedLabel).toBe(attempt.choices[0]);
    expect(body.reveal.song.anime).toBeTruthy();
  });

  it('exposes the leaderboard before play and does not bump ordinary stats', async () => {
    await prisma.dailyAttempt.deleteMany({
      where: { profileId: TEST_USER_IDS.admin, challengeId },
    });
    const prior = await prisma.profile.findUniqueOrThrow({
      where: { id: TEST_USER_IDS.admin },
      select: {
        gamesPlayed: true,
        gamesWon: true,
        totalGuesses: true,
        correctGuesses: true,
        currentWinStreak: true,
        xp: true,
      },
    });
    const anon = await fetch(`${bundle.url}/daily/leaderboard`);
    expect(anon.status).toBe(200);
    const before = await fetch(`${bundle.url}/daily/leaderboard`, { headers: authHeaders() });
    const beforeBody = await before.json();
    expect(beforeBody.entries).toEqual([]);

    const started = await fetch(`${bundle.url}/daily/attempt`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const { attempt } = await started.json();
    const forfeited = await fetch(`${bundle.url}/daily/attempt/${attempt.attemptId}/forfeit`, {
      method: 'POST',
      headers: authHeaders(),
    });
    expect(forfeited.status).toBe(200);
    const result = await forfeited.json();
    expect(result.result.xpAwarded).toBeGreaterThanOrEqual(dailyXp(0));
    expect(result.result.correctCount).toBeGreaterThanOrEqual(0);
    expect(result.result.recap).toHaveLength(5);
    expect(result.result.streak).toBeGreaterThanOrEqual(1);

    const open = await fetch(`${bundle.url}/daily/leaderboard`, { headers: authHeaders() });
    const board = await open.json();
    expect(board.entries.some((entry: { rank: number }) => entry.rank >= 1)).toBe(true);

    const after = await prisma.profile.findUniqueOrThrow({
      where: { id: TEST_USER_IDS.admin },
      select: {
        gamesPlayed: true,
        gamesWon: true,
        totalGuesses: true,
        correctGuesses: true,
        currentWinStreak: true,
        xp: true,
      },
    });
    expect(after.gamesPlayed).toBe(prior.gamesPlayed);
    expect(after.gamesWon).toBe(prior.gamesWon);
    expect(after.totalGuesses).toBe(prior.totalGuesses);
    expect(after.correctGuesses).toBe(prior.correctGuesses);
    expect(after.currentWinStreak).toBe(prior.currentWinStreak);
    expect(after.xp).toBeGreaterThanOrEqual(prior.xp);

    const again = await fetch(`${bundle.url}/daily/attempt/${attempt.attemptId}/forfeit`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const againBody = await again.json();
    expect(againBody.result.xpAwarded).toBe(result.result.xpAwarded);
    const afterAgain = await prisma.profile.findUniqueOrThrow({
      where: { id: TEST_USER_IDS.admin },
      select: { xp: true },
    });
    expect(afterAgain.xp).toBe(after.xp);
  });

  it('does not resume an abandoned attempt — settling remaining rounds as misses', async () => {
    await prisma.dailyAttempt.deleteMany({
      where: { profileId: TEST_USER_IDS.admin, challengeId },
    });
    const started = await fetch(`${bundle.url}/daily/attempt`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const { attempt } = await started.json();
    const answered = await fetch(`${bundle.url}/daily/attempt/${attempt.attemptId}/answer`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ selected: attempt.choices[0] }),
    });
    expect(answered.status).toBe(200);

    await prisma.dailyAttempt.update({
      where: { id: attempt.attemptId },
      data: {
        currentRoundStartedAt: new Date(Date.now() - 20_000),
        revealUntil: new Date(Date.now() - 1_000),
      },
    });

    const abandoned = await fetch(`${bundle.url}/daily/attempt`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const body = await abandoned.json();
    expect(abandoned.status).toBe(200);
    expect(body.status).toBe('completed');
    expect(body.attempt).toBeNull();
    expect(body.result.recap).toHaveLength(5);
    const answers = await prisma.dailyAttemptAnswer.count({
      where: { attemptId: attempt.attemptId },
    });
    expect(answers).toBe(5);
  });

  it('ignores leftover expiresAt and still rejects a banned player', async () => {
    await prisma.dailyAttempt.deleteMany({
      where: { profileId: TEST_USER_IDS.admin, challengeId },
    });
    const started = await fetch(`${bundle.url}/daily/attempt`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const { attempt } = await started.json();
    await prisma.dailyAttempt.update({
      where: { id: attempt.attemptId },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const todayRes = await fetch(`${bundle.url}/daily/today`, { headers: authHeaders() });
    const todayBody = await todayRes.json();
    expect(todayBody.status).toBe('in_progress');
    expect(todayBody.attempt).toBeUndefined();
    expect(todayBody.openAttemptId).toBe(attempt.attemptId);
    expect(todayBody.result).toBeNull();

    await setModeration(TEST_USER_IDS.admin, { bannedUntil: new Date(Date.now() + 60_000) });
    try {
      const banned = await fetch(`${bundle.url}/daily/attempt`, {
        method: 'POST',
        headers: authHeaders(),
      });
      expect(banned.status).toBe(403);
    } finally {
      await clearModeration(TEST_USER_IDS.admin);
    }
  });

  it('lets an admin revert today XP and replay the daily', async () => {
    await prisma.dailyAttempt.deleteMany({
      where: { profileId: TEST_USER_IDS.admin, challengeId },
    });
    await prisma.dailyPlayerStats.deleteMany({ where: { profileId: TEST_USER_IDS.admin } });

    const started = await fetch(`${bundle.url}/daily/attempt`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const { attempt } = await started.json();
    const priorXp = (
      await prisma.profile.findUniqueOrThrow({
        where: { id: TEST_USER_IDS.admin },
        select: { xp: true },
      })
    ).xp;
    await fetch(`${bundle.url}/daily/attempt/${attempt.attemptId}/forfeit`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const settled = await prisma.dailyAttempt.findUniqueOrThrow({
      where: { id: attempt.attemptId },
      select: {
        won: true,
        activeRoundCount: true,
        correctCount: true,
        rank: true,
        totalResponseMs: true,
      },
    });
    expect(settled.activeRoundCount).toBe(5);
    expect(settled.won).toBe(isDailyVictory(settled.correctCount, settled.activeRoundCount));
    expect(settled.won).toBe(false);
    expect(settled.rank).toBeGreaterThanOrEqual(1);
    expect(settled.totalResponseMs).toBeGreaterThanOrEqual(0);
    const dailyStats = await prisma.dailyPlayerStats.findUniqueOrThrow({
      where: { profileId: TEST_USER_IDS.admin },
      select: { completions: true, wins: true },
    });
    expect(dailyStats.completions).toBe(1);
    expect(dailyStats.wins).toBe(0);
    const afterPlay = await prisma.profile.findUniqueOrThrow({
      where: { id: TEST_USER_IDS.admin },
      select: { xp: true },
    });
    expect(afterPlay.xp).toBeGreaterThan(priorXp);

    const reset = await fetch(`${bundle.url}/admin/users/${TEST_USER_IDS.admin}/reset-daily`, {
      method: 'POST',
      headers: authHeaders(),
    });
    expect(reset.status).toBe(200);
    const resetBody = await reset.json();
    expect(resetBody.reset).toBe(true);
    expect(resetBody.xpReverted).toBe(afterPlay.xp - priorXp);

    const restored = await prisma.profile.findUniqueOrThrow({
      where: { id: TEST_USER_IDS.admin },
      select: { xp: true },
    });
    expect(restored.xp).toBe(priorXp);

    const stats = await prisma.dailyPlayerStats.findUnique({
      where: { profileId: TEST_USER_IDS.admin },
    });
    expect(stats?.currentStreak ?? 0).toBe(0);
    expect(
      await prisma.dailyAttempt.findUnique({
        where: { challengeId_profileId: { challengeId, profileId: TEST_USER_IDS.admin } },
      }),
    ).toBeNull();

    const replay = await fetch(`${bundle.url}/daily/attempt`, {
      method: 'POST',
      headers: authHeaders(),
    });
    expect(replay.status).toBe(200);
    const replayBody = await replay.json();
    expect(replayBody.status).toBe('in_progress');
  });

  it('lets Suivant skip the remaining reveal window', async () => {
    await prisma.dailyAttempt.deleteMany({
      where: { profileId: TEST_USER_IDS.admin, challengeId },
    });
    const started = await fetch(`${bundle.url}/daily/attempt`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const { attempt } = await started.json();
    const answered = await fetch(`${bundle.url}/daily/attempt/${attempt.attemptId}/answer`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ selected: attempt.choices[0] }),
    });
    expect(answered.status).toBe(200);
    const revealBody = await answered.json();
    const revealMsLeft = new Date(revealBody.reveal.revealEndsAt).getTime() - Date.now();
    expect(revealMsLeft).toBeGreaterThan(12_000);
    expect(revealMsLeft).toBeLessThan(16_000);

    const skipped = await fetch(`${bundle.url}/daily/attempt/${attempt.attemptId}/next`, {
      method: 'POST',
      headers: authHeaders(),
    });
    expect(skipped.status).toBe(200);
    const nextBody = await skipped.json();
    expect(nextBody.attempt.position).toBe(2);
    expect(nextBody.attempt.phase).toBe('guessing');
  });

  it('GET /today does not start the next song after the reveal window elapsed', async () => {
    await prisma.dailyAttempt.deleteMany({
      where: { profileId: TEST_USER_IDS.admin, challengeId },
    });
    const started = await fetch(`${bundle.url}/daily/attempt`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const { attempt } = await started.json();
    const answered = await fetch(`${bundle.url}/daily/attempt/${attempt.attemptId}/answer`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ selected: attempt.choices[0] }),
    });
    expect(answered.status).toBe(200);

    await prisma.dailyAttempt.update({
      where: { id: attempt.attemptId },
      data: {
        currentRoundStartedAt: new Date(Date.now() - 20_000),
        revealUntil: new Date(Date.now() - 1_000),
      },
    });

    const todayRes = await fetch(`${bundle.url}/daily/today`, { headers: authHeaders() });
    const todayBody = await todayRes.json();
    expect(todayRes.status).toBe(200);
    expect(todayBody.status).toBe('in_progress');
    expect(todayBody.attempt).toBeUndefined();
    expect(todayBody.openAttemptId).toBe(attempt.attemptId);

    const row = await prisma.dailyAttempt.findUniqueOrThrow({
      where: { id: attempt.attemptId },
      select: { currentRound: true, state: true },
    });
    expect(row.state).toBe('IN_PROGRESS');
    expect(row.currentRound).toBe(1);
  });

  it('writes heard clips to SongHistory and skips forfeited leftovers', async () => {
    const rounds = await prisma.dailyChallengeRound.findMany({
      where: { challengeId },
      orderBy: { position: 'asc' },
      select: { position: true, songId: true, snapshot: true },
    });
    const songIdOf = (
      round: { songId: number | null; snapshot: unknown } | undefined,
    ): number | null => {
      if (!round) return null;
      if (round.songId != null && round.songId > 0) return round.songId;
      const snap = round.snapshot as { id?: unknown } | null;
      return typeof snap?.id === 'number' && snap.id > 0 ? snap.id : null;
    };
    const heardId = songIdOf(rounds.find((round) => round.position === 1));
    const leftoverId = songIdOf(rounds.find((round) => round.position === 5));
    const heardSong = heardId
      ? await prisma.song.findUnique({ where: { id: heardId }, select: { id: true } })
      : null;
    if (heardId == null || !heardSong) {
      throw new Error('daily round 1 must reference a catalogue Song for pokédex writes');
    }

    await prisma.dailyAttempt.deleteMany({
      where: { profileId: TEST_USER_IDS.admin, challengeId },
    });

    const historyKey = (songId: number) =>
      prisma.songHistory.findUnique({
        where: { profileId_songId: { profileId: TEST_USER_IDS.admin, songId } },
      });
    const heardBefore = await historyKey(heardId);
    const leftoverBefore =
      leftoverId && leftoverId !== heardId ? await historyKey(leftoverId) : null;

    const started = await fetch(`${bundle.url}/daily/attempt`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const { attempt } = await started.json();
    await fetch(`${bundle.url}/daily/attempt/${attempt.attemptId}/answer`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ selected: attempt.choices[0] }),
    });
    const forfeited = await fetch(`${bundle.url}/daily/attempt/${attempt.attemptId}/forfeit`, {
      method: 'POST',
      headers: authHeaders(),
    });
    expect(forfeited.status).toBe(200);

    const heard = await historyKey(heardId);
    expect(heard?.playCount).toBe((heardBefore?.playCount ?? 0) + 1);
    expect(heard!.correctCount).toBeGreaterThanOrEqual(heardBefore?.correctCount ?? 0);
    expect(heard!.correctCount).toBeLessThanOrEqual((heardBefore?.correctCount ?? 0) + 1);
    if (leftoverId && leftoverId !== heardId) {
      const leftover = await historyKey(leftoverId);
      expect(leftover?.playCount ?? 0).toBe(leftoverBefore?.playCount ?? 0);
    }

    const reset = await fetch(`${bundle.url}/admin/users/${TEST_USER_IDS.admin}/reset-daily`, {
      method: 'POST',
      headers: authHeaders(),
    });
    expect(reset.status).toBe(200);
    const rewound = await historyKey(heardId);
    expect(rewound?.playCount ?? 0).toBe(heardBefore?.playCount ?? 0);
    expect(rewound?.correctCount ?? 0).toBe(heardBefore?.correctCount ?? 0);
  });
});
