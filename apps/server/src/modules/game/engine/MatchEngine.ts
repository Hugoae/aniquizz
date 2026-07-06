import {
  GAME_CONFIG,
  computeVictory,
  isAnswerCorrect,
  type AnswerType,
  type GamePlayer,
  type GameSyncState,
  type Precision,
  type ResponseType,
  type RevealSong,
  type RoundStartPayload,
  type RoundRevealPayload,
  type VictoryData,
} from '@aniquizz/shared';
import { logger } from '../../../utils/logger';
import { RoundClock } from './RoundClock';
import type { PlaylistBuilder } from './PlaylistBuilder';
import type { MatchRepository } from './MatchRepository';
import type { ScoringStrategy } from './ScoringStrategy';
import type { AdminMatchProgress, PlaylistItem, RecordedRound, RoomPlayer } from './types';
import type { Room } from './Room';

interface EngineDeps {
  builder: PlaylistBuilder;
  repo: MatchRepository;
  scoring: ScoringStrategy;
}

const START_BUFFER_MS = 250;

/** Runs a single Standard-mode match: the authoritative round loop. */
export class MatchEngine {
  private readonly room: Room;
  private readonly deps: EngineDeps;

  private playlist: PlaylistItem[] = [];
  private currentRoundIndex = -1;
  private phase: 'intro' | 'guessing' | 'reveal' | null = null;

  private readonly clock = new RoundClock();
  private introTimer: NodeJS.Timeout | null = null;
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

  constructor(room: Room, deps: EngineDeps) {
    this.room = room;
    this.deps = deps;
  }

  // --- START ----------------------------------------------------------------

  async start(): Promise<void> {
    this.resetMatchState();

    let built;
    try {
      built = await this.deps.builder.build(this.room.settings, [...this.room.players.values()]);
    } catch (e) {
      logger.error(`[MatchEngine ${this.room.id}] Playlist build crashed`, 'Game', e);
      this.room.status = 'waiting';
      this.channel.emit('error', { message: 'Erreur technique lors de la préparation.' });
      return;
    }

    if (!built.playlist.length) {
      logger.error(`[MatchEngine ${this.room.id}] Empty playlist (0 songs).`, 'Game');
      this.room.status = 'waiting';
      this.channel.emit('error', { message: 'Aucun son trouvé pour ces paramètres.' });
      return;
    }

    this.playlist = built.playlist;
    this.startedAt = new Date();
    this.room.status = 'playing';
    this.currentRoundIndex = -1;
    this.phase = 'intro';

    logger.info(
      `[MatchEngine ${this.room.id}] Match start — ${this.playlist.length} songs, ${this.room.players.size} players.`,
      'Game',
    );

    this.channel.emit('game_started', {
      roomId: this.room.id,
      settings: this.room.settings,
      players: this.room.toPublicPlayers(),
      introDuration: GAME_CONFIG.TIMERS.INTRO_DELAY,
      firstVideo: this.playlist[0]?.videoKey ?? null,
    });

    if (built.fallbackUsed) {
      setTimeout(() => {
        const message =
          this.room.settings.watchedMode === 'intersection'
            ? 'Pas assez de sons communs. Ajout de sons aléatoires.'
            : 'Pas assez de sons dans votre liste. Ajout de sons aléatoires.';
        this.channel.emit('game:fallback_notification', { message });
      }, 1000);
    }

    this.introTimer = setTimeout(() => this.startRound(), GAME_CONFIG.TIMERS.INTRO_DELAY);
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
  }

  // --- ROUND LOOP -----------------------------------------------------------

  private startRound(): void {
    this.clock.clear();
    this.clearBotTimers();
    this.isRoundLoading = true;
    this.currentRoundIndex++;

    if (this.currentRoundIndex >= this.playlist.length) {
      this.finish();
      return;
    }

    const item = this.playlist[this.currentRoundIndex];
    this.phase = 'guessing';
    this.isRoundEnded = false;
    this.skipVotes.clear();
    this.pauseVotes.clear();
    this.isPausePending = false;

    for (const p of this.room.players.values()) this.resetRoundState(p);

    const required = this.requiredVotes();
    this.channel.emit('vote_update', { type: 'skip', count: 0, required });
    this.channel.emit('vote_update', { type: 'pause', count: 0, required, isPending: false });

    const guessDurationMs = item.guessDuration * 1000 + START_BUFFER_MS;
    this.guessStartAt = Date.now();
    this.clock.start(guessDurationMs, () => this.endRound());
    this.scheduleBotAnswers(item);
    this.isRoundLoading = false;

    logger.info(
      `[MatchEngine ${this.room.id}] Round ${this.currentRoundIndex + 1}/${this.playlist.length} — ${item.anime}`,
      'GameLoop',
    );

    const payload: RoundStartPayload = {
      round: this.currentRoundIndex + 1,
      totalRounds: this.playlist.length,
      videoKey: item.videoKey,
      videoStartTime: item.videoStartTime,
      startBuffer: START_BUFFER_MS,
      serverNow: Date.now(),
      endsAt: this.clock.endsAt,
      durationSeconds: item.guessDuration,
      choices: item.choices,
      duo: item.duo,
    };
    this.channel.emit('round_start', payload);
  }

  handleAnswer(userId: string, answer: string, answerType: AnswerType): void {
    if (this.phase !== 'guessing' || this.isRoundEnded) return;
    const player = this.room.players.get(userId);
    const item = this.playlist[this.currentRoundIndex];
    if (!player || !item) return;
    if (player.hasAnswered) return; // answer lock

    // Anti-cheat: never trust the client's claimed answer type — clamp it to what
    // the room's response mode actually allows so points can't be inflated
    // (e.g. picking from QCM choices but claiming a "typing" answer for 5 pts).
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

    // Anti-cheat: only signal THAT they answered — never the content/correctness.
    this.channel.emit('game:answered', { userId });

    if (this.allConnectedAnswered()) this.endRound();
  }

  private endRound(): void {
    if (this.isRoundLoading || this.isRoundEnded) return;
    this.isRoundEnded = true;
    this.phase = 'reveal';
    this.clock.clear();
    this.clearBotTimers();

    const item = this.playlist[this.currentRoundIndex];
    if (!item) return;

    const recorded: RecordedRound = { roundNumber: this.currentRoundIndex + 1, songId: item.id, answers: [] };

    for (const p of this.room.players.values()) {
      p.score += p.roundPoints || 0;
      if (p.isCorrect === true) {
        p.streak += 1;
        p.matchCorrectCount += 1;
        p.correctSongIds.add(item.id);
      } else {
        p.streak = 0;
      }
      p.maxStreak = Math.max(p.maxStreak, p.streak);
      p.matchTotalCount += 1;

      if (p.hasAnswered) {
        recorded.answers.push({
          userId: p.userId,
          answer: p.currentAnswer,
          isCorrect: p.isCorrect === true,
          answerType: p.answerType ?? 'typing',
          timeMs: p.answerTimeMs,
          pointsAwarded: p.roundPoints || 0,
        });
      }
    }
    this.recordedRounds.push(recorded);

    const revealSeconds = Math.max(1, Math.round(GAME_CONFIG.TIMERS.GUESS_REVEAL / 1000));
    const revealMs = revealSeconds * 1000;
    this.clock.start(revealMs, () => {
      if (this.isPausePending) {
        this.pause();
      } else {
        this.startRound();
      }
    });

    logger.info(`[MatchEngine ${this.room.id}] Round ${this.currentRoundIndex + 1} reveal.`, 'GameLoop');

    const payload: RoundRevealPayload = {
      round: this.currentRoundIndex + 1,
      song: this.toRevealSong(item),
      players: this.room.toPublicPlayers(true),
      nextVideo: this.playlist[this.currentRoundIndex + 1]?.videoKey ?? null,
      serverNow: Date.now(),
      endsAt: this.clock.endsAt,
      durationSeconds: revealSeconds,
    };
    this.channel.emit('round_reveal', payload);
  }

  private finish(): void {
    this.phase = null;
    this.clock.clear();
    this.room.status = 'finished';

    const settings = this.room.settings;
    const responseType = (settings.responseType ?? 'mix') as ResponseType;
    const precision: Precision = settings.precision === 'exact' ? 'exact' : 'franchise';

    const result = computeVictory({
      players: [...this.room.players.values()].map((p) => ({ userId: p.userId, score: p.score })),
      totalRounds: this.playlist.length,
      responseType,
      isSolo: this.room.isSolo,
      precision,
      difficulties: settings.difficulty ?? [],
    });

    const rankByUser = new Map(result.rankings.map((r, i) => [r.userId, i + 1]));
    const publicPlayers = this.room.toPublicPlayers(true);
    const rankings = [...publicPlayers].sort((a, b) => b.score - a.score);
    const winner =
      result.winnerIds.length > 0
        ? rankings.find((p) => String(p.id) === result.winnerIds[0]) ?? null
        : null;

    const victoryData: VictoryData = {
      winner,
      winnerIds: result.winnerIds,
      rankings,
      totalMaxScore: result.maxPossibleScore,
      soloTargetScore: result.soloTargetScore,
      soloDifficulty: result.soloDifficultyLabel,
      multiWinnerCount: result.multiWinnerCount,
    };

    logger.info(
      `[MatchEngine ${this.room.id}] Match over. Winners: ${result.winnerIds.length || 'none'}.`,
      'Game',
    );

    this.channel.emit('game_over', { victoryData });

    void this.deps.repo
      .persistMatch({
        totalRounds: this.playlist.length,
        startedAt: this.startedAt,
        endedAt: new Date(),
        players: [...this.room.players.values()].map((p) => ({
          userId: p.userId,
          score: p.score,
          rank: rankByUser.get(p.userId) ?? 0,
          isWinner: result.winnerIds.includes(p.userId),
          correctCount: p.matchCorrectCount,
          totalCount: p.matchTotalCount,
          maxStreak: p.maxStreak,
          xpEarned: 0, // XP wired in Phase 7
          correctSongIds: [...p.correctSongIds],
        })),
        rounds: this.recordedRounds,
        songIds: this.playlist.map((s) => s.id),
      })
      .catch((e) => logger.error(`[MatchEngine ${this.room.id}] persistMatch failed`, 'Scoring', e));
  }

  // --- VOTES ----------------------------------------------------------------

  votePause(userId: string): void {
    if (this.isRoundLoading) return;
    if (this.room.status !== 'playing' && this.room.status !== 'paused') return;
    if (this.room.status === 'paused') {
      this.resume();
      return;
    }
    if (this.pauseVotes.has(userId)) this.pauseVotes.delete(userId);
    else this.pauseVotes.add(userId);

    const required = this.requiredVotes();
    this.isPausePending = this.pauseVotes.size >= required;
    this.channel.emit('vote_update', {
      type: 'pause',
      count: this.pauseVotes.size,
      required,
      isPending: this.isPausePending,
    });
  }

  voteSkip(userId: string): void {
    if (this.room.status !== 'playing' || this.isRoundLoading) return;
    this.skipVotes.add(userId);
    const required = this.requiredVotes();
    this.channel.emit('vote_update', { type: 'skip', count: this.skipVotes.size, required });

    if (this.skipVotes.size < required) return;
    this.clock.clear();
    if (this.isRoundEnded) {
      if (this.isPausePending) this.pause();
      else this.startRound();
    } else {
      this.endRound();
    }
  }

  forceEndRound(): void {
    if (!this.isRoundEnded && !this.isRoundLoading) this.endRound();
  }

  private pause(): void {
    this.clock.clear();
    this.room.status = 'paused';
    this.isPausePending = false;
    this.pauseVotes.clear();
    this.channel.emit('game_paused', { isPaused: true });
  }

  private resume(): void {
    this.channel.emit('game_resuming', { duration: 3 });
    this.resumeTimer = setTimeout(() => {
      this.room.status = 'playing';
      this.channel.emit('game_paused', { isPaused: false });
      this.startRound();
    }, GAME_CONFIG.TIMERS.RESUME_COUNTDOWN);
  }

  // --- SYNC / TEARDOWN ------------------------------------------------------

  getSyncState(): GameSyncState {
    const item = this.currentRoundIndex >= 0 ? this.playlist[this.currentRoundIndex] : null;
    const base = {
      status: this.room.status,
      currentRound: this.currentRoundIndex + 1,
      totalRounds: this.playlist.length,
      players: this.room.toPublicPlayers(this.phase === 'reveal'),
      phase: this.phase,
      round: null as RoundStartPayload | null,
      reveal: null as RoundRevealPayload | null,
      introFirstVideo: this.phase === 'intro' ? this.playlist[0]?.videoKey ?? null : undefined,
    };

    if (this.phase === 'guessing' && item) {
      base.round = {
        round: this.currentRoundIndex + 1,
        totalRounds: this.playlist.length,
        videoKey: item.videoKey,
        videoStartTime: item.videoStartTime,
        startBuffer: START_BUFFER_MS,
        serverNow: Date.now(),
        endsAt: this.clock.endsAt,
        durationSeconds: item.guessDuration,
        choices: item.choices,
        duo: item.duo,
      };
    } else if (this.phase === 'reveal' && item) {
      base.reveal = {
        round: this.currentRoundIndex + 1,
        song: this.toRevealSong(item),
        players: this.room.toPublicPlayers(true),
        nextVideo: this.playlist[this.currentRoundIndex + 1]?.videoKey ?? null,
        serverNow: Date.now(),
        endsAt: this.clock.endsAt,
        durationSeconds: Math.max(1, Math.round(GAME_CONFIG.TIMERS.GUESS_REVEAL / 1000)),
      };
    }

    return base;
  }

  /** Admin-only live progress snapshot (may reveal the current anime/title). */
  getAdminProgress(): AdminMatchProgress {
    const item = this.currentRoundIndex >= 0 ? this.playlist[this.currentRoundIndex] : null;
    return {
      currentRound: Math.max(0, this.currentRoundIndex + 1),
      totalRounds: this.playlist.length,
      phase: this.phase,
      anime: item?.anime ?? null,
      title: item?.title ?? null,
      endsAt: this.clock.endsAt || null,
    };
  }

  cancel(): void {
    this.clock.clear();
    this.clearBotTimers();
    if (this.introTimer) clearTimeout(this.introTimer);
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.introTimer = null;
    this.resumeTimer = null;
    this.phase = null;
  }

  // --- BOTS (DEV ONLY) ------------------------------------------------------

  private clearBotTimers(): void {
    for (const t of this.botTimers) clearTimeout(t);
    this.botTimers = [];
  }

  /** Schedule each bot's single answer for the current guessing round. */
  private scheduleBotAnswers(item: PlaylistItem): void {
    const responseType = (this.room.settings.responseType ?? 'mix') as ResponseType;
    const botAnswerType: AnswerType = responseType === 'typing' ? 'typing' : 'qcm';
    const maxDelay = Math.max(200, item.guessDuration * 1000 - 400);

    for (const p of this.room.players.values()) {
      if (!p.isBot || !p.botConfig) continue;
      const cfg = p.botConfig;
      const lo = Math.min(cfg.minDelayMs, maxDelay);
      const hi = Math.min(Math.max(cfg.maxDelayMs, cfg.minDelayMs), maxDelay);
      const delay = lo + Math.random() * Math.max(0, hi - lo);

      const willBeCorrect = Math.random() < cfg.accuracy;
      const answer = willBeCorrect
        ? item.validAnswers[0] ?? item.anime
        : this.pickWrongAnswer(item);

      const botId = p.userId;
      const timer = setTimeout(() => {
        this.handleAnswer(botId, answer, botAnswerType);
      }, delay);
      this.botTimers.push(timer);
    }
  }

  /** A plausible-but-wrong answer for a bot (a decoy choice, else a placeholder). */
  private pickWrongAnswer(item: PlaylistItem): string {
    const valid = new Set(item.validAnswers.map((a) => a.toLowerCase()));
    const decoy = item.choices.find((c) => !valid.has(c.toLowerCase()));
    return decoy ?? '—';
  }

  // --- HELPERS --------------------------------------------------------------

  private connectedPlayers(): RoomPlayer[] {
    return [...this.room.players.values()].filter((p) => p.isConnected);
  }

  /** Human, connected players — bots never vote to pause/skip. */
  private humanVoters(): RoomPlayer[] {
    return [...this.room.players.values()].filter((p) => p.isConnected && !p.isBot);
  }

  private requiredVotes(): number {
    return Math.max(1, Math.ceil(this.humanVoters().length / 2));
  }

  private allConnectedAnswered(): boolean {
    const connected = this.connectedPlayers();
    return connected.length > 0 && connected.every((p) => p.hasAnswered);
  }

  /**
   * Clamp a client-claimed answer type to what the room's response mode permits.
   * - `typing` room  → always `typing` (no choices exist).
   * - `qcm` room     → `duo` (lifeline) or `qcm`; never `typing`.
   * - `mix` room     → the player's genuine choice (choices are legitimately available).
   */
  private effectiveAnswerType(claimed: AnswerType): AnswerType {
    const responseType = (this.room.settings.responseType ?? 'mix') as ResponseType;
    if (responseType === 'typing') return 'typing';
    if (responseType === 'qcm') return claimed === 'duo' ? 'duo' : 'qcm';
    return claimed;
  }

  private toRevealSong(item: PlaylistItem): RevealSong {
    return {
      id: item.id,
      anime: item.anime,
      title: item.title,
      artist: item.artist,
      type: item.typeLabel,
      difficulty: item.difficulty,
      cover: item.cover,
      franchise: item.franchise,
      year: item.year,
      siteUrl: item.siteUrl,
      tags: item.tags,
      animeId: item.animeId,
      videoKey: item.videoKey,
      videoStartTime: 0,
    };
  }

  /** Typed broadcast channel for this room. */
  private get channel() {
    return this.room.io.to(this.room.id);
  }
}
