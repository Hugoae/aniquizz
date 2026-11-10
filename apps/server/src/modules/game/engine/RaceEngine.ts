import {
  GAME_CONFIG,
  generatePeekWindow,
  isAnswerCorrect,
  normalizePrecision,
  normalizeTimeBudgetSeconds,
  normalizeVideoMode,
  timeAttackMedal,
  timeAttackNextMedalGoal,
  timeAttackTaxMs,
  toClientRoomSettings,
  TIME_ATTACK_REVEAL_SECONDS,
  revealClockMs,
  type AnswerType,
  type GameOverPayload,
  type GameSyncState,
  type RaceBoardEntry,
  type RaceBoardPayload,
  type RoundRevealPayload,
  type RoundStartPayload,
  type ServerToClientEvents,
  type TimeAttackBudgetPayload,
  type TimeAttackNextMedal,
} from '@aniquizz/shared';
import { toPlaybackUrl } from '../../../lib/mediaPlaybackUrl';
import { logger } from '../../../utils/logger';
import type { EngineDeps } from './matchEngineHost';
import { scheduleBotAnswers } from './matchEngineBots';
import { normalizeSongDifficulty } from './matchEngineFinish';
import { toRevealSong } from './matchEngineReveal';
import { abortStart, emptyPlaylistMessage, scheduleBuildNotices } from './matchEngineStart';
import { GUESS_END_GRACE_MS, START_BUFFER_MS } from './matchEngineTimers';
import { finishRace } from './raceEngineFinish';
import {
  boardPayload,
  buildReveal,
  buildRaceSyncState,
  buildRoundStart,
  laneCue,
} from './raceEnginePayloads';
import { RaceLane } from './RaceLane';
import { grantTimeAttackStreak } from './timeAttackStreakGrant';
import { abandonScheduledActivity, noteActivityRound } from './matchActivityLedger';
import type { Room } from './Room';
import type { RoomMatchEngine } from './RoomMatchEngine';
import type { AdminMatchProgress, PlaylistItem, RecordedRound, RoomPlayer } from './types';

type LaneEvent = 'round_start' | 'round_reveal' | 'timeAttack:budget' | 'race:lane_done';
type RacePhase = 'intro' | 'ready' | 'running' | null;

/**
 * Versus time-attack: every player races their own lane over one shared
 * playlist. Round events go to each player's own socket, never the room, so no
 * one sees another lane's titles; only the live board (found + budget) is
 * public. No pause, no vote: skip is individual. A disconnected lane keeps
 * running — the budget is the race clock. See docs/game/time-attack.md.
 *
 * Fields are package-visible (not `private`) for `raceEngineFinish`.
 */
export class RaceEngine implements RoomMatchEngine {
  readonly room: Room;
  readonly deps: EngineDeps;
  playlist: PlaylistItem[] = [];
  readonly lanes = new Map<string, RaceLane>();
  phase: RacePhase = null;
  startedAt = new Date();
  finishing = false;
  finishStarted = false;
  finishedPayload: GameOverPayload | null = null;
  /** See `matchActivityLedger`. Tests leave both null because the repo mock has no opener. */
  activityMatchId: string | null = null;
  activityOpen: Promise<string | null> | null = null;

  private introTimer: NodeJS.Timeout | null = null;
  private readyTimer: NodeJS.Timeout | null = null;
  readyStartsAt: number | null = null;
  private cancelled = false;

  constructor(room: Room, deps: EngineDeps) {
    this.room = room;
    this.deps = deps;
  }

  get channel() {
    return this.room.io.to(this.room.id);
  }

  // --- START ----------------------------------------------------------------

  async start(): Promise<boolean> {
    this.resetMatchState();
    this.startedAt = new Date();
    this.room.status = 'playing';
    this.phase = 'intro';
    const introStartedAt = Date.now();

    this.channel.emit('game_started', {
      roomId: this.room.id,
      settings: toClientRoomSettings(this.room.settings),
      players: this.room.toPublicPlayers(),
      introDuration: GAME_CONFIG.TIMERS.INTRO_DELAY,
      firstVideo: null,
    });

    let built;
    try {
      built = await this.deps.builder.build(this.room.settings, [...this.room.players.values()], {
        excludePriorMatchSongIds: this.room.getPriorMatchSongIds(),
      });
    } catch (e) {
      logger.error(`[RaceEngine ${this.room.id}] Playlist build crashed`, 'Game', e);
      return abortStart(this, 'Erreur technique lors de la préparation.');
    }
    if (this.cancelled) return false;

    if (!built.playlist.length) {
      logger.error(`[RaceEngine ${this.room.id}] Empty playlist.`, 'Game');
      return abortStart(this, emptyPlaylistMessage(this.room.settings, built.abortReason));
    }

    this.playlist = built.playlist;
    this.room.registerMatchPlaylistSongIds(this.playlist.map((item) => item.id));
    logger.info(
      `[RaceEngine ${this.room.id}] Race start — ${this.playlist.length} songs, ${this.lanes.size} lanes.`,
      'Game',
    );

    const first = this.playlist[0]!;
    this.channel.emit('game:preload', {
      videoKey: toPlaybackUrl(first.videoKey),
      videoStartTime: first.videoStartTime,
    });
    scheduleBuildNotices(this, built);

    const wait = Math.max(0, GAME_CONFIG.TIMERS.INTRO_DELAY - (Date.now() - introStartedAt));
    this.introTimer = setTimeout(() => this.beginReady(), wait);
    return true;
  }

  private resetMatchState(): void {
    for (const lane of this.lanes.values()) lane.dispose();
    this.lanes.clear();
    for (const p of this.room.players.values()) {
      p.score = 0;
      p.streak = 0;
      p.maxStreak = 0;
      p.matchCorrectCount = 0;
      p.matchTotalCount = 0;
      p.correctSongIds = new Set();
      p.isReady = p.isBot ? true : p.userId === this.room.hostId;
      this.resetRoundState(p);
      this.lanes.set(p.userId, new RaceLane(p.userId));
    }
  }

  private resetRoundState(p: RoomPlayer): void {
    p.hasAnswered = false;
    p.currentAnswer = null;
    p.isCorrect = null;
    p.roundPoints = 0;
    p.answerType = null;
    p.duoCommitted = false;
    p.answerTimeMs = null;
    p.speedRank = null;
    p.speedBonus = 0;
  }

  /** Common "À vous !" beat so every lane starts on the same instant. */
  private beginReady(): void {
    this.introTimer = null;
    const first = this.playlist[0];
    if (!first || this.cancelled) return;
    const readyMs = GAME_CONFIG.TIMERS.ROUND1_READY_DELAY;
    const serverNow = Date.now();
    this.phase = 'ready';
    this.readyStartsAt = serverNow + readyMs;
    this.channel.emit('game:ready', {
      serverNow,
      startsAt: this.readyStartsAt,
      durationSeconds: first.guessDuration,
    });
    this.readyTimer = setTimeout(() => {
      this.readyTimer = null;
      this.readyStartsAt = null;
      this.beginRace();
    }, readyMs);
  }

  private beginRace(): void {
    this.phase = 'running';
    const budgetMs = normalizeTimeBudgetSeconds(this.room.settings.timeBudgetSeconds) * 1000;
    for (const lane of this.lanes.values()) {
      lane.budget.arm(budgetMs, () => this.onBudgetExpired(lane));
    }
    for (const lane of this.lanes.values()) this.startLaneRound(lane);
    this.emitBoard();
  }

  // --- LANE LOOP ------------------------------------------------------------

  private startLaneRound(lane: RaceLane): void {
    if (this.phase !== 'running' || lane.isDone) return;
    lane.clock.clear();
    lane.clearBotTimers();
    this.room.touch();

    const player = this.room.players.get(lane.userId);
    if (!player || lane.budget.getRemainingMs() <= 0) {
      this.finishLane(lane);
      return;
    }
    lane.index++;
    const item = this.playlist[lane.index];
    if (!item) {
      this.finishLane(lane);
      return;
    }
    noteActivityRound(this, lane.index + 1, item.id);

    lane.phase = 'guessing';
    lane.isRoundEnded = false;
    this.resetRoundState(player);
    const videoMode = normalizeVideoMode(this.room.settings.videoMode);
    lane.peekWindow = videoMode === 'peek' ? generatePeekWindow() : null;

    lane.guessStartAt = Date.now();
    lane.clock.start(item.guessDuration * 1000 + START_BUFFER_MS + GUESS_END_GRACE_MS, () => {
      try {
        this.endLaneRound(lane, 'reveal');
      } catch (error) {
        logger.error(`[RaceEngine ${this.room.id}] endLaneRound crashed`, 'GameLoop', error);
      }
    });
    if (player.isBot) {
      lane.botTimers = scheduleBotAnswers({
        players: [player],
        item,
        responseType: 'typing',
        handleAnswer: (userId, answer, answerType) => this.handleAnswer(userId, answer, answerType),
      });
    }
    lane.budget.start();
    this.emitToLane(lane, 'round_start', buildRoundStart(this, lane, item));
    this.emitBoard();
  }

  handleAnswer(userId: string, answer: string, _answerType: AnswerType): void {
    const lane = this.lanes.get(userId);
    const player = this.room.players.get(userId);
    if (!lane || !player || lane.phase !== 'guessing' || lane.isRoundEnded) return;
    const item = this.playlist[lane.index];
    if (!item || !player.isConnected) return;
    if (player.isBot && player.hasAnswered) return;

    if (lane.budget.getRemainingMs() <= 0) {
      this.onBudgetExpired(lane);
      return;
    }
    if (answer.trim().length === 0) return;

    // Versus is typing-only: never trust the claimed answer type.
    const timeMs = Math.max(0, Date.now() - lane.guessStartAt);
    const isCorrect = isAnswerCorrect(answer, item.validAnswers);
    player.hasAnswered = true;
    player.currentAnswer = answer;
    player.answerType = 'typing';
    player.answerTimeMs = timeMs;
    player.isCorrect = isCorrect;
    player.roundPoints = isCorrect
      ? this.deps.scoring.scoreFor('typing', { timeMs, durationMs: item.guessDuration * 1000 })
      : 0;

    if (isCorrect) {
      this.endLaneRound(lane, 'reveal');
      return;
    }
    const remaining = lane.budget.tax('wrong', this.punitiveSkip());
    this.emitBudget(lane, { tax: 'wrong', taxMs: lane.budget.lastTax });
    this.emitBoard();
    if (remaining <= 0) this.onBudgetExpired(lane);
  }

  /**
   * Individual skip. During the reveal it only cuts that lane's 3 s short
   * (no extra tax): the player can take the next title when they want.
   */
  forceEndRound(userId?: string): void {
    const lane = userId ? this.lanes.get(userId) : undefined;
    if (!lane || lane.isDone || this.finishStarted) return;
    if (lane.phase === 'reveal') {
      lane.clock.clear();
      this.startLaneRound(lane);
      return;
    }
    if (lane.phase !== 'guessing' || lane.isRoundEnded) return;
    const item = this.playlist[lane.index];
    const remaining = lane.budget.tax('skip', this.punitiveSkip());
    this.emitBudget(lane, {
      tax: 'skip',
      taxMs: lane.budget.lastTax,
      // With the reveal on, the skipped title rides on round_reveal instead.
      ...(item && !this.revealEnabled()
        ? { roundResult: { outcome: 'skipped' as const, song: toRevealSong(item) } }
        : {}),
    });
    this.endLaneRound(lane, 'skip');
  }

  private endLaneRound(lane: RaceLane, kind: 'reveal' | 'skip' | 'finish'): void {
    if (lane.isRoundEnded || lane.phase !== 'guessing') return;
    const item = this.playlist[lane.index];
    if (!item) return;
    lane.isRoundEnded = true;
    lane.phase = 'reveal';
    lane.clock.clear();
    lane.clearBotTimers();

    const player = this.room.players.get(lane.userId);
    const recorded: RecordedRound = {
      roundNumber: lane.index + 1,
      songId: item.id,
      answers: [],
    };
    let streakBonusMs = 0;
    if (player) {
      player.score += player.roundPoints || 0;
      if (player.isCorrect === true) {
        player.streak += 1;
        player.matchCorrectCount += 1;
        player.correctSongIds.add(item.id);
        lane.found += 1;
        streakBonusMs = grantTimeAttackStreak(lane.budget, this.room.settings, player.streak);
      } else {
        player.streak = 0;
      }
      player.maxStreak = Math.max(player.maxStreak, player.streak);
      player.matchTotalCount += 1;
      if (player.hasAnswered) {
        recorded.answers.push({
          userId: player.userId,
          answer: player.currentAnswer,
          isCorrect: player.isCorrect === true,
          answerType: player.answerType ?? 'typing',
          timeMs: player.answerTimeMs,
          pointsAwarded: player.roundPoints || 0,
        });
      }
    }
    lane.rounds.push(recorded);

    // The budget is gone (it ran out, or this skip spent the last seconds).
    // Still show this title for 3 s so it lands in the history, then close the lane.
    const closing = kind === 'finish' || (kind === 'skip' && lane.budget.getRemainingMs() <= 0);

    if (!this.revealEnabled()) {
      if (kind !== 'skip') {
        this.emitBudget(lane, {
          roundResult: {
            outcome: player?.isCorrect === true ? 'found' : 'missed',
            song: toRevealSong(item),
          },
          ...(streakBonusMs > 0 ? { bonusMs: streakBonusMs } : {}),
        });
      }
      this.emitBoard();
      if (closing) this.finishLane(lane);
      else this.startLaneRound(lane);
      return;
    }

    lane.budget.pause();
    lane.clock.start(revealClockMs(TIME_ATTACK_REVEAL_SECONDS), () => {
      if (closing || lane.budget.getRemainingMs() <= 0) this.finishLane(lane);
      else this.startLaneRound(lane);
    });
    this.emitToLane(
      lane,
      'round_reveal',
      buildReveal(this, lane, item, kind === 'skip', streakBonusMs),
    );
    this.emitBoard();
  }

  private onBudgetExpired(lane: RaceLane): void {
    if (this.finishStarted || lane.isDone) return;
    // The title is already on screen. The reveal clock closes the lane.
    if (lane.phase === 'reveal') return;
    if (lane.phase === 'guessing' && !lane.isRoundEnded) {
      this.endLaneRound(lane, 'finish');
      return;
    }
    this.finishLane(lane);
  }

  private finishLane(lane: RaceLane): void {
    if (lane.isDone) return;
    lane.finalRemainingMs = lane.budget.getRemainingMs();
    lane.finalSkips = lane.budget.skips;
    lane.budget.pause();
    lane.clock.clear();
    lane.clearBotTimers();
    lane.phase = 'done';
    lane.isRoundEnded = true;
    if (!lane.removed) this.emitToLane(lane, 'race:lane_done', { foundCount: lane.found });

    if ([...this.lanes.values()].every((l) => l.isDone)) {
      void finishRace(this);
      return;
    }
    this.emitBoard();
  }

  // --- ROOM SURFACE ---------------------------------------------------------

  useDuo(): void {}
  replayDuo(): void {}
  votePause(): void {}
  voteSkip(): void {}
  clearPlayerVotes(): void {}

  /** A leaver forfeits the lane; a plain disconnect keeps racing. */
  onPlayerRemoved(userId: string): void {
    const lane = this.lanes.get(userId);
    if (!lane || lane.isDone) return;
    lane.removed = true;
    this.finishLane(lane);
  }

  cancel(): void {
    abandonScheduledActivity(this);
    this.cancelled = true;
    for (const lane of this.lanes.values()) lane.dispose();
    if (this.introTimer) clearTimeout(this.introTimer);
    if (this.readyTimer) clearTimeout(this.readyTimer);
    this.introTimer = null;
    this.readyTimer = null;
    this.readyStartsAt = null;
    this.phase = null;
  }

  getSyncState(userId?: string): GameSyncState {
    return buildRaceSyncState(this, userId);
  }

  getAdminProgress(): AdminMatchProgress {
    const index = Math.max(-1, ...[...this.lanes.values()].map((lane) => lane.index));
    const phase = this.phase === 'running' ? 'guessing' : this.phase;
    return {
      currentRound: Math.max(0, index + 1),
      totalRounds: this.playlist.length,
      phase,
      anime: null,
      title: null,
      artist: null,
      typeLabel: null,
      videoKey: null,
      videoStartTime: null,
      cover: null,
      endsAt: null,
    };
  }

  private emitBudget(
    lane: RaceLane,
    extra: Pick<TimeAttackBudgetPayload, 'tax' | 'taxMs' | 'roundResult' | 'bonusMs'> = {},
  ): void {
    this.emitToLane(lane, 'timeAttack:budget', {
      remainingMs: lane.remainingMs(),
      foundCount: lane.found,
      ...laneCue(this, lane),
      ...extra,
    });
  }

  private emitBoard(): void {
    if (this.finishStarted) return;
    this.channel.emit('race:board', boardPayload(this));
  }

  /** Per-socket on purpose: lane events must never reach the room channel. */
  private emitToLane<E extends LaneEvent>(
    lane: RaceLane,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void {
    const player = this.room.players.get(lane.userId);
    if (!player || player.isBot || !player.isConnected || !player.socketId) return;
    const target = this.room.io.to(player.socketId) as unknown as {
      emit: (name: E, ...payload: Parameters<ServerToClientEvents[E]>) => void;
    };
    target.emit(event, ...args);
  }

  punitiveSkip(): boolean {
    return this.room.settings.timeAttackPunitiveSkip !== false;
  }

  revealEnabled(): boolean {
    return this.room.settings.timeAttackReveal !== false;
  }
}
