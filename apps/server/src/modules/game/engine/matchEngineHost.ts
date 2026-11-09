import type {
  AnswerType,
  MatchSettingsSnapshot,
  PeekWindow,
  RoundHistoryEntry,
  RoundStartPayload,
  VictoryData,
} from '@aniquizz/shared';
import type { PlaylistBuilder } from './PlaylistBuilder';
import type { MatchRepository } from './MatchRepository';
import type { ScoringStrategy } from './ScoringStrategy';
import type { PlaylistItem, RecordedRound, RoomPlayer } from './types';
import type { Room } from './Room';
import type { RoundClock } from './RoundClock';
import type { MatchBudgetClock } from './MatchBudgetClock';

export type EndRoundKind = 'reveal' | 'skip' | 'finish';

export interface EngineDeps {
  builder: PlaylistBuilder;
  repo: MatchRepository;
  scoring: ScoringStrategy;
}

export type MatchPhase = 'intro' | 'ready' | 'guessing' | 'reveal' | null;

/** Mutable match loop surface used by MatchEngine helper modules. */
export interface MatchEngineHost {
  room: Room;
  deps: EngineDeps;
  clock: RoundClock;
  budget: MatchBudgetClock;
  pausedDuringPhase: boolean;
  playlist: PlaylistItem[];
  currentRoundIndex: number;
  phase: MatchPhase;
  readyStartsAt: number | null;
  introTimer: NodeJS.Timeout | null;
  readyTimer: NodeJS.Timeout | null;
  botTimers: NodeJS.Timeout[];
  guessStartAt: number;
  isRoundLoading: boolean;
  isRoundEnded: boolean;
  pauseVotes: Set<string>;
  skipVotes: Set<string>;
  isPausePending: boolean;
  startedAt: Date;
  recordedRounds: RecordedRound[];
  currentPeekWindow: PeekWindow | null;
  finishedVictoryData: VictoryData | null;
  finishedRoundHistoryByUserId: Record<string, RoundHistoryEntry[]> | null;
  finishedMatchSettings: MatchSettingsSnapshot | null;
  /** True from the first line of `finishMatch` until it returns. */
  finishing: boolean;
  /** Latched on the first finish so a later call cannot persist again. */
  finishStarted: boolean;
  /** Postgres match opened when the playlist is ready. Null in tests and unsaved matches. */
  activityMatchId: string | null;
  /** In flight until the opener resolves. Rounds wait on it so the first title is not lost. */
  activityOpen: Promise<string | null> | null;

  resetMatchState(): void;
  resetRoundState(p: RoomPlayer): void;
  startRound(): void;
  endRound(kind?: EndRoundKind): void;
  finish(): Promise<void>;
  pause(): void;
  clearBotTimers(): void;
  requiredVotes(): number;
  handleAnswer(
    userId: string,
    answer: string,
    answerType: AnswerType,
    options?: { revealAfterAnswer?: boolean },
  ): void;
  emitSpeedLeaderboard(): void;
  buildRoundStartPayload(item: PlaylistItem): RoundStartPayload;
  heardSongIds(): number[];
  readonly channel: ReturnType<Room['io']['to']>;
}
