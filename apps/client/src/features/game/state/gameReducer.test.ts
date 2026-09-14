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
});
