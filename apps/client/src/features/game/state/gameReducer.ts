// Client-side match state, driven entirely by the typed server contract.
// Player identity is always `userId` (GamePlayer.id). Timing is anchored to the
// server clock via PhaseTiming: localEndsAt = Date.now() + (endsAt - serverNow).

import type {
  GamePlayer,
  GameStartedPayload,
  GameSyncState,
  PlayersUpdatePayload,
  RevealSong,
  RoundRevealPayload,
  RoundStartPayload,
  VictoryData,
  VoteUpdatePayload,
} from '@aniquizz/shared';

export type GamePhase = 'loading' | 'guessing' | 'revealed' | 'ended';

/** Minimal shape the layout needs during guessing (no answer leaks). */
export interface GuessingSong {
  videoKey: string;
  videoStartTime: number;
}

export type CurrentSong = GuessingSong | RevealSong | null;

/** Per-round recap shown on the game-over screen. */
export interface RoundHistoryEntry {
  round: number;
  song: RevealSong;
  isCorrect: boolean;
  points: number;
  /** What the local player actually submitted (null if no answer). */
  myAnswer: string | null;
}

export interface GameState {
  phase: GamePhase;
  players: GamePlayer[];
  currentRound: number;
  totalRounds: number;

  currentSong: CurrentSong;
  nextVideoKey: string | null;

  /** Local wall-clock timestamp at which the current phase ends. */
  phaseEndsAt: number;
  /** Nominal phase duration in seconds (progress-bar denominator). */
  phaseDurationSeconds: number;

  qcmChoices: string[];
  duoChoices: string[];

  isGamePaused: boolean;
  isPausePending: boolean;
  pauseVotes: number;
  pauseRequired: number;
  resumeCountdown: number | null;

  skipVotes: number;
  skipRequired: number;

  victoryData: VictoryData | null;
  roundHistory: RoundHistoryEntry[];
}

export type GameAction =
  | { type: 'SYNC'; state: GameSyncState }
  | { type: 'GAME_STARTED'; payload: GameStartedPayload }
  | { type: 'ROUND_START'; payload: RoundStartPayload }
  | { type: 'ANSWERED'; userId: string }
  | { type: 'ROUND_REVEAL'; payload: RoundRevealPayload; myUserId?: string }
  | { type: 'PLAYERS_UPDATE'; payload: PlayersUpdatePayload }
  | { type: 'GAME_OVER'; victoryData: VictoryData }
  | { type: 'VOTE_UPDATE'; payload: VoteUpdatePayload }
  | { type: 'PAUSED'; isPaused: boolean }
  | { type: 'RESUME_SET'; value: number | null };

export function createInitialState(totalRounds: number, players: GamePlayer[] = []): GameState {
  return {
    phase: 'loading',
    players,
    currentRound: 1,
    totalRounds,
    currentSong: null,
    nextVideoKey: null,
    phaseEndsAt: 0,
    phaseDurationSeconds: 0,
    qcmChoices: [],
    duoChoices: [],
    isGamePaused: false,
    isPausePending: false,
    pauseVotes: 0,
    pauseRequired: 1,
    resumeCountdown: null,
    skipVotes: 0,
    skipRequired: 1,
    victoryData: null,
    roundHistory: [],
  };
}

/** Convert an authoritative PhaseTiming envelope to a local end timestamp. */
function localEndsAt(t: { serverNow: number; endsAt: number }): number {
  return Date.now() + (t.endsAt - t.serverNow);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'GAME_STARTED': {
      const p = action.payload;
      return {
        ...state,
        phase: 'loading',
        players: p.players,
        currentRound: 1,
        totalRounds: p.settings.soundCount,
        nextVideoKey: p.firstVideo,
        victoryData: null,
        roundHistory: [],
      };
    }

    case 'ROUND_START': {
      const p = action.payload;
      return {
        ...state,
        phase: 'guessing',
        currentRound: p.round,
        totalRounds: p.totalRounds,
        currentSong: { videoKey: p.videoKey, videoStartTime: p.videoStartTime },
        nextVideoKey: null,
        qcmChoices: p.choices ?? [],
        duoChoices: p.duo ?? [],
        // The guess clock only starts after the load buffer.
        phaseEndsAt: localEndsAt(p) + (p.startBuffer ?? 0),
        phaseDurationSeconds: p.durationSeconds,
        isGamePaused: false,
        isPausePending: false,
        pauseVotes: 0,
        skipVotes: 0,
        players: state.players.map((pl) => ({
          ...pl,
          hasAnswered: false,
          currentAnswer: null,
          isCorrect: null,
          roundPoints: 0,
          answerType: null,
        })),
      };
    }

    case 'ANSWERED': {
      return {
        ...state,
        players: state.players.map((pl) =>
          String(pl.id) === action.userId ? { ...pl, hasAnswered: true } : pl,
        ),
      };
    }

    case 'ROUND_REVEAL': {
      const p = action.payload;
      const me = action.myUserId
        ? p.players.find((pl) => String(pl.id) === action.myUserId)
        : undefined;
      const historyEntry: RoundHistoryEntry | null = me
        ? {
            round: p.round,
            song: p.song,
            isCorrect: me.isCorrect === true,
            points: me.roundPoints ?? 0,
            myAnswer: me.currentAnswer ?? null,
          }
        : null;
      return {
        ...state,
        phase: 'revealed',
        currentRound: p.round,
        currentSong: p.song,
        players: p.players,
        nextVideoKey: p.nextVideo,
        phaseEndsAt: localEndsAt(p),
        phaseDurationSeconds: p.durationSeconds,
        skipVotes: 0,
        roundHistory: historyEntry
          ? [...state.roundHistory, historyEntry]
          : state.roundHistory,
      };
    }

    case 'PLAYERS_UPDATE': {
      return { ...state, players: action.payload.players };
    }

    case 'GAME_OVER': {
      return { ...state, phase: 'ended', victoryData: action.victoryData };
    }

    case 'VOTE_UPDATE': {
      const v = action.payload;
      if (v.type === 'pause') {
        return {
          ...state,
          pauseVotes: v.count,
          pauseRequired: v.required,
          isPausePending: v.isPending ?? false,
        };
      }
      return { ...state, skipVotes: v.count, skipRequired: v.required };
    }

    case 'PAUSED': {
      return { ...state, isGamePaused: action.isPaused };
    }

    case 'RESUME_SET': {
      return { ...state, resumeCountdown: action.value };
    }

    case 'SYNC': {
      const s = action.state;
      let phase: GamePhase = 'loading';
      let currentSong = state.currentSong;
      let nextVideoKey = state.nextVideoKey;
      let qcmChoices = state.qcmChoices;
      let duoChoices = state.duoChoices;
      let phaseEndsAt = state.phaseEndsAt;
      let phaseDurationSeconds = state.phaseDurationSeconds;

      if (s.status === 'finished') {
        phase = 'ended';
      } else if (s.phase === 'guessing' && s.round) {
        phase = 'guessing';
        currentSong = { videoKey: s.round.videoKey, videoStartTime: s.round.videoStartTime };
        nextVideoKey = null;
        qcmChoices = s.round.choices ?? [];
        duoChoices = s.round.duo ?? [];
        phaseEndsAt = localEndsAt(s.round);
        phaseDurationSeconds = s.round.durationSeconds;
      } else if (s.phase === 'reveal' && s.reveal) {
        phase = 'revealed';
        currentSong = s.reveal.song;
        nextVideoKey = s.reveal.nextVideo;
        phaseEndsAt = localEndsAt(s.reveal);
        phaseDurationSeconds = s.reveal.durationSeconds;
      } else {
        // intro / waiting
        phase = 'loading';
        nextVideoKey = s.introFirstVideo ?? nextVideoKey;
      }

      return {
        ...state,
        phase,
        players: s.players,
        currentRound: s.currentRound || state.currentRound,
        totalRounds: s.totalRounds || state.totalRounds,
        currentSong,
        nextVideoKey,
        qcmChoices,
        duoChoices,
        phaseEndsAt,
        phaseDurationSeconds,
      };
    }

    default:
      return state;
  }
}
