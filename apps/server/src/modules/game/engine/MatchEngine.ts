import {
  GAME_CONFIG,
  computeVictory,
  computeCompetitionRanks,
  isAnswerCorrect,
  levelFromXp,
  xpForMatch,
  type AnswerType,
  type CorrectByDifficulty,
  type GamePlayer,
  type GameReadyPayload,
  type GameSyncState,
  type ResponseType,
  type RevealSong,
  type RoundStartPayload,
  type RoundRevealPayload,
  type SongDifficulty,
  type VictoryData,
  type RoundHistoryEntry,
  type GameOverPayload,
  type MatchSettingsSnapshot,
  pickMatchSettings,
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

const START_BUFFER_MS = GAME_CONFIG.TIMERS.GUESS_START_BUFFER;
// Extra grace after the chosen guess duration so the countdown visibly reaches
// (and lingers on) 0 instead of cutting the instant time runs out. Answers are
// still accepted during this window; it only softens the round's end.
const GUESS_END_GRACE_MS = GAME_CONFIG.TIMERS.GUESS_END_GRACE;

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

  constructor(room: Room, deps: EngineDeps) {
    this.room = room;
    this.deps = deps;
  }

  // --- START ----------------------------------------------------------------

  async start(): Promise<boolean> {
    this.resetMatchState();
    this.startedAt = new Date();
    this.room.status = 'playing';
    this.currentRoundIndex = -1;
    this.phase = 'intro';

    const introStartedAt = Date.now();

    // Send everyone to the game screen immediately, then build the playlist while
    // the intro countdown plays. The DB/AniList work is thus hidden behind the
    // countdown instead of blocking the lobby. `firstVideo` is intentionally null
    // here (unused for preload; the client loads the clip at `round_start`).
    this.channel.emit('game_started', {
      roomId: this.room.id,
      settings: this.room.settings,
      players: this.room.toPublicPlayers(),
      introDuration: GAME_CONFIG.TIMERS.INTRO_DELAY,
      firstVideo: null,
    });

    let built;
    try {
      built = await this.deps.builder.build(this.room.settings, [...this.room.players.values()]);
    } catch (e) {
      logger.error(`[MatchEngine ${this.room.id}] Playlist build crashed`, 'Game', e);
      return this.abortStart('Erreur technique lors de la préparation.');
    }

    if (!built.playlist.length) {
      const settings = this.room.settings;
      let message = 'Aucun son trouvé pour ces paramètres.';
      if (built.abortReason === 'watched_empty') {
        message =
          settings.watchedMode === 'intersection'
            ? 'Intersection impossible : au moins un joueur n\'a pas de liste AniList utilisable.'
            : 'Aucune liste AniList disponible. Liez votre compte AniList ou changez la source musicale.';
      }
      logger.error(`[MatchEngine ${this.room.id}] Empty playlist (${built.abortReason ?? 'unknown'}).`, 'Game');
      return this.abortStart(message);
    }

    this.playlist = built.playlist;

    logger.info(
      `[MatchEngine ${this.room.id}] Match start — ${this.playlist.length} songs, ${this.room.players.size} players.`,
      'Game',
    );

    // Warm the round-1 clip while the intro countdown plays out, so playback is
    // instant when the first round starts (no cold buffering). Safe to expose the
    // key here: nobody is guessing yet.
    const first = this.playlist[0];
    if (first) {
      this.channel.emit('game:preload', {
        videoKey: first.videoKey,
        videoStartTime: first.videoStartTime,
      });
    }

    if (built.fallbackUsed) {
      setTimeout(() => {
        const message =
          this.room.settings.watchedMode === 'intersection'
            ? 'Pas assez de sons communs. Ajout de sons aléatoires.'
            : 'Pas assez de sons dans votre liste. Ajout de sons aléatoires.';
        this.channel.emit('game:fallback_notification', { message });
      }, 1000);
    }

    // Start round 1 once the intro has visibly elapsed AND the playlist is ready.
    // The build usually finishes within the intro, so the round starts exactly at
    // the end of the countdown; a slow build only pushes it slightly later.
    const remaining = Math.max(0, GAME_CONFIG.TIMERS.INTRO_DELAY - (Date.now() - introStartedAt));
    this.introTimer = setTimeout(() => this.beginRound1Ready(), remaining);
    return true;
  }

  /**
   * Round-1 only: show the game UI with a short "À vous !" beat before audio and
   * the guess timer start. Later rounds call `startRound()` directly from reveal.
   */
  private beginRound1Ready(): void {
    this.introTimer = null;
    if (this.currentRoundIndex >= 0) {
      this.startRound();
      return;
    }

    const first = this.playlist[0];
    if (!first) {
      void this.finish();
      return;
    }

    const readyMs = GAME_CONFIG.TIMERS.ROUND1_READY_DELAY;
    const serverNow = Date.now();
    const startsAt = serverNow + readyMs;

    this.phase = 'ready';
    this.readyStartsAt = startsAt;
    this.channel.emit('game:ready', {
      serverNow,
      startsAt,
      durationSeconds: first.guessDuration,
    });

    this.readyTimer = setTimeout(() => {
      this.readyTimer = null;
      this.readyStartsAt = null;
      this.startRound();
    }, readyMs);
  }

  /** Bail out after `game_started` was already sent: send players back to the
   *  lobby (cancel) and reset the room so a retry can start cleanly. */
  private abortStart(message: string): boolean {
    this.room.status = 'waiting';
    this.channel.emit('error', { message });
    this.channel.emit('game_cancelled', { reason: message });
    return false;
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
    this.readyStartsAt = null;
    this.clock.clear();
    this.clearBotTimers();
    this.room.touch();
    this.isRoundLoading = true;
    this.currentRoundIndex++;

    if (this.currentRoundIndex >= this.playlist.length) {
      void this.finish();
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

    const guessDurationMs = item.guessDuration * 1000 + START_BUFFER_MS + GUESS_END_GRACE_MS;
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
    // Players may change their answer until the round ends — bots answer once,
    // so guard only their re-entry (their timer fires a single time anyway).
    if (player.isBot && player.hasAnswered) return;

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

    // Solo ends as soon as the lone player answers (fast flow). In multiplayer the
    // round runs the full timer so everyone can still change their pick until the
    // end — ending early would prevent last-second changes and feel abrupt.
    if (this.room.isSolo && this.allConnectedAnswered()) this.endRound();
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

    const next = this.playlist[this.currentRoundIndex + 1];
    const payload: RoundRevealPayload = {
      round: this.currentRoundIndex + 1,
      song: this.toRevealSong(item),
      players: this.room.toPublicPlayers(true),
      nextVideo: next?.videoKey ?? null,
      nextVideoStartTime: next?.videoStartTime ?? null,
      serverNow: Date.now(),
      endsAt: this.clock.endsAt,
      durationSeconds: revealSeconds,
    };
    this.channel.emit('round_reveal', payload);
  }

  private async finish(): Promise<void> {
    this.phase = null;
    this.clock.clear();
    this.room.status = 'finished';

    const settings = this.room.settings;
    const responseType = (settings.responseType ?? 'mix') as ResponseType;

    const songDifficulties = this.playlist.map((s) => MatchEngine.normalizeDifficulty(s.difficulty));

    const result = computeVictory({
      players: [...this.room.players.values()].map((p) => ({
        userId: p.userId,
        score: p.score,
        correctCount: p.matchCorrectCount,
        totalCount: p.matchTotalCount,
      })),
      totalRounds: this.playlist.length,
      responseType,
      isSolo: this.room.isSolo,
      difficulties: settings.difficulty ?? [],
      songDifficulties,
    });

    const rankByUser = computeCompetitionRanks(
      result.rankings.map((r) => ({ id: r.userId, score: r.score })),
    );
    const publicPlayers = this.room.toPublicPlayers(true);
    const rankings = [...publicPlayers].sort((a, b) => b.score - a.score);
    const winner =
      result.winnerIds.length > 0
        ? rankings.find((p) => String(p.id) === result.winnerIds[0]) ?? null
        : null;

    // --- XP / leveling (Phase 7) ---
    const xpByUser = await this.computeMatchXp(result.winnerIds, rankByUser, rankings.length);

    // Reveal per-player XP on the game-over screen.
    for (const rp of rankings) {
      const outcome = xpByUser.get(String(rp.id));
      if (outcome) rp.xpEarned = outcome.earned;
    }

    const victoryData: VictoryData = {
      winner,
      winnerIds: result.winnerIds,
      rankings,
      totalMaxScore: result.maxPossibleScore,
      soloTargetRatio: result.soloTargetRatio,
      soloMedal: result.soloMedal,
      soloDifficulty: result.soloDifficultyLabel,
      multiWinnerCount: result.multiWinnerCount,
    };

    const roundHistoryByUserId = this.buildRoundHistoryByUser();
    const matchSettings = pickMatchSettings(this.room.settings);
    this.finishedVictoryData = victoryData;
    this.finishedRoundHistoryByUserId = roundHistoryByUserId;
    this.finishedMatchSettings = matchSettings;

    logger.info(
      `[MatchEngine ${this.room.id}] Match over. Winners: ${result.winnerIds.length || 'none'}.`,
      'Game',
    );

    const gameOverPayload: GameOverPayload = { victoryData, roundHistoryByUserId, matchSettings };
    this.channel.emit('game_over', gameOverPayload);

    // Push a level-up to each player's own socket (never broadcast).
    for (const p of this.room.players.values()) {
      const outcome = xpByUser.get(p.userId);
      if (outcome && outcome.newLevel > outcome.oldLevel && p.socketId) {
        this.room.io
          .to(p.socketId)
          .emit('level_up', { oldLevel: outcome.oldLevel, newLevel: outcome.newLevel, xp: outcome.newXp });
      }
    }

    void this.deps.repo
      .persistMatch({
        totalRounds: this.playlist.length,
        startedAt: this.startedAt,
        endedAt: new Date(),
        players: [...this.room.players.values()]
          .filter((p) => !p.isBot)
          .map((p) => {
          const outcome = xpByUser.get(p.userId);
          return {
            userId: p.userId,
            score: p.score,
            rank: rankByUser.get(p.userId) ?? 0,
            isWinner: result.winnerIds.includes(p.userId),
            correctCount: p.matchCorrectCount,
            totalCount: p.matchTotalCount,
            maxStreak: p.maxStreak,
            xpEarned: outcome?.earned ?? 0,
            newLevel: outcome?.newLevel,
            newWinStreak: outcome?.newWinStreak,
            correctSongIds: [...p.correctSongIds],
          };
        }),
        rounds: this.recordedRounds,
        songIds: this.playlist.map((s) => s.id),
      })
      .catch((e) => logger.error(`[MatchEngine ${this.room.id}] persistMatch failed`, 'Scoring', e));
  }

  /**
   * Computes per-player match XP + level transitions. Bots and guests (no
   * Profile) are excluded. Best-effort: on any failure the match still ends
   * (players simply earn no XP this round).
   */
  private async computeMatchXp(
    winnerIds: string[],
    rankByUser: Map<string, number>,
    playerCount: number,
  ): Promise<Map<string, { earned: number; oldLevel: number; newLevel: number; newXp: number; newWinStreak: number }>> {
    const outcomes = new Map<
      string,
      { earned: number; oldLevel: number; newLevel: number; newXp: number; newWinStreak: number }
    >();

    const humans = [...this.room.players.values()].filter((p) => !p.isBot);
    if (!humans.length) return outcomes;

    const difficultyBySong = new Map<number, SongDifficulty>(
      this.playlist.map((s) => [s.id, MatchEngine.normalizeDifficulty(s.difficulty)]),
    );

    try {
      const priors = await this.deps.repo.getXpState(humans.map((p) => p.userId));
      for (const player of humans) {
        const prior = priors.get(player.userId);
        if (!prior) continue; // guest without a Profile row

        const isWinner = winnerIds.includes(player.userId);
        const newWinStreak = isWinner ? prior.currentWinStreak + 1 : 0;

        const earned = xpForMatch({
          correctByDifficulty: this.tallyCorrectByDifficulty(player.correctSongIds, difficultyBySong),
          roundsPlayed: player.matchTotalCount,
          score: player.score,
          isWinner,
          rank: rankByUser.get(player.userId) ?? playerCount,
          playerCount,
          isSolo: this.room.isSolo,
          winStreak: newWinStreak,
        });

        const oldLevel = levelFromXp(prior.xp);
        const newXp = prior.xp + earned;
        outcomes.set(player.userId, {
          earned,
          oldLevel,
          newLevel: levelFromXp(newXp),
          newXp,
          newWinStreak,
        });
      }
    } catch (e) {
      logger.error(`[MatchEngine ${this.room.id}] XP computation failed`, 'Scoring', e);
    }

    return outcomes;
  }

  private tallyCorrectByDifficulty(
    correctSongIds: Set<number>,
    difficultyBySong: Map<number, SongDifficulty>,
  ): CorrectByDifficulty {
    const tally: CorrectByDifficulty = { easy: 0, medium: 0, hard: 0 };
    for (const songId of correctSongIds) {
      const diff = difficultyBySong.get(songId);
      if (diff) tally[diff] += 1;
    }
    return tally;
  }

  private static normalizeDifficulty(raw: string): SongDifficulty {
    switch ((raw ?? '').toLowerCase()) {
      case 'easy':
        return 'easy';
      case 'hard':
        return 'hard';
      default:
        return 'medium';
    }
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

  // --- SYNC / TEARDOWN ------------------------------------------------------

  getSyncState(): GameSyncState {
    const item = this.currentRoundIndex >= 0 ? this.playlist[this.currentRoundIndex] : null;
    const base: GameSyncState = {
      status: this.room.status,
      currentRound:
        this.currentRoundIndex >= 0
          ? this.currentRoundIndex + 1
          : this.phase === 'ready'
            ? 1
            : 0,
      totalRounds: this.playlist.length,
      players: this.room.toPublicPlayers(this.phase === 'reveal'),
      phase: this.phase,
      round: null as RoundStartPayload | null,
      reveal: null as RoundRevealPayload | null,
      ready: null as GameReadyPayload | null,
      introFirstVideo: this.phase === 'intro' ? this.playlist[0]?.videoKey ?? null : undefined,
    };

    if (this.room.status === 'finished' && this.finishedVictoryData) {
      base.victoryData = this.finishedVictoryData;
      base.roundHistoryByUserId = this.finishedRoundHistoryByUserId ?? undefined;
      base.matchSettings = this.finishedMatchSettings ?? undefined;
      return base;
    }

    if (this.phase === 'ready' && this.playlist[0] && this.readyStartsAt) {
      base.ready = {
        serverNow: Date.now(),
        startsAt: this.readyStartsAt,
        durationSeconds: this.playlist[0].guessDuration,
      };
    } else if (this.phase === 'guessing' && item) {
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
      const nextItem = this.playlist[this.currentRoundIndex + 1];
      base.reveal = {
        round: this.currentRoundIndex + 1,
        song: this.toRevealSong(item),
        players: this.room.toPublicPlayers(true),
        nextVideo: nextItem?.videoKey ?? null,
        nextVideoStartTime: nextItem?.videoStartTime ?? null,
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
    if (this.readyTimer) clearTimeout(this.readyTimer);
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.introTimer = null;
    this.readyTimer = null;
    this.readyStartsAt = null;
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

  /** Authoritative per-player round recap for game-over and reconnect sync. */
  private buildRoundHistoryByUser(): Record<string, RoundHistoryEntry[]> {
    const playlistBySongId = new Map(this.playlist.map((item) => [item.id, item]));
    const byUser = new Map<string, RoundHistoryEntry[]>();
    const playerIds = [...this.room.players.keys()];

    for (const recorded of this.recordedRounds) {
      const item = playlistBySongId.get(recorded.songId) ?? this.playlist[recorded.roundNumber - 1];
      if (!item) continue;
      const song = this.toRevealSong(item);
      const answersByUser = new Map(recorded.answers.map((a) => [a.userId, a]));

      for (const userId of playerIds) {
        const answer = answersByUser.get(userId);
        const entry: RoundHistoryEntry = {
          round: recorded.roundNumber,
          song,
          isCorrect: answer?.isCorrect ?? false,
          points: answer?.pointsAwarded ?? 0,
          myAnswer: answer?.answer ?? null,
          answerType: answer?.answerType ?? null,
        };
        const list = byUser.get(userId) ?? [];
        list.push(entry);
        byUser.set(userId, list);
      }
    }

    return Object.fromEntries(byUser);
  }

  /** Typed broadcast channel for this room. */
  private get channel() {
    return this.room.io.to(this.room.id);
  }
}
