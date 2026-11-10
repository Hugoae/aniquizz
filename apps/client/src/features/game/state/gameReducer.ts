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
  SpeedLeaderboardPayload,
  TimeAttackBudgetPayload,
  TimeAttackNextMedal,
  SoloMedalTargets,
  VictoryData,
  MatchSettingsSnapshot,
  VoteUpdatePayload,
  PeekWindow,
  RaceBoardEntry,
  RaceBoardPayload,
  VideoMode,
  EvolvingRoundCue,
} from '@aniquizz/shared';
import {
  normalizeVideoMode,
  TIME_ATTACK_DEFAULT_BUDGET_SECONDS,
  TIME_ATTACK_SKIP_TAX_MS,
  TIME_ATTACK_WRONG_TAX_MS,
} from '@aniquizz/shared';
export type { RoundHistoryEntry };
export type GamePhase = 'loading' | 'ready' | 'guessing' | 'revealed' | 'ended';
/** Minimal shape the layout needs during guessing (no answer leaks). */
export interface GuessingSong {
  videoKey: string;
  videoStartTime: number;
  peekWindow?: PeekWindow;
}
export type CurrentSong = GuessingSong | RevealSong | null;
export type StageFeedbackKind = 'correct' | 'wrong' | 'skip' | 'missed' | 'bonus';
/** One-shot stage cue; `seq` changes on every event so repeats replay the animation. */
export interface StageFeedback {
  kind: StageFeedbackKind;
  seq: number;
  /** Budget delta in ms. Negative for a tax, positive for a streak prime. */
  deltaMs?: number;
}
export type RecentTitleOutcome = 'found' | 'missed' | 'skipped';
export interface RecentTitle {
  key: string;
  /** 1-based title number in the run. */
  round: number;
  anime: string;
  title: string;
  /** Display label, e.g. "OP1". */
  type: string;
  difficulty: string;
  cover: string | null;
  outcome: RecentTitleOutcome;
  /** Set when this title paid the streak prime. */
  bonusMs?: number;
}
export const RECENT_TITLES_LIMIT = 5;
/** Versus board as received; budgets are interpolated from `receivedAt` while a lane runs. */
export interface RaceBoardState {
  entries: RaceBoardEntry[];
  receivedAt: number;
}
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
  /** Speed bonus — reveal speed board for the current round. */
  speedLeaderboard: SpeedLeaderboardPayload | null;
  remainingMs: number | null;
  foundCount: number;
  budgetSyncedAt: number;
  /** Next skip cost (ms). Null until the server sends a time-attack cue. */
  nextSkipTaxMs: number | null;
  /** Undefined until the first cue. Null means the top medal is already reached. */
  nextMedal: TimeAttackNextMedal | null | undefined;
  /** Chrono found-count bars. Null until the server sends them. */
  medalTargets: SoloMedalTargets | null;
  stageFeedback: StageFeedback | null;
  /** Newest first, capped at `RECENT_TITLES_LIMIT`. Includes time-attack skips. */
  recentTitles: RecentTitle[];
  /** Versus only: live lanes of every player. Null outside a race. */
  raceBoard: RaceBoardState | null;
  /** Versus only: my lane is over and I am waiting for the others. */
  laneDone: boolean;
  /** Évolutif ladder for the song on screen. Null outside that mode. */
  evolving: EvolvingRoundCue | null;
}
export type GameAction =
  | { type: 'SYNC'; state: GameSyncState; myUserId?: string }
  | { type: 'GAME_STARTED'; payload: GameStartedPayload; clientVideoMode?: VideoMode }
  | { type: 'GAME_READY'; payload: GameReadyPayload }
  | { type: 'PRELOAD'; videoKey: string; videoStartTime: number }
  | { type: 'ROUND_START'; payload: RoundStartPayload; clientVideoMode?: VideoMode }
  | { type: 'ANSWERED'; userId: string }
  | { type: 'SPEED_LEADERBOARD'; payload: SpeedLeaderboardPayload }
  | { type: 'TIME_ATTACK_BUDGET'; payload: TimeAttackBudgetPayload }
  | { type: 'RACE_BOARD'; payload: RaceBoardPayload }
  | { type: 'RACE_LANE_DONE'; foundCount: number }
  | { type: 'DUO_CHOICES'; choices: string[] }
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

function resolvePeekWindow(
  mode: VideoMode,
  peekWindow?: PeekWindow,
  existing?: PeekWindow,
): PeekWindow | undefined {
  if (mode !== 'peek') return undefined;
  return peekWindow ?? existing;
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
    speedLeaderboard: null,
    remainingMs: null,
    foundCount: 0,
    budgetSyncedAt: 0,
    nextSkipTaxMs: null,
    nextMedal: undefined,
    medalTargets: null,
    stageFeedback: null,
    recentTitles: [],
    raceBoard: null,
    laneDone: false,
    evolving: null,
  };
}

function revealFeedbackKind(
  me: { isCorrect?: boolean | null; currentAnswer?: string | null },
  bonusMs: number,
): StageFeedbackKind {
  if (bonusMs > 0) return 'bonus';
  if (me.isCorrect === true) return 'correct';
  if (me.currentAnswer) return 'wrong';
  return 'missed';
}

function nextFeedback(state: GameState, kind: StageFeedbackKind, deltaMs?: number): StageFeedback {
  return { kind, seq: (state.stageFeedback?.seq ?? 0) + 1, deltaMs };
}

function pushRecentTitle(
  list: RecentTitle[],
  song: RevealSong,
  outcome: RecentTitleOutcome,
  round: number,
  bonusMs?: number,
): RecentTitle[] {
  const entry: RecentTitle = {
    key: `${round}-${song.id}`,
    round,
    anime: song.anime,
    title: song.title,
    type: song.type,
    difficulty: song.difficulty,
    cover: song.cover ?? null,
    outcome,
    ...(bonusMs != null && bonusMs > 0 ? { bonusMs } : {}),
  };
  return [entry, ...list.filter((t) => t.key !== entry.key)].slice(0, RECENT_TITLES_LIMIT);
}
/** Convert an authoritative PhaseTiming envelope to a local end timestamp. */
function localEndsAt(t: { serverNow: number; endsAt?: number; startsAt?: number }): number {
  const target = t.endsAt ?? t.startsAt;
  if (target === undefined) return Date.now();
  return Date.now() + (target - t.serverNow);
}

function budgetPatch(
  payload: {
    remainingMs?: number;
    foundCount?: number;
    nextSkipTaxMs?: number;
    nextMedal?: TimeAttackNextMedal | null;
    medalTargets?: SoloMedalTargets;
  },
  state: GameState,
):
  | Pick<
      GameState,
      | 'remainingMs'
      | 'foundCount'
      | 'budgetSyncedAt'
      | 'nextSkipTaxMs'
      | 'nextMedal'
      | 'medalTargets'
    >
  | Record<string, never> {
  if (
    payload.remainingMs == null &&
    payload.foundCount == null &&
    payload.nextSkipTaxMs == null &&
    payload.nextMedal === undefined &&
    payload.medalTargets == null
  ) {
    return {};
  }
  return {
    remainingMs: payload.remainingMs ?? state.remainingMs,
    foundCount: payload.foundCount ?? state.foundCount,
    budgetSyncedAt: Date.now(),
    nextSkipTaxMs: payload.nextSkipTaxMs ?? state.nextSkipTaxMs,
    nextMedal: payload.nextMedal !== undefined ? payload.nextMedal : state.nextMedal,
    medalTargets: payload.medalTargets ?? state.medalTargets,
  };
}
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'GAME_STARTED': {
      const p = action.payload;
      const videoMode = resolveVideoMode(
        p.settings.videoMode,
        action.clientVideoMode ?? state.videoMode,
      );
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
        speedLeaderboard: null,
        remainingMs:
          p.settings.gameType === 'timeAttack'
            ? (p.settings.timeBudgetSeconds ?? TIME_ATTACK_DEFAULT_BUDGET_SECONDS) * 1000
            : null,
        foundCount: 0,
        budgetSyncedAt: Date.now(),
        stageFeedback: null,
        recentTitles: [],
        raceBoard: null,
        laneDone: false,
        evolving: null,
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
      const stepped =
        p.evolving != null &&
        state.evolving != null &&
        state.phase === 'guessing' &&
        state.currentRound === p.round &&
        p.evolving.stepIndex > state.evolving.stepIndex;
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
        duoChoices: [],
        // `endsAt` already includes the load buffer + end grace; the visible
        // countdown subtracts that tail in the ticker so it lands on 0.
        phaseEndsAt: localEndsAt(p),
        phaseDurationSeconds: p.durationSeconds,
        isPausePending: false,
        skipVotes: 0,
        videoMode,
        speedLeaderboard: null,
        players: state.players.map((pl) => ({
          ...pl,
          hasAnswered: false,
          currentAnswer: null,
          isCorrect: null,
          roundPoints: 0,
          answerType: null,
          speedRank: undefined,
          speedBonus: undefined,
        })),
        evolving: p.evolving ?? null,
        stageFeedback: stepped
          ? nextFeedback(state, 'wrong')
          : p.round === state.currentRound
            ? state.stageFeedback
            : null,
        ...budgetPatch(p, state),
      };
    }
    case 'RACE_BOARD': {
      return {
        ...state,
        raceBoard: { entries: action.payload.entries, receivedAt: Date.now() },
      };
    }
    case 'RACE_LANE_DONE': {
      return { ...state, laneDone: true, foundCount: action.foundCount };
    }
    case 'DUO_CHOICES': {
      return { ...state, duoChoices: action.choices };
    }
    case 'ANSWERED': {
      return {
        ...state,
        players: state.players.map((pl) =>
          String(pl.id) === action.userId ? { ...pl, hasAnswered: true } : pl,
        ),
      };
    }
    case 'SPEED_LEADERBOARD': {
      return { ...state, speedLeaderboard: action.payload };
    }
    case 'TIME_ATTACK_BUDGET': {
      const p = action.payload;
      const next = { ...state, ...budgetPatch(p, state) };
      const bonusMs = p.bonusMs ?? 0;
      if (!p.tax && !p.roundResult && bonusMs <= 0) return next;
      const result = p.roundResult;
      const kind: StageFeedbackKind =
        bonusMs > 0 ? 'bonus' : p.tax ? p.tax : result?.outcome === 'found' ? 'correct' : 'missed';
      const fallbackTax = p.tax === 'skip' ? -TIME_ATTACK_SKIP_TAX_MS : -TIME_ATTACK_WRONG_TAX_MS;
      const deltaMs = bonusMs > 0 ? bonusMs : p.tax ? -(p.taxMs ?? -fallbackTax) : undefined;
      return {
        ...next,
        stageFeedback: nextFeedback(state, kind, deltaMs),
        recentTitles: result
          ? pushRecentTitle(
              state.recentTitles,
              result.song,
              result.outcome === 'found'
                ? 'found'
                : result.outcome === 'skipped'
                  ? 'skipped'
                  : 'missed',
              state.currentRound,
              bonusMs,
            )
          : state.recentTitles,
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
            speedRank: me?.speedRank ?? null,
            speedBonus: me?.speedBonus ?? 0,
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
        roundHistory: historyEntry ? [...state.roundHistory, historyEntry] : state.roundHistory,
        ...budgetPatch(p, state),
        ...(me
          ? {
              stageFeedback: p.skipped
                ? state.stageFeedback
                : nextFeedback(
                    state,
                    revealFeedbackKind(me, p.bonusMs ?? 0),
                    (p.bonusMs ?? 0) > 0 ? p.bonusMs : undefined,
                  ),
              recentTitles: pushRecentTitle(
                state.recentTitles,
                p.song,
                p.skipped ? 'skipped' : me.isCorrect === true ? 'found' : 'missed',
                p.round,
                p.bonusMs,
              ),
            }
          : {}),
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
        const existingPeek =
          state.currentSong && 'peekWindow' in state.currentSong
            ? state.currentSong.peekWindow
            : undefined;
        currentSong = {
          videoKey: s.round.videoKey,
          videoStartTime: s.round.videoStartTime,
          peekWindow: resolvePeekWindow(syncMode, s.round.peekWindow, existingPeek),
        };
        nextVideoKey = null;
        qcmChoices = s.round.choices ?? [];
        duoChoices =
          s.currentRound === state.currentRound && state.duoChoices.length > 0
            ? state.duoChoices
            : [];
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
        isGamePaused: s.status === 'paused',
        raceBoard: s.raceBoard
          ? { entries: s.raceBoard.entries, receivedAt: Date.now() }
          : state.raceBoard,
        laneDone: s.laneDone === true,
        evolving: s.phase === 'guessing' ? (s.round?.evolving ?? null) : null,
        ...budgetPatch(
          {
            remainingMs: s.remainingMs ?? s.round?.remainingMs ?? s.reveal?.remainingMs,
            foundCount: s.foundCount ?? s.round?.foundCount ?? s.reveal?.foundCount,
            nextSkipTaxMs: s.nextSkipTaxMs ?? s.round?.nextSkipTaxMs ?? s.reveal?.nextSkipTaxMs,
            nextMedal:
              s.nextMedal !== undefined
                ? s.nextMedal
                : s.round?.nextMedal !== undefined
                  ? s.round.nextMedal
                  : s.reveal?.nextMedal,
            medalTargets: s.medalTargets ?? s.round?.medalTargets ?? s.reveal?.medalTargets,
          },
          state,
        ),
      };
    }
    default:
      return state;
  }
}
