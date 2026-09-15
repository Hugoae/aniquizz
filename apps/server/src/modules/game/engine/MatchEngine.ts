import {
  GAME_CONFIG,
  isAnswerCorrect,
  resolveEffectiveAnswerType,
  type AnswerType,
  type GameSyncState,
  type MatchSettingsSnapshot,
  type PeekWindow,
  type RoundHistoryEntry,
  type VictoryData,
} from '@aniquizz/shared';
import { RoundClock } from './RoundClock';
import type { AdminMatchProgress, PlaylistItem, RecordedRound, RoomPlayer } from './types';
import type { Room } from './Room';
import {
  countActiveVotes,
  isHumanVoter,
  playerCanVote,
  requiredVoteCount,
} from './matchEngineVotes';
import type { EngineDeps, MatchEngineHost } from './matchEngineHost';
import { startMatch } from './matchEngineStart';
import {
  buildRoundStartPayload,
  emitSprintLeaderboard,
  endRound,
  startRound,
} from './matchEngineRound';
import { finishMatch } from './matchEngineFinish';
import { buildAdminProgress, buildMatchSyncState, heardSongIds } from './matchEngineSync';

/** Runs a single Standard-mode match: the authoritative round loop. */
export class MatchEngine {
  private readonly room: Room;
  private readonly deps: EngineDeps;

  private playlist: PlaylistItem[] = [];
  private currentRoundIndex = -1;
  private phase: 'intro' | 'ready' | 'guessing' | 'reveal' | null = null;

  private readonly clock = new RoundClock();
  private introTimer: NodeJS.Timeout | null = null;
  private readyTimer: NodeJS.Timeout | null = null;
  /** When `round_start` fires during the round-1 ready beat (for reconnect sync). */
  private readyStartsAt: number | null = null;
  private resumeTimer: NodeJS.Timeout | null = null;
  private botTimers: NodeJS.Timeout[] = [];

  private guessStartAt = 0;
  private isRoundLoading = false;
  private isRoundEnded = false;

  private readonly pauseVotes = new Set<string>();
  private readonly skipVotes = new Set<string>();
  private isPausePending = false;

  private startedAt = new Date();
  private readonly recordedRounds: RecordedRound[] = [];
  private finishedVictoryData: VictoryData | null = null;
  private finishedRoundHistoryByUserId: Record<string, RoundHistoryEntry[]> | null = null;
  private finishedMatchSettings: MatchSettingsSnapshot | null = null;
  /** Peek geometry for the active guessing round (reconnect sync). */
  private currentPeekWindow: PeekWindow | null = null;

  constructor(room: Room, deps: EngineDeps) {
    this.room = room;
    this.deps = deps;
  }

  private asHost(): MatchEngineHost {
    return this as unknown as MatchEngineHost;
  }

  async start(): Promise<boolean> {
    return startMatch(this.asHost());
  }

  private resetMatchState(): void {
    for (const p of this.room.players.values()) {
      p.score = 0;
      p.streak = 0;
      p.maxStreak = 0;
      p.matchCorrectCount = 0;
      p.matchTotalCount = 0;
      p.correctSongIds = new Set();
      p.isReady = p.isBot ? true : p.userId === this.room.hostId;
      this.resetRoundState(p);
    }
  }

  private resetRoundState(p: RoomPlayer): void {
    p.hasAnswered = false;
    p.currentAnswer = null;
    p.isCorrect = null;
    p.roundPoints = 0;
    p.answerType = null;
    p.answerTimeMs = null;
    p.speedRank = null;
    p.speedBonus = 0;
  }

  private startRound(): void {
    startRound(this.asHost());
  }

  private buildRoundStartPayload(item: PlaylistItem) {
    return buildRoundStartPayload(this.asHost(), item);
  }

  handleAnswer(
    userId: string,
    answer: string,
    answerType: AnswerType,
    options?: { revealAfterAnswer?: boolean },
  ): void {
    if (this.phase !== 'guessing' || this.isRoundEnded) return;
    const player = this.room.players.get(userId);
    const item = this.playlist[this.currentRoundIndex];
    if (!player || !item) return;
    // Players may change their answer until the round ends — bots answer once,
    // so guard only their re-entry (their timer fires a single time anyway).
    if (player.isBot && player.hasAnswered) return;

    // Anti-cheat: never trust the client's claimed type beyond the room mode.
    // Typing-only always scores as typing; QCM-only never awards typing. Mix
    // honours the claim — the correct title is always a QCM label, so the
    // old "string matches a button → qcm" clamp made honest Mix typing worth 2.
    const effectiveType = this.effectiveAnswerType(answerType);

    const timeMs = Math.max(0, Date.now() - this.guessStartAt);
    const isCorrect = isAnswerCorrect(answer, item.validAnswers);

    player.hasAnswered = true;
    player.currentAnswer = answer;
    player.answerType = effectiveType;
    player.answerTimeMs = timeMs;
    player.isCorrect = isCorrect;
    player.roundPoints = isCorrect
      ? this.deps.scoring.scoreFor(effectiveType, { timeMs, durationMs: item.guessDuration * 1000 })
      : 0;

    this.channel.emit('game:answered', { userId });

    if (options?.revealAfterAnswer === true && this.room.isSolo) {
      this.forceEndRound();
    }
  }

  private endRound(): void {
    endRound(this.asHost());
  }

  private async finish(): Promise<void> {
    await finishMatch(this.asHost());
  }

  votePause(userId: string): void {
    if (this.isRoundLoading) return;
    if (this.room.status !== 'playing' && this.room.status !== 'paused') return;
    if (!playerCanVote(this.room.players.get(userId))) return;
    if (this.room.status === 'paused') {
      this.resume();
      return;
    }
    if (this.pauseVotes.has(userId)) this.pauseVotes.delete(userId);
    else this.pauseVotes.add(userId);

    const required = this.requiredVotes();
    const count = countActiveVotes(this.pauseVotes, this.room.players);
    this.isPausePending = count >= required;
    this.channel.emit('vote_update', {
      type: 'pause',
      count,
      required,
      isPending: this.isPausePending,
    });
  }

  voteSkip(userId: string): void {
    if (this.room.status !== 'playing' || this.isRoundLoading) return;
    if (!playerCanVote(this.room.players.get(userId))) return;
    this.skipVotes.add(userId);
    const required = this.requiredVotes();
    const count = countActiveVotes(this.skipVotes, this.room.players);
    this.channel.emit('vote_update', { type: 'skip', count, required });

    if (count < required) return;
    this.clock.clear();
    if (this.isRoundEnded) {
      if (this.isPausePending) this.pause();
      else this.startRound();
    } else {
      this.endRound();
    }
  }

  /** Drop this player's skip/pause votes on disconnect or leave. */
  clearPlayerVotes(userId: string): void {
    const hadSkip = this.skipVotes.delete(userId);
    const hadPause = this.pauseVotes.delete(userId);
    if (!hadSkip && !hadPause) return;

    const required = this.requiredVotes();
    if (hadSkip) {
      this.channel.emit('vote_update', {
        type: 'skip',
        count: countActiveVotes(this.skipVotes, this.room.players),
        required,
      });
    }
    if (hadPause) {
      const count = countActiveVotes(this.pauseVotes, this.room.players);
      this.isPausePending = count >= required;
      this.channel.emit('vote_update', {
        type: 'pause',
        count,
        required,
        isPending: this.isPausePending,
      });
    }
  }

  forceEndRound(): void {
    if (!this.isRoundEnded && !this.isRoundLoading) this.endRound();
  }

  private pause(): void {
    this.clock.clear();
    this.room.status = 'paused';
    this.room.markPaused();
    this.isPausePending = false;
    this.pauseVotes.clear();
    this.channel.emit('game_paused', { isPaused: true });
  }

  private resume(): void {
    this.room.markResumed();
    this.channel.emit('game_resuming', { duration: 3 });
    this.resumeTimer = setTimeout(() => {
      this.room.status = 'playing';
      this.channel.emit('game_paused', { isPaused: false });
      this.startRound();
    }, GAME_CONFIG.TIMERS.RESUME_COUNTDOWN);
  }

  getSyncState(): GameSyncState {
    return buildMatchSyncState(this.asHost());
  }

  getAdminProgress(): AdminMatchProgress {
    return buildAdminProgress(this.asHost());
  }

  private heardSongIds(): number[] {
    return heardSongIds(this.asHost());
  }

  cancel(): void {
    this.clock.clear();
    this.clearBotTimers();
    if (this.introTimer) clearTimeout(this.introTimer);
    if (this.readyTimer) clearTimeout(this.readyTimer);
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.introTimer = null;
    this.readyTimer = null;
    this.readyStartsAt = null;
    this.resumeTimer = null;
    this.phase = null;
  }

  private clearBotTimers(): void {
    for (const t of this.botTimers) clearTimeout(t);
    this.botTimers = [];
  }

  private requiredVotes(): number {
    const humans = [...this.room.players.values()].filter(isHumanVoter).length;
    return requiredVoteCount(humans);
  }

  private effectiveAnswerType(claimed: AnswerType): AnswerType {
    return resolveEffectiveAnswerType(claimed, this.room.settings.responseType);
  }

  private get channel() {
    return this.room.io.to(this.room.id);
  }

  private emitSprintLeaderboard(): void {
    emitSprintLeaderboard(this.asHost());
  }
}
