import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { prisma } from '@aniquizz/database';
import {
  DAILY_LEAK_KEYS,
  dailyCalendarDate,
  dailyXp,
  isDailyVictory,
  type DailyPlayState,
  type DailySafeRoundDto,
} from '@aniquizz/shared';
import { createServerBundle, type ServerBundle } from '../test/createServerBundle';
import { hasIntegrationEnv } from '../test/env';
import { getTestAccessToken, TEST_USER_IDS, TEST_USERNAMES } from '../test/testJwt';
import { clearModeration, setModeration } from '../test/dbHelpers';
import { dateFromIsoDay } from '../modules/daily/dailySnapshot';
import { connectSocket, type TestSocket } from '../test/socketHelpers';
import {
  clearDailyEngineForTests,
  setDailyEngineDurationsForTests,
} from '../modules/daily/dailyEngine';

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

describe.skipIf(!hasIntegrationEnv)('daily quiz', () => {
  let bundle: ServerBundle;
  let token: string;
  let player: TestSocket;
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
    player = await connectSocket(bundle.url, token, 'admin_dev');
  });

  afterAll(async () => {
    clearDailyEngineForTests();
    player.disconnect();
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

  beforeEach(async () => {
    clearDailyEngineForTests();
    await prisma.dailyAttempt.deleteMany({
      where: { profileId: TEST_USER_IDS.admin, challengeId },
    });
  });

  function waitFor(check: () => boolean | Promise<boolean>, timeoutMs = 4_000): Promise<void> {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        void Promise.resolve(check()).then(
          (ok) => {
            if (ok) {
              resolve();
              return;
            }
            if (Date.now() - started > timeoutMs) {
              reject(new Error('timed out'));
              return;
            }
            setTimeout(tick, 20);
          },
          (error: unknown) => reject(error),
        );
      };
      tick();
    });
  }

  function nextState(): Promise<DailyPlayState> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('timed out waiting for daily:state'));
      }, 8_000);
      const onState = (state: DailyPlayState) => {
        cleanup();
        resolve(state);
      };
      const onError = (payload: { message: string; status: number }) => {
        cleanup();
        reject(Object.assign(new Error(payload.message), { status: payload.status }));
      };
      const cleanup = () => {
        clearTimeout(timer);
        player.off('daily:state', onState);
        player.off('daily:error', onError);
      };
      player.on('daily:state', onState);
      player.on('daily:error', onError);
    });
  }

  async function startRound(): Promise<DailySafeRoundDto> {
    const pending = nextState();
    player.emit('daily:start');
    const state = await pending;
    if (state.kind !== 'round') throw new Error('expected a round');
    return state.attempt;
  }

  async function lockRound(attemptId: string): Promise<DailySafeRoundDto> {
    const pending = nextState();
    player.emit('daily:lock', { attemptId });
    const state = await pending;
    if (state.kind !== 'round' || !state.attempt.reveal) throw new Error('expected a reveal');
    return state.attempt;
  }

  it('returns public today metadata without answers', async () => {
    const res = await fetch(`${bundle.url}/daily/today`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.challengeDate).toBe(today);
    expect(body.status).toBe('guest');
    expect(JSON.stringify(body)).not.toContain('validAnswers');
  });

  it('creates one attempt and replays it when start is emitted twice', async () => {
    const seen: DailyPlayState[] = [];
    const onState = (state: DailyPlayState) => seen.push(state);
    player.on('daily:state', onState);
    player.emit('daily:start');
    player.emit('daily:start');
    await waitFor(() => seen.filter((state) => state.kind === 'round').length >= 2);
    player.off('daily:state', onState);
    const rounds = seen.filter((state) => state.kind === 'round');
    const first = rounds[0];
    const second = rounds[1];
    if (first.kind !== 'round' || second.kind !== 'round') throw new Error('expected rounds');
    expect(first.attempt.attemptId).toBe(second.attempt.attemptId);
    expect(first.attempt.choices).toHaveLength(4);
    expect(first.attempt.phase).toBe('guessing');
    const leak = JSON.stringify(first.attempt);
    expect(leak).not.toContain('validAnswers');
    for (const key of DAILY_LEAK_KEYS) {
      if (key === 'cover') continue;
      expect(leak.includes(`"${key}"`)).toBe(false);
    }
    expect(
      await prisma.dailyAttempt.count({
        where: { challengeId, profileId: TEST_USER_IDS.admin },
      }),
    ).toBe(1);
  });

  it('rejects an unknown choice, then grades the stored choice when the server locks', async () => {
    const round = await startRound();
    const pendingError = nextState();
    player.emit('daily:answer', { attemptId: round.attemptId, selected: 'Death Note' });
    await expect(pendingError).rejects.toThrow(/proposée/);

    player.emit('daily:answer', { attemptId: round.attemptId, selected: round.choices[0] });
    const revealed = await lockRound(round.attemptId);
    expect(revealed.reveal?.selectedLabel).toBe(round.choices[0]);
    expect(revealed.reveal?.song.anime).toBeTruthy();

    const again = await lockRound(round.attemptId);
    expect(again.reveal?.song.anime).toBe(revealed.reveal?.song.anime);
  });

  it('records a miss when the guess is locked with no choice', async () => {
    const round = await startRound();
    const revealed = await lockRound(round.attemptId);
    expect(revealed.reveal?.selectedLabel).toBeNull();
    expect(revealed.reveal?.isCorrect).toBe(false);
    expect(revealed.reveal?.song.anime).toBeTruthy();
  });

  it('exposes the leaderboard before play and does not bump ordinary stats', async () => {
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

    const round = await startRound();
    const pending = nextState();
    player.emit('daily:forfeit', { attemptId: round.attemptId });
    const forfeited = await pending;
    if (forfeited.kind !== 'result') throw new Error('expected a result');
    expect(forfeited.result.xpAwarded).toBeGreaterThanOrEqual(dailyXp(0));
    expect(forfeited.result.correctCount).toBe(0);
    expect(forfeited.result.recap).toHaveLength(5);
    expect(forfeited.result.streak).toBeGreaterThanOrEqual(1);

    const again = nextState();
    player.emit('daily:forfeit', { attemptId: round.attemptId });
    const againState = await again;
    if (againState.kind !== 'result') throw new Error('expected a result');
    expect(againState.result.xpAwarded).toBe(forfeited.result.xpAwarded);

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
    const board = await fetch(`${bundle.url}/daily/leaderboard`, { headers: authHeaders() });
    const boardBody = await board.json();
    expect(
      boardBody.entries.some(
        (entry: { profileId: string; username: string }) =>
          entry.profileId === TEST_USER_IDS.admin ||
          entry.username.toLowerCase() === TEST_USERNAMES[TEST_USER_IDS.admin],
      ),
    ).toBe(false);
  });

  it('forfeits an abandoned run on disconnect and keeps the graded round', async () => {
    const round = await startRound();
    player.emit('daily:answer', { attemptId: round.attemptId, selected: round.choices[0] });
    const revealed = await lockRound(round.attemptId);
    expect(revealed.reveal?.selectedLabel).toBe(round.choices[0]);
    player.disconnect();
    await waitFor(async () => {
      const row = await prisma.dailyAttempt.findUnique({
        where: { id: round.attemptId },
        select: { state: true },
      });
      return row?.state === 'FORFEITED';
    });
    const graded = await prisma.dailyAttemptAnswer.findFirst({
      where: { attemptId: round.attemptId, selectedLabel: round.choices[0] },
    });
    expect(graded?.isCorrect).toBeTypeOf('boolean');
    player = await connectSocket(bundle.url, token, 'admin_dev');
  });

  it('ignores leftover expiresAt and rejects a banned player', async () => {
    const round = await startRound();
    await prisma.dailyAttempt.update({
      where: { id: round.attemptId },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const todayRes = await fetch(`${bundle.url}/daily/today`, { headers: authHeaders() });
    const todayBody = await todayRes.json();
    expect(todayBody.status).toBe('in_progress');
    expect(todayBody.openAttemptId).toBe(round.attemptId);
    expect(todayBody.result).toBeNull();

    clearDailyEngineForTests();
    await prisma.dailyAttempt.deleteMany({
      where: { profileId: TEST_USER_IDS.admin, challengeId },
    });
    await setModeration(TEST_USER_IDS.admin, { bannedUntil: new Date(Date.now() + 60_000) });
    try {
      const pending = nextState();
      player.emit('daily:start');
      await expect(pending).rejects.toMatchObject({ status: 403 });
    } finally {
      await clearModeration(TEST_USER_IDS.admin);
    }
  });

  it('lets an admin revert today XP and replay the daily', async () => {
    await prisma.dailyPlayerStats.deleteMany({ where: { profileId: TEST_USER_IDS.admin } });
    const priorXp = (
      await prisma.profile.findUniqueOrThrow({
        where: { id: TEST_USER_IDS.admin },
        select: { xp: true },
      })
    ).xp;
    const round = await startRound();
    const pending = nextState();
    player.emit('daily:forfeit', { attemptId: round.attemptId });
    const forfeited = await pending;
    if (forfeited.kind !== 'result') throw new Error('expected a result');
    const settled = await prisma.dailyAttempt.findUniqueOrThrow({
      where: { id: round.attemptId },
      select: { won: true, activeRoundCount: true, correctCount: true, rank: true },
    });
    expect(settled.activeRoundCount).toBe(5);
    expect(settled.won).toBe(isDailyVictory(settled.correctCount, settled.activeRoundCount));
    expect(settled.rank).toBeGreaterThanOrEqual(1);
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
    const replay = await startRound();
    expect(replay.phase).toBe('guessing');
    expect(replay.attemptId).not.toBe(round.attemptId);
  });

  it('lets Suivant skip the remaining reveal window', async () => {
    const round = await startRound();
    player.emit('daily:answer', { attemptId: round.attemptId, selected: round.choices[0] });
    const revealed = await lockRound(round.attemptId);
    const revealMsLeft = new Date(revealed.reveal?.revealEndsAt ?? 0).getTime() - Date.now();
    expect(revealMsLeft).toBeGreaterThan(12_000);
    expect(revealMsLeft).toBeLessThan(16_000);
    const pending = nextState();
    player.emit('daily:next', { attemptId: round.attemptId });
    const next = await pending;
    if (next.kind !== 'round') throw new Error('expected the next round');
    expect(next.attempt.position).toBe(2);
    expect(next.attempt.phase).toBe('guessing');
    expect(next.attempt.reveal).toBeNull();
  });

  it('does not finish a live run when today is read during the reveal', async () => {
    const round = await startRound();
    await lockRound(round.attemptId);
    const todayRes = await fetch(`${bundle.url}/daily/today`, { headers: authHeaders() });
    const todayBody = await todayRes.json();
    expect(todayBody.status).toBe('in_progress');
    expect(todayBody.openAttemptId).toBe(round.attemptId);
    const row = await prisma.dailyAttempt.findUniqueOrThrow({
      where: { id: round.attemptId },
      select: { state: true, currentRound: true },
    });
    expect(row.state).toBe('IN_PROGRESS');
    expect(row.currentRound).toBe(1);
    expect(await prisma.dailyAttemptAnswer.count({ where: { attemptId: round.attemptId } })).toBe(
      0,
    );
  });

  it('writes heard clips for rounds that started and skips the rest on forfeit', async () => {
    const rounds = await prisma.dailyChallengeRound.findMany({
      where: { challengeId },
      orderBy: { position: 'asc' },
      select: { position: true, songId: true, snapshot: true },
    });
    const songIdOf = (round: { songId: number | null; snapshot: unknown } | undefined) => {
      if (!round) return null;
      if (round.songId != null && round.songId > 0) return round.songId;
      const snap = round.snapshot as { id?: unknown } | null;
      return typeof snap?.id === 'number' && snap.id > 0 ? snap.id : null;
    };
    const heardId = songIdOf(rounds.find((round) => round.position === 1));
    const leftoverId = songIdOf(rounds.find((round) => round.position === 5));
    if (heardId == null) throw new Error('daily round 1 must reference a catalogue Song');
    const historyKey = (songId: number) =>
      prisma.songHistory.findUnique({
        where: { profileId_songId: { profileId: TEST_USER_IDS.admin, songId } },
      });
    const heardBefore = await historyKey(heardId);
    const leftoverBefore =
      leftoverId && leftoverId !== heardId ? await historyKey(leftoverId) : null;

    const round = await startRound();
    player.emit('daily:answer', { attemptId: round.attemptId, selected: round.choices[0] });
    await lockRound(round.attemptId);
    const pending = nextState();
    player.emit('daily:forfeit', { attemptId: round.attemptId });
    const forfeited = await pending;
    expect(forfeited.kind).toBe('result');

    const heard = await historyKey(heardId);
    expect(heard?.playCount).toBe((heardBefore?.playCount ?? 0) + 1);
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
  });

  it('pushes the reveal and the next round when the server clock expires', async () => {
    setDailyEngineDurationsForTests(80, 80);
    try {
      const seen: DailyPlayState[] = [];
      const onState = (state: DailyPlayState) => seen.push(state);
      player.on('daily:state', onState);
      player.emit('daily:start');
      await waitFor(
        () =>
          seen.some(
            (state) =>
              state.kind === 'round' && state.attempt.position === 2 && !state.attempt.reveal,
          ),
        4_000,
      );
      player.off('daily:state', onState);
      const reveal = seen.find((state) => state.kind === 'round' && state.attempt.reveal);
      expect(reveal && reveal.kind === 'round' && reveal.attempt.reveal?.selectedLabel).toBeNull();
    } finally {
      setDailyEngineDurationsForTests(15_000, 15_000);
      clearDailyEngineForTests();
    }
  });
});
