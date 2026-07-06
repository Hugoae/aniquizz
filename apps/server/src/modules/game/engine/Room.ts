import type { GamePlayer, GameStatus, GameSyncState, RoomSettings } from '@aniquizz/shared';
import { logger } from '../../../utils/logger';
import type { TypedServer } from '../../../core/socketTypes';
import { MatchEngine } from './MatchEngine';
import { MatchRepository } from './MatchRepository';
import { PlaylistBuilder } from './PlaylistBuilder';
import { standardScoring } from './ScoringStrategy';
import { toPublicPlayer, type RoomPlayer } from './types';

/**
 * A game room: owns the lobby (players keyed by `userId`), settings, host, and
 * the ready/return-to-lobby lifecycle. Delegates the running match to MatchEngine.
 */
export class Room {
  public readonly id: string;
  public readonly io: TypedServer;
  public settings: RoomSettings;
  public hostId: string;
  public status: GameStatus = 'waiting';

  public readonly players = new Map<string, RoomPlayer>();
  public readonly returnedPlayers = new Set<string>();

  private engine: MatchEngine | null = null;

  constructor(id: string, io: TypedServer, hostId: string, settings: RoomSettings) {
    this.id = id;
    this.io = io;
    this.hostId = hostId;
    this.settings = settings;
  }

  // --- LOBBY MEMBERSHIP -----------------------------------------------------

  /** Add a new player or reconnect an existing one (identity = userId). */
  addOrReconnect(
    userId: string,
    username: string,
    avatar: string,
    socketId: string,
    opts: { asHost?: boolean; anilistUsername?: string | null } = {},
  ): RoomPlayer {
    const safeUsername = username?.trim() || `Joueur ${userId.substring(0, 4).toUpperCase()}`;
    const existing = this.players.get(userId);

    if (existing) {
      existing.socketId = socketId;
      existing.isConnected = true;
      existing.username = safeUsername;
      existing.avatar = avatar || existing.avatar;
      if (opts.anilistUsername !== undefined) existing.anilistUsername = opts.anilistUsername;
      logger.info(`[Room ${this.id}] Reconnected: ${safeUsername} (${userId})`, 'Lobby');
      this.emitLobbyUpdate();
      return existing;
    }

    const player: RoomPlayer = {
      userId,
      username: safeUsername,
      avatar: avatar || 'player1',
      socketId,
      isConnected: true,
      isReady: opts.asHost === true || userId === this.hostId,
      anilistUsername: opts.anilistUsername ?? null,
      score: 0,
      streak: 0,
      maxStreak: 0,
      matchCorrectCount: 0,
      matchTotalCount: 0,
      correctSongIds: new Set(),
      hasAnswered: false,
      currentAnswer: null,
      isCorrect: null,
      roundPoints: 0,
      answerType: null,
      answerTimeMs: null,
    };
    this.players.set(userId, player);
    this.emitLobbyUpdate();
    return player;
  }

  /** Explicit leave. Returns true if the room is now empty. */
  removePlayer(userId: string): boolean {
    if (!this.players.delete(userId)) return this.players.size === 0;
    this.returnedPlayers.delete(userId);

    if (this.players.size === 0) {
      this.engine?.cancel();
      this.engine = null;
      return true;
    }

    if (userId === this.hostId) this.promoteNextHost();
    this.settleLifecycle();
    this.emitLobbyUpdate();
    return false;
  }

  /** Mark the socket's player as disconnected (kept for reconnect). */
  markDisconnected(socketId: string): RoomPlayer | null {
    const player = [...this.players.values()].find((p) => p.socketId === socketId);
    if (!player) return null;
    player.isConnected = false;
    this.settleLifecycle();
    this.emitLobbyUpdate();
    return player;
  }

  /**
   * Mark a player as being in the lobby (not in the match / game-over screen).
   * Called when a player (re)enters the lobby via join, so a refresh or navigation
   * back never leaves them stuck showing "in game".
   */
  markInLobby(userId: string): void {
    if (this.status === 'waiting') return;
    this.returnedPlayers.add(userId);
    const player = this.players.get(userId);
    if (player) player.isReady = userId === this.hostId;
    this.settleLifecycle();
  }

  /**
   * Self-healing status recovery. Called after any membership/return change so the
   * room never stays stuck in `playing`/`finished` when the match is effectively
   * over: no active engine, nobody connected, or every connected player is back
   * in the lobby.
   */
  private settleLifecycle(): void {
    if (this.status === 'waiting') return;

    const connectedIds = [...this.players.values()]
      .filter((p) => p.isConnected)
      .map((p) => p.userId);
    const allConnectedReturned =
      connectedIds.length === 0 || connectedIds.every((id) => this.returnedPlayers.has(id));

    if (this.status === 'playing' || this.status === 'paused') {
      // A running match with no live engine is impossible → recover.
      if (!this.engine) {
        this.resetToWaiting();
      }
      return;
    }

    // status === 'finished': match is over, resolve once everyone left the flow.
    if (allConnectedReturned) {
      this.engine = null;
      this.resetToWaiting();
    }
  }

  get hasConnectedPlayers(): boolean {
    return [...this.players.values()].some((p) => p.isConnected);
  }

  getPlayerBySocket(socketId: string): RoomPlayer | undefined {
    return [...this.players.values()].find((p) => p.socketId === socketId);
  }

  private promoteNextHost(): void {
    const candidates = [...this.players.values()].sort((a, b) =>
      a.username.localeCompare(b.username),
    );
    const next = candidates[0];
    if (!next) return;
    this.hostId = next.userId;
    this.settings.hostName = next.username;
    this.settings.hostAvatar = next.avatar;
    next.isReady = true;
    logger.info(`[Room ${this.id}] New host: ${next.username}`, 'Lobby');
    this.io.to(this.id).emit('host_promoted');
  }

  transferHost(fromUserId: string, targetUserId: string): boolean {
    if (fromUserId !== this.hostId) return false;
    const target = this.players.get(targetUserId);
    if (!target) return false;
    this.hostId = targetUserId;
    this.settings.hostName = target.username;
    this.settings.hostAvatar = target.avatar;
    target.isReady = true;
    if (target.socketId) this.io.to(target.socketId).emit('host_promoted');
    this.emitLobbyUpdate();
    return true;
  }

  toggleReady(userId: string): void {
    if (userId === this.hostId) return;
    const player = this.players.get(userId);
    if (!player) return;
    player.isReady = !player.isReady;
    this.emitLobbyUpdate();
  }

  applySettings(userId: string, next: RoomSettings): boolean {
    if (userId !== this.hostId) return false;
    this.settings = next;
    this.io.to(this.id).emit('room_updated', {
      roomSettings: this.settings,
      roomName: this.settings.name,
      players: this.toPublicPlayers(),
    });
    return true;
  }

  setWatchedIds(userId: string, ids: number[]): void {
    const player = this.players.get(userId);
    if (player) player.watchedIds = ids;
  }

  // --- PUBLIC PROJECTION ----------------------------------------------------

  toPublicPlayers(revealAnswers = false): GamePlayer[] {
    return [...this.players.values()].map((p) =>
      toPublicPlayer(p, {
        hostId: this.hostId,
        status: this.status,
        returned: this.returnedPlayers.has(p.userId),
        revealAnswers,
      }),
    );
  }

  emitLobbyUpdate(): void {
    this.io.to(this.id).emit('update_players', {
      players: this.toPublicPlayers(),
      hostId: this.hostId,
      status: this.status,
    });
  }

  get isSolo(): boolean {
    return this.settings.maxPlayers === 1;
  }

  /** Whether the host may start a match now, with a user-facing reason if not. */
  canStartMatch(userId: string): { ok: boolean; reason?: string } {
    if (userId !== this.hostId) {
      return { ok: false, reason: "Seul l'hôte peut lancer la partie." };
    }
    if (this.status === 'playing' || this.status === 'paused') {
      return { ok: false, reason: 'Une partie est déjà en cours.' };
    }
    const connected = [...this.players.values()].filter((p) => p.isConnected);
    if (!this.isSolo && connected.length < 2) {
      return { ok: false, reason: 'En attente de joueurs (2 minimum).' };
    }
    return { ok: true };
  }

  // --- MATCH LIFECYCLE ------------------------------------------------------

  async startMatch(): Promise<void> {
    if (this.status === 'playing') return;
    this.returnedPlayers.clear();
    this.engine = new MatchEngine(this, {
      builder: new PlaylistBuilder(),
      repo: new MatchRepository(),
      scoring: standardScoring,
    });
    await this.engine.start();
  }

  handleAnswer(userId: string, answer: string, answerType: GamePlayer['answerType']): void {
    this.engine?.handleAnswer(userId, answer, answerType ?? 'typing');
  }

  votePause(userId: string): void {
    this.engine?.votePause(userId);
  }

  voteSkip(userId: string): void {
    this.engine?.voteSkip(userId);
  }

  forceEndRound(): void {
    this.engine?.forceEndRound();
  }

  cancelMatch(userId: string): void {
    if (userId !== this.hostId) return;
    this.engine?.cancel();
    this.engine = null;
    this.resetToWaiting();
    this.io.to(this.id).emit('game_cancelled');
    this.emitLobbyUpdate();
  }

  playerReturnToLobby(userId: string): void {
    this.returnedPlayers.add(userId);
    const player = this.players.get(userId);
    if (player) player.isReady = userId === this.hostId;
    this.settleLifecycle();
    this.emitLobbyUpdate();
  }

  resetToWaiting(): void {
    this.status = 'waiting';
    this.returnedPlayers.clear();
    for (const p of this.players.values()) {
      p.score = 0;
      p.streak = 0;
      p.maxStreak = 0;
      p.matchCorrectCount = 0;
      p.matchTotalCount = 0;
      p.correctSongIds = new Set();
      p.hasAnswered = false;
      p.currentAnswer = null;
      p.isCorrect = null;
      p.roundPoints = 0;
      p.answerType = null;
      p.answerTimeMs = null;
    }
  }

  getSyncState(): GameSyncState {
    if (this.engine && (this.status === 'playing' || this.status === 'paused')) {
      return this.engine.getSyncState();
    }
    return {
      status: this.status,
      currentRound: 0,
      totalRounds: this.settings.soundCount ?? 0,
      players: this.toPublicPlayers(),
      phase: null,
      round: null,
      reveal: null,
    };
  }

  dispose(): void {
    this.engine?.cancel();
    this.engine = null;
  }
}
