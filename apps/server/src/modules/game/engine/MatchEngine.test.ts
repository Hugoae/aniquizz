import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_CONFIG, revealDurationMs } from '@aniquizz/shared';
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
        playlist: [
          makePlaylistItem({
            anime: 'Cowboy Bebop',
            validAnswers: ['Cowboy Bebop'],
            choices: ['Bleach', 'One Piece', 'Dragon Ball', 'Death Note'],
            duo: ['Bleach', 'One Piece'],
          }),
          makePlaylistItem({ id: 2, anime: 'Bleach', validAnswers: ['Bleach'] }),
        ],
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Cowboy Bebop', 'typing');
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

    it('honours mix typing even when the answer matches a QCM choice', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'mix' },
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'typing');
      engine.forceEndRound();

      expect(getPlayer(room, 'player-1').answerType).toBe('typing');
      expect(getPlayer(room, 'player-1').roundPoints).toBe(GAME_CONFIG.SCORING.TYPING);
    });

    it('keeps mix typing when the title is not an offered choice', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'mix' },
        playlist: [
          makePlaylistItem({
            anime: 'Cowboy Bebop',
            validAnswers: ['Cowboy Bebop'],
            choices: ['Bleach', 'One Piece', 'Dragon Ball', 'Death Note'],
            duo: ['Bleach', 'One Piece'],
          }),
          makePlaylistItem({ id: 2, anime: 'Bleach', validAnswers: ['Bleach'] }),
        ],
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Cowboy Bebop', 'typing');
      engine.forceEndRound();

      expect(getPlayer(room, 'player-1').answerType).toBe('typing');
    });
  });

  describe('handleAnswer — artist precision', () => {
    const artistPlaylist = [
      makePlaylistItem({
        anime: 'Kokoro Connect',
        title: 'Kimiiro Signal',
        artist: 'CHiCO, HoneyWorks',
        validAnswers: ['CHiCO', 'HoneyWorks', 'CHiCO, HoneyWorks'],
        choices: ['CHiCO', 'LiSA', 'Aimer', 'YOASOBI'],
        duo: ['CHiCO', 'LiSA'],
      }),
      makePlaylistItem({ id: 2, anime: 'Bleach', validAnswers: ['LiSA'] }),
    ];

    it('accepts a credited unit as a correct typing answer', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'typing', precision: 'artist' },
        playlist: artistPlaylist,
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'HoneyWorks', 'typing');
      engine.forceEndRound();

      const player = getPlayer(room, 'player-1');
      expect(player.isCorrect).toBe(true);
      expect(player.roundPoints).toBe(GAME_CONFIG.SCORING.TYPING);
    });

    it('rejects the anime title and the song title', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'typing', precision: 'artist' },
        playlist: artistPlaylist,
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Kokoro Connect', 'typing');
      engine.forceEndRound();
      expect(getPlayer(room, 'player-1').isCorrect).toBe(false);
    });

    it('accepts the billed-first unit on QCM', async () => {
      const { room, engine } = createEngineHarness({
        settings: { responseType: 'qcm', precision: 'artist' },
        playlist: artistPlaylist,
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'CHiCO', 'qcm');
      engine.forceEndRound();
      expect(getPlayer(room, 'player-1').isCorrect).toBe(true);
      expect(getPlayer(room, 'player-1').roundPoints).toBe(GAME_CONFIG.SCORING.QCM);
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
      await vi.advanceTimersByTimeAsync(revealDurationMs(10));

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
      await vi.advanceTimersByTimeAsync(revealDurationMs(10));

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

    it('reveals immediately in solo when revealAfterAnswer is set', async () => {
      const { emitted, engine } = createEngineHarness({
        settings: { mode: 'solo', maxPlayers: 1 },
        playerIds: ['player-1'],
      });
      await advanceToGuessing(engine);
      emitted.length = 0;

      engine.handleAnswer('player-1', 'Naruto', 'typing', { revealAfterAnswer: true });

      expect(emitted.some((e) => e.event === 'game:answered')).toBe(true);
      expect(emitted.some((e) => e.event === 'round_reveal')).toBe(true);
      expect(engine.getSyncState().phase).toBe('reveal');
    });

    it('ignores revealAfterAnswer in multiplayer', async () => {
      const { emitted, engine } = createEngineHarness();
      await advanceToGuessing(engine);
      emitted.length = 0;

      engine.handleAnswer('player-1', 'Naruto', 'typing', { revealAfterAnswer: true });

      expect(emitted.some((e) => e.event === 'game:answered')).toBe(true);
      expect(emitted.some((e) => e.event === 'round_reveal')).toBe(false);
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

      await vi.advanceTimersByTimeAsync(revealDurationMs(10));

      expect(engine.getSyncState().phase).toBe('guessing');
      expect(engine.getSyncState().currentRound).toBe(2);
    });

    it('uses a reveal window equal to a short guess clock', async () => {
      const playlist = [
        makePlaylistItem({ id: 1, guessDuration: 5 }),
        makePlaylistItem({ id: 2, anime: 'Bleach', validAnswers: ['Bleach'], guessDuration: 5 }),
      ];
      const { engine, emitted } = createEngineHarness({
        playlist,
        settings: { guessDuration: 5 },
      });
      await advanceToGuessing(engine);
      engine.forceEndRound();

      const reveal = emitted.find((e) => e.event === 'round_reveal');
      expect((reveal?.payload as { durationSeconds: number }).durationSeconds).toBe(5);
      expect(engine.getSyncState().reveal?.durationSeconds).toBe(5);

      await vi.advanceTimersByTimeAsync(4000);
      expect(engine.getSyncState().phase).toBe('reveal');

      await vi.advanceTimersByTimeAsync(1000);
      expect(engine.getSyncState().phase).toBe('guessing');
      expect(engine.getSyncState().currentRound).toBe(2);
    });

    it('caps the reveal window at 15s when the guess clock is longer', async () => {
      const playlist = [
        makePlaylistItem({ id: 1, guessDuration: 20 }),
        makePlaylistItem({ id: 2, anime: 'Bleach', validAnswers: ['Bleach'], guessDuration: 20 }),
      ];
      const { engine, emitted } = createEngineHarness({
        playlist,
        settings: { guessDuration: 20 },
      });
      await advanceToGuessing(engine);
      engine.forceEndRound();

      const reveal = emitted.find((e) => e.event === 'round_reveal');
      expect((reveal?.payload as { durationSeconds: number }).durationSeconds).toBe(15);
      expect(engine.getSyncState().reveal?.durationSeconds).toBe(15);

      await vi.advanceTimersByTimeAsync(14000);
      expect(engine.getSyncState().phase).toBe('reveal');

      await vi.advanceTimersByTimeAsync(1000);
      expect(engine.getSyncState().phase).toBe('guessing');
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
      const players = (
        reveal!.payload as { players: { id: string; speedRank?: number; speedBonus?: number }[] }
      ).players;
      const fast = players.find((p) => String(p.id) === 'player-1');
      expect(fast?.speedRank).toBe(1);
      expect(fast?.speedBonus).toBe(2);
    });
  });

  describe('votes — membership and disconnect', () => {
    it('ignores skip votes from users who are not in the room', async () => {
      const { engine } = createEngineHarness({
        playerIds: ['player-1', 'player-2'],
      });
      await advanceToGuessing(engine);

      engine.voteSkip('outsider');

      expect(engine.getSyncState().phase).toBe('guessing');
    });

    it('drops a skip vote when that player disconnects', async () => {
      const { room, engine, emitted } = createEngineHarness({
        playerIds: ['player-1', 'player-2', 'player-3'],
      });
      await advanceToGuessing(engine);

      engine.voteSkip('player-2');
      room.markDisconnected('socket-1');

      const skipUpdates = emitted.filter(
        (e) => e.event === 'vote_update' && (e.payload as { type?: string }).type === 'skip',
      );
      const last = skipUpdates[skipUpdates.length - 1]?.payload as { count: number };
      expect(last.count).toBe(0);
      expect(engine.getSyncState().phase).toBe('guessing');
    });
  });

  describe('Room.forceEndRound', () => {
    it('ignores skip in multiplayer even from a member', async () => {
      const { room, engine } = createEngineHarness();
      await advanceToGuessing(engine);

      room.forceEndRound('player-1');

      expect(engine.getSyncState().phase).toBe('guessing');
    });

    it('lets a solo member skip the current round', async () => {
      const { room, engine } = createEngineHarness({
        settings: { maxPlayers: 1, mode: 'solo' },
        playerIds: ['player-1'],
      });
      await advanceToGuessing(engine);

      room.forceEndRound('outsider');
      expect(engine.getSyncState().phase).toBe('guessing');

      room.forceEndRound('player-1');
      expect(engine.getSyncState().phase).toBe('reveal');
    });
  });

  describe('sync', () => {
    it('reuses the same peek window across guessing syncs', async () => {
      const { engine } = createEngineHarness({
        settings: { videoMode: 'peek' },
      });
      await advanceToGuessing(engine);

      const first = engine.getSyncState().round?.peekWindow;
      const second = engine.getSyncState().round?.peekWindow;
      expect(first).toBeDefined();
      expect(second).toEqual(first);
    });

    it('includes victory data when a finished match is synced', async () => {
      const { room, engine } = createEngineHarness({
        playlist: [makePlaylistItem({ id: 1 })],
        playerIds: ['player-1'],
        settings: { maxPlayers: 1, mode: 'solo', soundCount: 1 },
      });
      await advanceToGuessing(engine);

      engine.handleAnswer('player-1', 'Naruto', 'qcm');
      engine.forceEndRound();
      await vi.advanceTimersByTimeAsync(revealDurationMs(10));
      await Promise.resolve();
      await Promise.resolve();

      expect(room.status).toBe('finished');
      const sync = room.getSyncState();
      expect(sync.status).toBe('finished');
      expect(sync.victoryData).toBeDefined();
    });

    it('persists SongHistory ids for started rounds only', async () => {
      const { engine, repo } = createEngineHarness({
        playlist: [
          makePlaylistItem({ id: 11 }),
          makePlaylistItem({ id: 22, anime: 'Bleach', validAnswers: ['Bleach'] }),
        ],
        playerIds: ['player-1'],
        settings: { maxPlayers: 1, mode: 'solo', soundCount: 2 },
      });
      await advanceToGuessing(engine);
      engine.forceEndRound();
      await vi.advanceTimersByTimeAsync(revealDurationMs(10));
      engine.forceEndRound();
      await vi.advanceTimersByTimeAsync(revealDurationMs(10));
      await Promise.resolve();
      await Promise.resolve();

      expect(vi.mocked(repo.persistMatch)).toHaveBeenCalled();
      const persisted = vi.mocked(repo.persistMatch).mock.calls[0]?.[0] as { songIds: number[] };
      expect(persisted.songIds).toEqual([11, 22]);
    });
  });

  describe('fallback notifications', () => {
    it('emits a toast when the difficulty cascade relaxed the pool', async () => {
      const { engine, emitted, builder } = createEngineHarness();
      vi.mocked(builder.build).mockResolvedValue({
        playlist: [makePlaylistItem({ id: 1 }), makePlaylistItem({ id: 2 })],
        fallbackUsed: false,
        difficultyRelaxed: true,
      });

      await engine.start();
      await vi.advanceTimersByTimeAsync(1000);

      expect(
        emitted.some(
          (e) =>
            e.event === 'game:fallback_notification' &&
            String((e.payload as { message: string }).message).includes('difficult'),
        ),
      ).toBe(true);
    });
  });
});
