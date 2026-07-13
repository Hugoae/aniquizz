import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_CONFIG } from '@aniquizz/shared';
import { sprintScoring } from './ScoringStrategy';
import {
  advanceToGuessing,
  createEngineHarness,
  getPlayer,
  makePlaylistItem,
  makeSettings,
} from './matchEngineTestHarness';

vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MatchEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('handleAnswer — standard scoring', () => {
    it('awards typing points for a correct typing answer in mix mode', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'mix' },
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');
      engine.forceEndRound();

      const player = getPlayer(room, 'player-1');
      expect(player.isCorrect).toBe(true);
      expect(player.answerType).toBe('typing');
      expect(player.roundPoints).toBe(GAME_CONFIG.SCORING.TYPING);
      expect(player.score).toBe(GAME_CONFIG.SCORING.TYPING);
    });

    it('awards qcm points for a correct qcm answer in mix mode', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'mix' },
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'qcm');
      engine.forceEndRound();

      const player = getPlayer(room, 'player-1');
      expect(player.isCorrect).toBe(true);
      expect(player.answerType).toBe('qcm');
      expect(player.roundPoints).toBe(GAME_CONFIG.SCORING.QCM);
      expect(player.score).toBe(GAME_CONFIG.SCORING.QCM);
    });

    it('awards duo points for a correct duo answer in mix mode', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'mix' },
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'duo');
      engine.forceEndRound();

      const player = getPlayer(room, 'player-1');
      expect(player.isCorrect).toBe(true);
      expect(player.answerType).toBe('duo');
      expect(player.roundPoints).toBe(GAME_CONFIG.SCORING.DUO);
      expect(player.score).toBe(GAME_CONFIG.SCORING.DUO);
    });

    it('awards zero points for a wrong answer', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'mix' },
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Wrong Anime', 'typing');
      engine.forceEndRound();

      const player = getPlayer(room, 'player-1');
      expect(player.isCorrect).toBe(false);
      expect(player.roundPoints).toBe(0);
      expect(player.score).toBe(0);
    });
  });

  describe('effectiveAnswerType clamp (anti-cheat)', () => {
    it('forces typing in a typing-only room even when the client claims qcm', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'typing' },
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'qcm');
      engine.forceEndRound();

      const player = getPlayer(room, 'player-1');
      expect(player.answerType).toBe('typing');
      expect(player.roundPoints).toBe(GAME_CONFIG.SCORING.TYPING);
    });

    it('clamps claimed typing to qcm in a qcm-only room', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'qcm' },
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');
      engine.forceEndRound();

      const player = getPlayer(room, 'player-1');
      expect(player.answerType).toBe('qcm');
      expect(player.roundPoints).toBe(GAME_CONFIG.SCORING.QCM);
    });

    it('allows duo lifeline in a qcm-only room', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'qcm' },
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'duo');
      engine.forceEndRound();

      const player = getPlayer(room, 'player-1');
      expect(player.answerType).toBe('duo');
      expect(player.roundPoints).toBe(GAME_CONFIG.SCORING.DUO);
    });

    it('preserves the claimed answer type in mix mode', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'mix' },
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');
      engine.forceEndRound();

      expect(getPlayer(room, 'player-1').answerType).toBe('typing');
    });
  });

  describe('answer change before round end', () => {
    it('lets a player replace a wrong answer with a correct one before reveal', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'mix' },
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Wrong Anime', 'typing');
      engine.handleAnswer('player-1', 'Naruto', 'qcm');
      engine.forceEndRound();

      const player = getPlayer(room, 'player-1');
      expect(player.currentAnswer).toBe('Naruto');
      expect(player.isCorrect).toBe(true);
      expect(player.answerType).toBe('qcm');
      expect(player.roundPoints).toBe(GAME_CONFIG.SCORING.QCM);
      expect(player.score).toBe(GAME_CONFIG.SCORING.QCM);
    });

    it('lets a player replace a correct answer with a wrong one before reveal', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'mix' },
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');
      engine.handleAnswer('player-1', 'Wrong Anime', 'typing');
      engine.forceEndRound();

      const player = getPlayer(room, 'player-1');
      expect(player.isCorrect).toBe(false);
      expect(player.roundPoints).toBe(0);
      expect(player.score).toBe(0);
    });
  });

  describe('streak and maxStreak', () => {
    it('increments streak on consecutive correct rounds and tracks maxStreak', async () => {
      const playlist = [
        makePlaylistItem({ id: 1, anime: 'Naruto', validAnswers: ['Naruto'] }),
        makePlaylistItem({ id: 2, anime: 'Bleach', validAnswers: ['Bleach'] }),
      ];
      const { room, engine } = createEngineHarness({ playlist });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');
      engine.forceEndRound();
      await vi.advanceTimersByTimeAsync(GAME_CONFIG.TIMERS.GUESS_REVEAL);

      engine.handleAnswer('player-1', 'Bleach', 'typing');
      engine.forceEndRound();

      const player = getPlayer(room, 'player-1');
      expect(player.streak).toBe(2);
      expect(player.maxStreak).toBe(2);
      expect(player.matchCorrectCount).toBe(2);
    });

    it('resets streak after a wrong answer but keeps maxStreak', async () => {
      const playlist = [
        makePlaylistItem({ id: 1, anime: 'Naruto', validAnswers: ['Naruto'] }),
        makePlaylistItem({ id: 2, anime: 'Bleach', validAnswers: ['Bleach'] }),
      ];
      const { room, engine } = createEngineHarness({ playlist });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');
      engine.forceEndRound();
      await vi.advanceTimersByTimeAsync(GAME_CONFIG.TIMERS.GUESS_REVEAL);

      engine.handleAnswer('player-1', 'Wrong Anime', 'typing');
      engine.forceEndRound();

      const player = getPlayer(room, 'player-1');
      expect(player.streak).toBe(0);
      expect(player.maxStreak).toBe(1);
      expect(player.matchCorrectCount).toBe(1);
    });
  });

  describe('guess timer — solo/multi parity (26.2.1 regression)', () => {
    it('keeps solo in guessing after the first answer until the round is forced or timed out', async () => {
      const { engine } = createEngineHarness({
        settings: makeSettings({ maxPlayers: 1, mode: 'solo' }),
        playerIds: ['player-1'],
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');

      expect(engine.getSyncState().phase).toBe('guessing');
      engine.forceEndRound();
      expect(engine.getSyncState().phase).toBe('reveal');
    });

    it('keeps multiplayer in guessing when only one player has answered', async () => {
      const { engine } = createEngineHarness({
        settings: { responseType: 'mix', maxPlayers: 4 },
        playerIds: ['player-1', 'player-2'],
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');

      expect(engine.getSyncState().phase).toBe('guessing');
      engine.forceEndRound();
      expect(engine.getSyncState().phase).toBe('reveal');
    });

    it('ends the guessing phase when the round timer expires', async () => {
      const { engine } = createEngineHarness({
        playlist: [makePlaylistItem({ guessDuration: 5 })],
        settings: { guessDuration: 5 },
      });
      await advanceToGuessing(engine);

      const guessMs =
        5 * 1000 + GAME_CONFIG.TIMERS.GUESS_START_BUFFER + GAME_CONFIG.TIMERS.GUESS_END_GRACE;
      await vi.advanceTimersByTimeAsync(guessMs);

      expect(engine.getSyncState().phase).toBe('reveal');
    });
  });

  describe('endRound and round transitions', () => {
    it('emits round_reveal with answer details only after the round ends', async () => {
      const { room, engine, emitted } = createEngineHarness();
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');

      // Mid-guess sync must not leak correctness.
      const midGuessSync = engine.getSyncState();
      const syncP1 = midGuessSync.players.find((p) => String(p.id) === 'player-1');
      expect(syncP1?.isCorrect).toBeNull();
      expect(syncP1?.roundPoints).toBe(0);

      engine.forceEndRound();

      const reveal = emitted.find((e) => e.event === 'round_reveal');
      expect(reveal).toBeDefined();
      const players = (reveal!.payload as { players: { id: string; isCorrect: boolean | null }[] })
        .players;
      const p1 = players.find((p) => String(p.id) === 'player-1');
      expect(p1?.isCorrect).toBe(true);
    });

    it('emits game:answered without leaking answer content during guessing', async () => {
      const { emitted, engine } = createEngineHarness();
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');

      const answered = emitted.find((e) => e.event === 'game:answered');
      expect(answered?.payload).toEqual({ userId: 'player-1' });
      expect(engine.getSyncState().phase).toBe('guessing');
    });

    it('advances from reveal to the next round when the reveal timer elapses', async () => {
      const playlist = [
        makePlaylistItem({ id: 1, anime: 'Naruto', validAnswers: ['Naruto'] }),
        makePlaylistItem({ id: 2, anime: 'Bleach', validAnswers: ['Bleach'] }),
      ];
      const { engine } = createEngineHarness({ playlist });
      await advanceToGuessing(engine);

      engine.forceEndRound();
      expect(engine.getSyncState().phase).toBe('reveal');
      expect(engine.getSyncState().currentRound).toBe(1);

      await vi.advanceTimersByTimeAsync(GAME_CONFIG.TIMERS.GUESS_REVEAL);

      expect(engine.getSyncState().phase).toBe('guessing');
      expect(engine.getSyncState().currentRound).toBe(2);
    });
  });

  describe('Quick Draw — speed podium bonus', () => {
    it('awards typing base + relative podium bonus to fastest correct players', async () => {
      const { room, engine } = createEngineHarness({
        settings: { gameType: 'sprint', responseType: 'typing' },
        scoring: sprintScoring,
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');
      await vi.advanceTimersByTimeAsync(1500);
      engine.handleAnswer('player-2', 'Naruto', 'typing');
      engine.forceEndRound();

      expect(getPlayer(room, 'player-1').score).toBe(GAME_CONFIG.SCORING.TYPING + 2);
      expect(getPlayer(room, 'player-2').score).toBe(GAME_CONFIG.SCORING.TYPING + 1);
      expect(getPlayer(room, 'player-1').speedRank).toBe(1);
      expect(getPlayer(room, 'player-2').speedRank).toBe(2);
    });

    it('awards +0 speed bonus when only one player answered correctly', async () => {
      const { room, engine } = createEngineHarness({
        settings: { gameType: 'sprint', responseType: 'typing' },
        scoring: sprintScoring,
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');
      engine.handleAnswer('player-2', 'Wrong', 'typing');
      engine.forceEndRound();

      expect(getPlayer(room, 'player-1').score).toBe(GAME_CONFIG.SCORING.TYPING);
      expect(getPlayer(room, 'player-1').speedBonus).toBe(0);
      expect(getPlayer(room, 'player-1').speedRank).toBe(1);
    });

    it('exposes speed rank and bonus on round_reveal players', async () => {
      const { engine, emitted } = createEngineHarness({
        settings: { gameType: 'sprint', responseType: 'typing' },
        scoring: sprintScoring,
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');
      await vi.advanceTimersByTimeAsync(800);
      engine.handleAnswer('player-2', 'Naruto', 'typing');
      engine.forceEndRound();

      const reveal = emitted.find((e) => e.event === 'round_reveal');
      const players = (reveal!.payload as { players: { id: string; speedRank?: number; speedBonus?: number }[] })
        .players;
      const fast = players.find((p) => String(p.id) === 'player-1');
      expect(fast?.speedRank).toBe(1);
      expect(fast?.speedBonus).toBe(2);
    });
  });
});
