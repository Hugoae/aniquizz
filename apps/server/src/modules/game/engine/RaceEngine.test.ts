import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameOverPayload, RaceBoardPayload } from '@aniquizz/shared';
import { revealClockMs, TIME_ATTACK_REVEAL_SECONDS } from '@aniquizz/shared';
import {
  advanceRaceToGuessing,
  createRaceHarness,
  getPlayer,
  makePlaylistItem,
  type EmittedEvent,
} from './matchEngineTestHarness';

vi.mock('../../../utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const playlist = Array.from({ length: 12 }, (_, i) =>
  makePlaylistItem({
    id: i + 1,
    anime: `Anime ${i + 1}`,
    validAnswers: [`Anime ${i + 1}`],
  }),
);

const ROOM = 'test-room';
const SOCKET = { 'player-1': 'socket-0', 'player-2': 'socket-1', 'player-3': 'socket-2' } as const;

const named = (emitted: EmittedEvent[], event: string) => emitted.filter((e) => e.event === event);
const lastBoard = (emitted: EmittedEvent[]) =>
  named(emitted, 'race:board').at(-1)!.payload as RaceBoardPayload;

describe('RaceEngine', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sends round_start to each lane socket, never to the room channel', async () => {
    const { engine, emitted } = createRaceHarness({ playlist });
    await advanceRaceToGuessing(engine);

    const starts = named(emitted, 'round_start');
    expect(starts.map((e) => e.target).sort()).toEqual(['socket-0', 'socket-1']);
    expect(starts.every((e) => e.target !== ROOM)).toBe(true);
    expect(named(emitted, 'game:answered')).toHaveLength(0);
  });

  it('advances only the lane that found the title and hides the title from others', async () => {
    const { engine, emitted } = createRaceHarness({ playlist });
    await advanceRaceToGuessing(engine);

    engine.handleAnswer('player-2', 'wrong guess', 'typing');
    engine.handleAnswer('player-1', 'Anime 1', 'typing');

    const reveals = named(emitted, 'round_reveal');
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.target).toBe(SOCKET['player-1']);
    const players = (reveals[0]!.payload as { players: { id: string; currentAnswer: unknown }[] })
      .players;
    // The opponent's wrong guess must not leak into this lane's reveal.
    expect(players.find((p) => p.id === 'player-2')!.currentAnswer).toBeNull();
    expect(players.find((p) => p.id === 'player-1')!.currentAnswer).toBe('Anime 1');

    const board = lastBoard(emitted);
    expect(board.entries.find((e) => e.userId === 'player-1')!.foundCount).toBe(1);
    expect(board.entries.find((e) => e.userId === 'player-1')!.streak).toBe(1);
    expect(board.entries.find((e) => e.userId === 'player-2')!.foundCount).toBe(0);
    expect(board.entries.find((e) => e.userId === 'player-2')!.streak).toBe(0);

    await vi.advanceTimersByTimeAsync(revealClockMs(TIME_ATTACK_REVEAL_SECONDS));
    const starts = named(emitted, 'round_start').filter((e) => e.target === 'socket-0');
    expect((starts.at(-1)!.payload as { round: number }).round).toBe(2);
    const p2Starts = named(emitted, 'round_start').filter((e) => e.target === 'socket-1');
    expect(p2Starts).toHaveLength(1);
  });

  it('adds the streak prime to that lane only', async () => {
    const { engine, emitted } = createRaceHarness({
      playlist,
      settings: {
        timeAttackReveal: false,
        timeAttackStreakBonus: true,
        timeAttackStreakLength: 3,
        timeAttackStreakBonusSeconds: 5,
      },
    });
    await advanceRaceToGuessing(engine);
    const start = engine.getSyncState('player-1').remainingMs ?? 0;
    await vi.advanceTimersByTimeAsync(5000);

    engine.handleAnswer('player-1', 'Anime 1', 'typing');
    engine.handleAnswer('player-1', 'Anime 2', 'typing');
    engine.handleAnswer('player-1', 'Anime 3', 'typing');

    const bonuses = named(emitted, 'timeAttack:budget').filter(
      (event) => (event.payload as { bonusMs?: number }).bonusMs != null,
    );
    expect(bonuses).toHaveLength(1);
    expect(bonuses[0]!.target).toBe(SOCKET['player-1']);
    expect(bonuses[0]!.payload).toMatchObject({ bonusMs: 5000 });

    const board = lastBoard(emitted);
    const mine = board.entries.find((entry) => entry.userId === 'player-1')!;
    const other = board.entries.find((entry) => entry.userId === 'player-2')!;
    expect(mine.streak).toBe(3);
    expect(mine.foundCount).toBe(3);
    expect(mine.remainingMs).toBe(other.remainingMs + 5000);
    expect(mine.remainingMs).toBeLessThanOrEqual(start);
  });

  it('lets a player cut their own reveal short and start the next title', async () => {
    const { engine, emitted } = createRaceHarness({ playlist });
    await advanceRaceToGuessing(engine);

    engine.handleAnswer('player-1', 'Anime 1', 'typing');
    engine.forceEndRound('player-1');

    const starts = named(emitted, 'round_start').filter((e) => e.target === 'socket-0');
    expect((starts.at(-1)!.payload as { round: number }).round).toBe(2);
    const board = lastBoard(emitted);
    const mine = board.entries.find((entry) => entry.userId === 'player-1')!;
    expect(mine.foundCount).toBe(1);
    expect(mine.skips).toBe(0);
    expect(mine.heardCount).toBe(2);
    expect(named(emitted, 'round_start').filter((e) => e.target === 'socket-1')).toHaveLength(1);
  });

  it('reveals the title on screen when the budget runs out, then closes the lane', async () => {
    const { engine, emitted } = createRaceHarness({
      playlist: [
        makePlaylistItem({ id: 1, anime: 'Naruto', validAnswers: ['Naruto'], guessDuration: 120 }),
      ],
      settings: { timeBudgetSeconds: 60 },
    });
    await advanceRaceToGuessing(engine);

    await vi.advanceTimersByTimeAsync(60_000);

    const reveal = named(emitted, 'round_reveal').find((e) => e.target === 'socket-0');
    expect(reveal).toBeDefined();
    expect((reveal!.payload as { song: { anime: string } }).song.anime).toBe('Naruto');
    expect(named(emitted, 'race:lane_done')).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(revealClockMs(TIME_ATTACK_REVEAL_SECONDS));
    expect(
      named(emitted, 'race:lane_done')
        .map((e) => e.target)
        .sort(),
    ).toEqual(['socket-0', 'socket-1']);
  });

  it('reveals the skipped title when that skip spends the last seconds', async () => {
    const { engine, emitted } = createRaceHarness({
      playlist,
      settings: { timeBudgetSeconds: 60 },
    });
    await advanceRaceToGuessing(engine);

    // 5+7+9+11+13 = 45 s. The next skip costs 15 s and spends the budget.
    for (let i = 0; i < 5; i++) {
      engine.forceEndRound('player-1');
      await vi.advanceTimersByTimeAsync(revealClockMs(TIME_ATTACK_REVEAL_SECONDS));
    }
    expect(named(emitted, 'race:lane_done')).toHaveLength(0);

    engine.forceEndRound('player-1');
    const reveal = named(emitted, 'round_reveal')
      .filter((e) => e.target === 'socket-0')
      .at(-1);
    expect((reveal!.payload as { skipped?: boolean }).skipped).toBe(true);
    expect(named(emitted, 'race:lane_done')).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(revealClockMs(TIME_ATTACK_REVEAL_SECONDS));
    expect(named(emitted, 'race:lane_done').map((e) => e.target)).toEqual(['socket-0']);
  });

  it('charges a wrong answer and a skip to the acting lane only', async () => {
    const { engine, emitted } = createRaceHarness({ playlist });
    await advanceRaceToGuessing(engine);

    engine.handleAnswer('player-1', 'nope', 'typing');
    engine.forceEndRound('player-1');

    const board = lastBoard(emitted);
    const p1 = board.entries.find((e) => e.userId === 'player-1')!;
    const p2 = board.entries.find((e) => e.userId === 'player-2')!;
    expect(p1.skips).toBe(1);
    expect(p1.heardCount).toBe(1);
    expect(p2.heardCount).toBe(1);
    expect(p1.remainingMs).toBeLessThan(p2.remainingMs - 7_000);
    expect(p2.skips).toBe(0);
    const budgets = named(emitted, 'timeAttack:budget');
    expect(budgets.every((e) => e.target === 'socket-0')).toBe(true);
  });

  it('ignores pause and skip votes: skip stays individual', async () => {
    const { engine, emitted } = createRaceHarness({ playlist });
    await advanceRaceToGuessing(engine);

    engine.votePause('player-1');
    engine.voteSkip('player-1');
    engine.voteSkip('player-2');

    expect(named(emitted, 'vote_update')).toHaveLength(0);
    expect(named(emitted, 'game_paused')).toHaveLength(0);
    expect(named(emitted, 'round_reveal')).toHaveLength(0);
  });

  it('lets a room skip a lane only for versus rooms', async () => {
    const { engine, room, emitted } = createRaceHarness({ playlist });
    await advanceRaceToGuessing(engine);

    room.forceEndRound('player-2');

    const reveals = named(emitted, 'round_reveal');
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.target).toBe('socket-1');
    expect((reveals[0]!.payload as { skipped?: boolean }).skipped).toBe(true);
  });

  it('keeps a disconnected lane racing until its budget runs out', async () => {
    const { engine, room, emitted } = createRaceHarness({ playlist });
    await advanceRaceToGuessing(engine);

    room.markDisconnected('socket-1');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(lastBoard(emitted).entries.find((e) => e.userId === 'player-2')!.finished).toBe(false);

    await vi.advanceTimersByTimeAsync(120_000);
    expect(named(emitted, 'game_over')).toHaveLength(1);
  });

  it('ends a lane alone, then the match once every lane is done', async () => {
    const { engine, emitted, repo } = createRaceHarness({
      playlist,
      settings: { timeBudgetSeconds: 60 },
    });
    await advanceRaceToGuessing(engine);

    // Player 1 burns their budget with skips while player 2 keeps playing.
    for (let i = 0; i < 6; i++) {
      engine.forceEndRound('player-1');
      await vi.advanceTimersByTimeAsync(revealClockMs(TIME_ATTACK_REVEAL_SECONDS));
    }

    const done = named(emitted, 'race:lane_done');
    expect(done.map((e) => e.target)).toEqual(['socket-0']);
    expect(named(emitted, 'game_over')).toHaveLength(0);

    engine.handleAnswer('player-2', 'Anime 1', 'typing');
    await vi.advanceTimersByTimeAsync(120_000);

    const over = named(emitted, 'game_over');
    expect(over).toHaveLength(1);
    expect(over[0]!.target).toBe(ROOM);
    const { victoryData } = over[0]!.payload as GameOverPayload;
    expect(victoryData.race!.standings.map((s) => s.userId)).toEqual(['player-2', 'player-1']);
    expect(victoryData.race!.standings.map((s) => s.rank)).toEqual([1, 2]);
    expect(victoryData.winnerIds).toEqual(['player-2']);
    expect(repo.persistMatch).toHaveBeenCalledTimes(1);
  });

  it('finishes a test race without saving it', async () => {
    const { engine, emitted, repo } = createRaceHarness({
      playlist,
      settings: { testMatch: true, timeBudgetSeconds: 60 },
    });
    await advanceRaceToGuessing(engine);
    engine.handleAnswer('player-1', 'Anime 1', 'typing');
    await vi.advanceTimersByTimeAsync(180_000);

    const over = named(emitted, 'game_over');
    expect(over).toHaveLength(1);
    const payload = over[0]!.payload as GameOverPayload;
    expect(payload.matchSettings.testMatch).toBe(true);
    expect(payload.victoryData.winnerIds.length).toBeGreaterThan(0);
    expect(repo.persistMatch).not.toHaveBeenCalled();
    expect(repo.getXpState).not.toHaveBeenCalled();
  });

  it('breaks a tie on titles with fewer songs heard', async () => {
    const { engine, emitted } = createRaceHarness({ playlist });
    await advanceRaceToGuessing(engine);

    engine.handleAnswer('player-1', 'Anime 1', 'typing');
    engine.forceEndRound('player-2');
    await vi.advanceTimersByTimeAsync(revealClockMs(TIME_ATTACK_REVEAL_SECONDS));
    engine.handleAnswer('player-2', 'Anime 2', 'typing');
    await vi.advanceTimersByTimeAsync(180_000);

    const { victoryData } = named(emitted, 'game_over')[0]!.payload as GameOverPayload;
    const standings = victoryData.race!.standings;
    expect(standings.map((s) => s.found)).toEqual([1, 1]);
    expect(standings[0]!.heard).toBeLessThanOrEqual(standings[1]!.heard);
    expect(standings[0]!.rank).toBe(1);
    expect(victoryData.winnerIds).toEqual([standings[0]!.userId]);
  });

  it('drops the lane of a player who leaves and finishes without them', async () => {
    const { engine, room, emitted } = createRaceHarness({
      playlist,
      playerIds: ['player-1', 'player-2', 'player-3'],
    });
    await advanceRaceToGuessing(engine);

    room.removePlayer('player-3');
    expect(lastBoard(emitted).entries.map((e) => e.userId)).not.toContain('player-3');

    await vi.advanceTimersByTimeAsync(180_000);
    const { victoryData } = named(emitted, 'game_over')[0]!.payload as GameOverPayload;
    expect(victoryData.race!.standings.map((s) => s.userId)).not.toContain('player-3');
  });

  it('keeps a higher-scoring bot in the standings but crowns the best human', async () => {
    const { engine, emitted, room } = createRaceHarness({ playlist });
    const bot = room.addBot({ accuracy: 0, minDelayMs: 60_000, maxDelayMs: 60_000 });
    expect(bot).not.toBeNull();
    await advanceRaceToGuessing(engine);

    const reveal = () => vi.advanceTimersByTimeAsync(revealClockMs(TIME_ATTACK_REVEAL_SECONDS));
    engine.handleAnswer(bot!.userId, 'Anime 1', 'typing');
    await reveal();
    engine.handleAnswer(bot!.userId, 'Anime 2', 'typing');
    await reveal();
    engine.handleAnswer('player-1', 'Anime 1', 'typing');
    await reveal();

    for (const userId of [bot!.userId, 'player-1', 'player-2']) {
      for (let i = 0; i < 6; i++) {
        engine.forceEndRound(userId);
        await reveal();
      }
    }

    const { victoryData } = named(emitted, 'game_over')[0]!.payload as GameOverPayload;
    const standings = victoryData.race!.standings;
    expect(standings.map((s) => s.userId)).toEqual([bot!.userId, 'player-1', 'player-2']);
    expect(standings.map((s) => s.rank)).toEqual([1, 2, 3]);
    expect(victoryData.winnerIds).toEqual(['player-1']);
  });

  it("restores a lane's own state on resync, with the board", async () => {
    const { engine, room } = createRaceHarness({ playlist });
    await advanceRaceToGuessing(engine);
    engine.handleAnswer('player-1', 'Anime 1', 'typing');
    await vi.advanceTimersByTimeAsync(revealClockMs(TIME_ATTACK_REVEAL_SECONDS));

    const sync = room.getSyncState('player-1');
    expect(sync.phase).toBe('guessing');
    expect(sync.round!.round).toBe(2);
    expect(sync.foundCount).toBe(1);
    expect(sync.raceBoard!.entries).toHaveLength(2);
    expect(room.getSyncState('player-2').round!.round).toBe(1);
    expect(getPlayer(room, 'player-1').score).toBe(1);
  });
});
