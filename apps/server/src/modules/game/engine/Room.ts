import type { GamePlayer, GameStatus, GameSyncState, RoomSettings } from '@aniquizz/shared';
import { BOT_PROFILES } from '@aniquizz/database';
import { logger } from '../../../utils/logger';
import type { TypedServer } from '../../../core/socketTypes';
import { MatchEngine } from './MatchEngine';
import { MatchRepository } from './MatchRepository';
import { PlaylistBuilder } from './PlaylistBuilder';
import { standardScoring } from './ScoringStrategy';
import { toPublicPlayer, type AdminMatchProgress, type BotConfig, type RoomPlayer } from './types';

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
  /** When the room was created — surfaced in the admin panel ("open since"). */
  public readonly createdAt = new Date();

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

  /**
   * DEV-only: add a simulated player. Picks the next free bot profile from the
   * roster. Returns the created player, or null if the room is full / no bot
   * profile is available.
   */
  addBot(config: BotConfig): RoomPlayer | null {
    if (this.players.size >= this.settings.maxPlayers) return null;
    const used = new Set(this.players.keys());
    const profile = BOT_PROFILES.find((b) => !used.has(b.id));
    if (!profile) return null;

    const player: RoomPlayer = {
      userId: profile.id,
      username: profile.username,
      avatar: profile.avatar,
      socketId: `bot:${profile.id}`,
      isConnected: true,
      isReady: true,
      anilistUsername: null,
      isBot: true,
      botConfig: config,
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
    this.players.set(profile.id, player);
    logger.info(`[Room ${this.id}] Bot added: ${profile.username}`, 'Dev');
    this.emitLobbyUpdate();
    return player;
  }

  /** Number of human (non-bot) players currently in the room. */
  get humanCount(): number {
    return [...this.players.values()].filter((p) => !p.isBot).length;
  }

  /**
   * Admin/kick removal of a player. Returns the removed player's socketId (for a
   * human) so the caller can force the socket out of the room, or null.
   */
  kickPlayer(userId: string): string | null {
    const player = this.players.get(userId);
    if (!player) return null;
    const socketId = player.isBot ? null : player.socketId;
    this.removePlayer(userId);
    return socketId;
  }

  /** Explicit leave. Returns true if the room is now empty. */
  removePlayer(userId: string): boolean {
    if (!this.players.delete(userId)) return this.humanCount === 0;
    this.returnedPlayers.delete(userId);

    // A room with only bots (or none) left has no reason to exist.
    if (this.humanCount === 0) {
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
      .filter((p) => p.isConnected && !p.isBot)
      .map((p) => p.userId);
    const allConnectedReturned =
      connectedIds.length === 0 || connectedIds.every((id) => this.returnedPlayers.has(id));

    if (this.status === 'playing' || this.status === 'paused') {
      // A running match with no live engine is impossible → recover.
      if (!this.engine) {
        this.resetToWaiting();
        return;
      }
      // Everyone who is still connected has navigated back to the lobby (e.g. a
      // solo host who quit mid-match). Nobody is playing → cancel and reset.
      // Note: `allConnectedReturned` is also true when nobody is connected, so
      // require at least one connected human to avoid killing a match during a
      // transient full disconnect (that path keeps the grace-period cleanup).
      const hasConnectedHuman = connectedIds.length > 0;
      if (hasConnectedHuman && allConnectedReturned) {
        this.engine.cancel();
        this.engine = null;
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
    // Bots never count: a room with only bots must still be cleaned up.
    return [...this.players.values()].some((p) => p.isConnected && !p.isBot);
  }

  getPlayerBySocket(socketId: string): RoomPlayer | undefined {
    return [...this.players.values()].find((p) => p.socketId === socketId);
  }

  private promoteNextHost(): void {
    const candidates = [...this.players.values()]
      .filter((p) => !p.isBot)
      .sort((a, b) => a.username.localeCompare(b.username));
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
    this.forceCancel();
  }

  /** Admin/system cancel of the running match (no host check). */
  forceCancel(reason?: string): void {
    this.engine?.cancel();
    this.engine = null;
    this.resetToWaiting();
    this.io.to(this.id).emit('game_cancelled', reason ? { reason } : undefined);
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
      // Bots come straight back to the lobby ready to play — they never need to
      // click "return to lobby", so they should not linger in a "waiting" state.
      if (p.isBot) p.isReady = true;
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

  /** Admin-only live match progress, or null when not in a match. */
  getAdminProgress(): AdminMatchProgress | null {
    if (!this.engine || (this.status !== 'playing' && this.status !== 'paused')) return null;
    return this.engine.getAdminProgress();
  }

  dispose(): void {
    this.engine?.cancel();
    this.engine = null;
  }
}
