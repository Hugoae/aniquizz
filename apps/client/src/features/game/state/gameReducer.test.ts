import { describe, expect, it } from 'vitest';
import type { GamePlayer, GameSyncState, RoundStartPayload } from '@aniquizz/shared';
import { createInitialState, gameReducer } from './gameReducer';

const peek = { xPercent: 10, yPercent: 12, sizePercent: 22 };

function player(id: string): GamePlayer {
  return { id, username: 'p', avatar: 'player1', score: 0, streak: 0 };
}

function guessingSync(overrides: Partial<RoundStartPayload> = {}): GameSyncState {
  const round: RoundStartPayload = {
    round: 2,
    totalRounds: 10,
    videoKey: 'clip',
    videoStartTime: 3,
    startBuffer: 500,
    serverNow: 1_000,
    endsAt: 16_000,
    durationSeconds: 15,
    ...overrides,
  };
  return {
    status: 'playing',
    currentRound: 2,
    totalRounds: 10,
    players: [player('u1')],
    phase: 'guessing',
    round,
    reveal: null,
  };
}

describe('gameReducer SYNC', () => {
  it('falls back to the lobby videoMode when the server omits round.videoMode', () => {
    let state = createInitialState(10, [player('u1')]);
    state = { ...state, videoMode: 'blurred' };
    state = gameReducer(state, { type: 'SYNC', state: guessingSync(), myUserId: 'u1' });
    expect(state.phase).toBe('guessing');
    expect(state.videoMode).toBe('blurred');
  });

  it('applies the server peek window then keeps it if a later sync omits it', () => {
    let state = createInitialState(10);
    state = { ...state, videoMode: 'peek' };
    state = gameReducer(state, {
      type: 'SYNC',
      state: guessingSync({ videoMode: 'peek', peekWindow: peek }),
    });
    expect(
      state.currentSong && 'peekWindow' in state.currentSong && state.currentSong.peekWindow,
    ).toEqual(peek);

    state = gameReducer(state, {
      type: 'SYNC',
      state: guessingSync({ videoMode: 'peek' }),
    });
    expect(
      state.currentSong && 'peekWindow' in state.currentSong && state.currentSong.peekWindow,
    ).toEqual(peek);
  });

  it('honours clientVideoMode on GAME_STARTED when settings omit videoMode', () => {
    const state = gameReducer(createInitialState(10), {
      type: 'GAME_STARTED',
      payload: {
        roomId: 'A3K9ZQ',
        settings: { soundCount: 10 } as never,
        players: [player('u1')],
        introDuration: 3,
        firstVideo: null,
      },
      clientVideoMode: 'blurred',
    });
    expect(state.videoMode).toBe('blurred');
    expect(state.phase).toBe('loading');
  });

  it('seeds the time-attack clock from GAME_STARTED settings', () => {
    const state = gameReducer(createInitialState(20), {
      type: 'GAME_STARTED',
      payload: {
        roomId: 'CLM001',
        settings: {
          gameType: 'timeAttack',
          timeBudgetSeconds: 60,
          soundCount: 20,
        } as never,
        players: [player('u1')],
        introDuration: 3,
        firstVideo: null,
      },
    });
    expect(state.remainingMs).toBe(60_000);
    expect(state.foundCount).toBe(0);
  });

  it('restores pause from a time-attack sync snapshot', () => {
    const state = gameReducer(createInitialState(20), {
      type: 'SYNC',
      state: {
        ...guessingSync({ remainingMs: 55_000, foundCount: 0 }),
        status: 'paused',
        remainingMs: 55_000,
        foundCount: 0,
      },
      myUserId: 'u1',
    });
    expect(state.isGamePaused).toBe(true);
    expect(state.remainingMs).toBe(55_000);
  });

  it('keeps pause across ROUND_START (skip while paused)', () => {
    let state = createInitialState(20);
    state = { ...state, isGamePaused: true, remainingMs: 50_000 };
    state = gameReducer(state, {
      type: 'ROUND_START',
      payload: {
        round: 2,
        totalRounds: 20,
        videoKey: 'clip',
        videoStartTime: 0,
        startBuffer: 500,
        serverNow: 1_000,
        endsAt: 11_000,
        durationSeconds: 10,
        remainingMs: 45_000,
        foundCount: 0,
      },
    });
    expect(state.isGamePaused).toBe(true);
    expect(state.remainingMs).toBe(45_000);
    expect(state.duoChoices).toEqual([]);
  });

  it('learns duo choices only from the lifeline event', () => {
    let state = createInitialState(20);
    state = { ...state, duoChoices: ['old', 'pair'] };
    state = gameReducer(state, {
      type: 'ROUND_START',
      payload: {
        round: 2,
        totalRounds: 20,
        videoKey: 'clip',
        videoStartTime: 0,
        startBuffer: 500,
        serverNow: 1_000,
        endsAt: 11_000,
        durationSeconds: 10,
        choices: ['A', 'B', 'C', 'D'],
      },
    });
    expect(state.qcmChoices).toEqual(['A', 'B', 'C', 'D']);
    expect(state.duoChoices).toEqual([]);
    state = gameReducer(state, { type: 'DUO_CHOICES', choices: ['A', 'B'] });
    expect(state.duoChoices).toEqual(['A', 'B']);
  });
});
