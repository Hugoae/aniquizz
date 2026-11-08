import { describe, expect, it } from 'vitest';
import type {
  GamePlayer,
  GameSyncState,
  RevealSong,
  RoundRevealPayload,
  RoundStartPayload,
} from '@aniquizz/shared';
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

function song(id: number, anime: string): RevealSong {
  return {
    id,
    anime,
    title: `Song ${id}`,
    artist: 'A',
    type: 'OP1',
    difficulty: 'easy',
    videoKey: `clip-${id}`,
    videoStartTime: 0,
  };
}

function reveal(round: number, s: RevealSong, isCorrect: boolean): RoundRevealPayload {
  return {
    round,
    song: s,
    players: [{ ...player('u1'), isCorrect }],
    nextVideo: null,
    nextVideoStartTime: null,
    serverNow: 1_000,
    endsAt: 4_000,
    durationSeconds: 3,
  };
}

describe('gameReducer time-attack feedback', () => {
  it('cues a wrong answer with the tax delta and keeps recent titles untouched', () => {
    const state = gameReducer(createInitialState(20), {
      type: 'TIME_ATTACK_BUDGET',
      payload: { remainingMs: 57_000, foundCount: 0, tax: 'wrong' },
    });
    expect(state.stageFeedback).toMatchObject({ kind: 'wrong', deltaMs: -3000, seq: 1 });
    expect(state.recentTitles).toEqual([]);
  });

  it('bumps seq on every event so repeated wrong answers replay the cue', () => {
    let state = createInitialState(20);
    for (let i = 0; i < 2; i++) {
      state = gameReducer(state, {
        type: 'TIME_ATTACK_BUDGET',
        payload: { remainingMs: 50_000, foundCount: 0, tax: 'wrong' },
      });
    }
    expect(state.stageFeedback?.seq).toBe(2);
  });

  it('cues and records a found title when the reveal is disabled', () => {
    const state = gameReducer(createInitialState(20), {
      type: 'TIME_ATTACK_BUDGET',
      payload: {
        remainingMs: 50_000,
        foundCount: 1,
        roundResult: { outcome: 'found', song: song(1, 'Naruto') },
      },
    });
    expect(state.stageFeedback).toMatchObject({ kind: 'correct' });
    expect(state.recentTitles[0]).toMatchObject({ anime: 'Naruto', outcome: 'found' });
    expect(state.foundCount).toBe(1);
  });

  it('keeps the server medal cue and the next skip cost', () => {
    const state = gameReducer(createInitialState(20), {
      type: 'TIME_ATTACK_BUDGET',
      payload: {
        remainingMs: 50_000,
        foundCount: 4,
        nextSkipTaxMs: 7000,
        nextMedal: { tier: 'silver', pointsNeeded: 2 },
      },
    });
    expect(state.nextSkipTaxMs).toBe(7000);
    expect(state.nextMedal).toEqual({ tier: 'silver', pointsNeeded: 2 });
    expect(state.stageFeedback).toBeNull();
  });

  it('does not cue plain budget syncs', () => {
    const state = gameReducer(createInitialState(20), {
      type: 'TIME_ATTACK_BUDGET',
      payload: { remainingMs: 60_000, foundCount: 0 },
    });
    expect(state.stageFeedback).toBeNull();
  });

  it('records found, missed and skipped titles newest first, capped at five', () => {
    let state = createInitialState(20);
    state = gameReducer(state, {
      type: 'ROUND_REVEAL',
      payload: reveal(1, song(1, 'Naruto'), true),
      myUserId: 'u1',
    });
    expect(state.stageFeedback?.kind).toBe('correct');
    state = gameReducer(state, {
      type: 'ROUND_REVEAL',
      payload: reveal(2, song(2, 'Bleach'), false),
      myUserId: 'u1',
    });
    expect(state.stageFeedback?.kind).toBe('missed');
    state = { ...state, currentRound: 3 };
    state = gameReducer(state, {
      type: 'TIME_ATTACK_BUDGET',
      payload: {
        remainingMs: 40_000,
        foundCount: 1,
        tax: 'skip',
        taxMs: 7000,
        roundResult: { outcome: 'skipped', song: song(3, 'One Piece') },
      },
    });
    expect(state.stageFeedback).toMatchObject({ kind: 'skip', deltaMs: -7000 });
    expect(state.recentTitles.map((t) => [t.anime, t.outcome])).toEqual([
      ['One Piece', 'skipped'],
      ['Bleach', 'missed'],
      ['Naruto', 'found'],
    ]);

    for (let r = 4; r <= 8; r++) {
      state = gameReducer(state, {
        type: 'ROUND_REVEAL',
        payload: reveal(r, song(r, `Anime ${r}`), true),
        myUserId: 'u1',
      });
    }
    expect(state.recentTitles).toHaveLength(5);
    expect(state.recentTitles[0].anime).toBe('Anime 8');
  });
});
