// Client-side match state, driven entirely by the typed server contract.
// Player identity is always `userId` (GamePlayer.id). Timing is anchored to the
// server clock via PhaseTiming: localEndsAt = Date.now() + (endsAt - serverNow).
import type {
  GamePlayer,
  GameStartedPayload,
  GameSyncState,
  GameReadyPayload,
  PlayersUpdatePayload,
  RevealSong,
  RoundHistoryEntry,
  RoundRevealPayload,
  RoundStartPayload,
  VictoryData,
  MatchSettingsSnapshot,
  VoteUpdatePayload,
  PeekWindow,
  VideoMode,
} from '@aniquizz/shared';
import { generatePeekWindow, normalizeVideoMode } from '@aniquizz/shared';
export type { RoundHistoryEntry };
export type GamePhase = 'loading' | 'ready' | 'guessing' | 'revealed' | 'ended';
/** Minimal shape the layout needs during guessing (no answer leaks). */
export interface GuessingSong {
  videoKey: string;
  videoStartTime: number;
  peekWindow?: PeekWindow;
}
export type CurrentSong = GuessingSong | RevealSong | null;
export interface GameState {
  phase: GamePhase;
  players: GamePlayer[];
  currentRound: number;
  totalRounds: number;
  currentSong: CurrentSong;
  nextVideoKey: string | null;
  /** Clip to warm ahead of playback (round 1 during intro, next during reveal). */
  preloadTarget: { videoKey: string; videoStartTime: number } | null;
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
  /** Authoritative match config from `game_over` / reconnect sync. */
  matchSettings: MatchSettingsSnapshot | null;
  /** Active guessing-phase video presentation (from round_start / game_started). */
  videoMode: VideoMode;
}
export type GameAction =
  | { type: 'SYNC'; state: GameSyncState; myUserId?: string }
  | { type: 'GAME_STARTED'; payload: GameStartedPayload; clientVideoMode?: VideoMode }
  | { type: 'GAME_READY'; payload: GameReadyPayload }
  | { type: 'PRELOAD'; videoKey: string; videoStartTime: number }
  | { type: 'ROUND_START'; payload: RoundStartPayload; clientVideoMode?: VideoMode }
  | { type: 'ANSWERED'; userId: string }
  | { type: 'ROUND_REVEAL'; payload: RoundRevealPayload; myUserId?: string }
  | { type: 'PLAYERS_UPDATE'; payload: PlayersUpdatePayload }
  | {
      type: 'GAME_OVER';
      victoryData: VictoryData;
      roundHistoryByUserId?: Record<string, RoundHistoryEntry[]>;
      matchSettings?: MatchSettingsSnapshot;
      myUserId?: string;
    }
  | { type: 'VOTE_UPDATE'; payload: VoteUpdatePayload }
  | { type: 'PAUSED'; isPaused: boolean }
  | { type: 'RESUME_SET'; value: number | null };
function historyForUser(
  byUser: Record<string, RoundHistoryEntry[]> | undefined,
  userId: string | undefined,
  fallback: RoundHistoryEntry[],
): RoundHistoryEntry[] {
  if (!byUser || !userId) return fallback;
  return byUser[userId] ?? fallback;
}
function resolveVideoMode(payloadMode: unknown, fallback: VideoMode): VideoMode {
  if (payloadMode === 'blurred' || payloadMode === 'peek' || payloadMode === 'hidden') {
    return payloadMode;
  }
  return normalizeVideoMode(fallback);
}

function resolvePeekWindow(mode: VideoMode, peekWindow?: PeekWindow): PeekWindow | undefined {
  if (mode !== 'peek') return undefined;
  return peekWindow ?? generatePeekWindow();
}

export function createInitialState(totalRounds: number, players: GamePlayer[] = []): GameState {
  return {
    phase: 'loading',
    players,
    currentRound: 1,
    totalRounds,
    currentSong: null,
    nextVideoKey: null,
    preloadTarget: null,
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
    matchSettings: null,
    videoMode: 'hidden',
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
      const videoMode = resolveVideoMode(p.settings.videoMode, action.clientVideoMode ?? state.videoMode);
      return {
        ...state,
        phase: 'loading',
        players: p.players,
        currentRound: 1,
        totalRounds: p.settings.soundCount,
        nextVideoKey: p.firstVideo,
        preloadTarget: null,
        victoryData: null,
        roundHistory: [],
        matchSettings: null,
        videoMode,
      };
    }
    case 'PRELOAD': {
      return {
        ...state,
        preloadTarget: { videoKey: action.videoKey, videoStartTime: action.videoStartTime },
      };
    }
    case 'GAME_READY': {
      const p = action.payload;
      return {
        ...state,
        phase: 'ready',
        currentRound: 1,
        phaseDurationSeconds: p.durationSeconds,
        phaseEndsAt: localEndsAt({ serverNow: p.serverNow, endsAt: p.startsAt }),
      };
    }
    case 'ROUND_START': {
      const p = action.payload;
      const videoMode = resolveVideoMode(p.videoMode, action.clientVideoMode ?? state.videoMode);
      return {
        ...state,
        phase: 'guessing',
        currentRound: p.round,
        totalRounds: p.totalRounds,
        currentSong: {
          videoKey: p.videoKey,
          videoStartTime: p.videoStartTime,
          peekWindow: resolvePeekWindow(videoMode, p.peekWindow),
        },
        nextVideoKey: null,
        preloadTarget: null,
        qcmChoices: p.choices ?? [],
        duoChoices: p.duo ?? [],
        // `endsAt` already includes the load buffer + end grace; the visible
        // countdown subtracts that tail in the ticker so it lands on 0.
        phaseEndsAt: localEndsAt(p),
        phaseDurationSeconds: p.durationSeconds,
        isGamePaused: false,
        isPausePending: false,
        pauseVotes: 0,
        skipVotes: 0,
        videoMode,
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
      const historyEntry: RoundHistoryEntry | null = action.myUserId
        ? {
            round: p.round,
            song: p.song,
            isCorrect: me?.isCorrect === true,
            points: me?.roundPoints ?? 0,
            myAnswer: me?.currentAnswer ?? null,
            answerType: me?.answerType ?? null,
          }
        : null;
      return {
        ...state,
        phase: 'revealed',
        currentRound: p.round,
        currentSong: p.song,
        players: p.players,
        nextVideoKey: p.nextVideo,
        // Warm the next clip during the reveal so round N+1 also starts instantly.
        preloadTarget: p.nextVideo
          ? { videoKey: p.nextVideo, videoStartTime: p.nextVideoStartTime ?? 0 }
          : null,
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
      return {
        ...state,
        phase: 'ended',
        victoryData: action.victoryData,
        matchSettings: action.matchSettings ?? state.matchSettings,
        players: action.victoryData.rankings,
        roundHistory: historyForUser(
          action.roundHistoryByUserId,
          action.myUserId,
          state.roundHistory,
        ),
      };
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
      let currentRound = s.currentRound || state.currentRound;
      let currentSong = state.currentSong;
      let nextVideoKey = state.nextVideoKey;
      let qcmChoices = state.qcmChoices;
      let duoChoices = state.duoChoices;
      let phaseEndsAt = state.phaseEndsAt;
      let phaseDurationSeconds = state.phaseDurationSeconds;
      let victoryData = state.victoryData;
      let roundHistory = state.roundHistory;
      let matchSettings = state.matchSettings;
      let videoMode = state.videoMode;
      if (s.status === 'finished') {
        phase = 'ended';
        victoryData = s.victoryData ?? state.victoryData;
        roundHistory = historyForUser(s.roundHistoryByUserId, action.myUserId, state.roundHistory);
        matchSettings = s.matchSettings ?? state.matchSettings;
      } else if (s.phase === 'ready' && s.ready) {
        phase = 'ready';
        currentRound = 1;
        phaseEndsAt = localEndsAt(s.ready);
        phaseDurationSeconds = s.ready.durationSeconds;
      } else if (s.phase === 'guessing' && s.round) {
        phase = 'guessing';
        currentRound = s.currentRound;
        const syncMode = resolveVideoMode(s.round.videoMode, state.videoMode);
        currentSong = {
          videoKey: s.round.videoKey,
          videoStartTime: s.round.videoStartTime,
          peekWindow: resolvePeekWindow(syncMode, s.round.peekWindow),
        };
        nextVideoKey = null;
        qcmChoices = s.round.choices ?? [];
        duoChoices = s.round.duo ?? [];
        phaseEndsAt = localEndsAt(s.round);
        phaseDurationSeconds = s.round.durationSeconds;
        videoMode = syncMode;
      } else if (s.phase === 'reveal' && s.reveal) {
        phase = 'revealed';
        currentRound = s.currentRound;
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
        currentRound,
        totalRounds: s.totalRounds || state.totalRounds,
        currentSong,
        nextVideoKey,
        qcmChoices,
        duoChoices,
        phaseEndsAt,
        phaseDurationSeconds,
        victoryData,
        roundHistory,
        matchSettings,
        videoMode,
      };
    }
    default:
      return state;
  }
}
