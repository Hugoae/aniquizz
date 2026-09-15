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

  resetMatchState(): void;
  resetRoundState(p: RoomPlayer): void;
  startRound(): void;
  endRound(): void;
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
  emitSprintLeaderboard(): void;
  buildRoundStartPayload(item: PlaylistItem): RoundStartPayload;
  heardSongIds(): number[];
  readonly channel: ReturnType<Room['io']['to']>;
}
