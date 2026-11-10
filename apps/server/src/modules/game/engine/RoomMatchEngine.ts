import type { AnswerType, GameSyncState } from '@aniquizz/shared';
import type { AdminMatchProgress } from './types';

/**
 * Surface `Room` drives, shared by the synchronous `MatchEngine` and the
 * parallel versus `RaceEngine`. Votes and Duo are no-ops on engines that do
 * not support them.
 */
export interface RoomMatchEngine {
  /** True for the whole finish/persist await so a relaunch cannot wipe scores. */
  readonly finishing: boolean;
  start(): Promise<boolean>;
  cancel(): void;
  handleAnswer(
    userId: string,
    answer: string,
    answerType: AnswerType,
    options?: { revealAfterAnswer?: boolean },
  ): void;
  useDuo(userId: string): void;
  replayDuo(userId: string): void;
  votePause(userId: string): void;
  voteSkip(userId: string): void;
  clearPlayerVotes(userId: string): void;
  /** Solo: skip the shared round. Versus: skip this player's own title. */
  forceEndRound(userId?: string): void;
  /** Evolving: end the current title without the remaining steps. */
  abandonRound?(userId?: string): void;
  /** Called when a player explicitly leaves (not on a plain disconnect). */
  onPlayerRemoved?(userId: string): void;
  /** `userId` lets a versus engine return that player's own lane. */
  getSyncState(userId?: string): GameSyncState;
  getAdminProgress(): AdminMatchProgress;
}
