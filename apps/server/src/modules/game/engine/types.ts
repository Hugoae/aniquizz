import type { AnswerType, GamePlayer, UserRole } from '@aniquizz/shared';

/**
 * Behaviour of a DEV-only simulated player.
 * `accuracy` in [0,1]; answer delay drawn uniformly in [minDelayMs, maxDelayMs].
 */
export interface BotConfig {
  accuracy: number;
  minDelayMs: number;
  maxDelayMs: number;
}

/**
 * Internal, server-authoritative player record. Keyed by `userId` in the Room.
 * `socketId` is mutable (reconnects); identity is always `userId`.
 */
export interface RoomPlayer {
  userId: string;
  username: string;
  avatar: string;
  socketId: string | null;
  isConnected: boolean;
  isReady: boolean;
  anilistUsername: string | null;
  /** Trusted account role (from socket auth), for the staff badge. */
  role?: UserRole;
  /** Player level (from lifetime XP, resolved at socket auth). */
  level?: number;

  /** DEV-only simulated player. Never has a real socket. */
  isBot?: boolean;
  botConfig?: BotConfig;

  // Cumulative match state
  score: number;
  streak: number;
  maxStreak: number;
  matchCorrectCount: number;
  matchTotalCount: number;
  /** Song ids this player answered correctly (for SongHistory aggregate). */
  correctSongIds: Set<number>;

  // Per-round transient state (reset each round)
  hasAnswered: boolean;
  currentAnswer: string | null;
  isCorrect: boolean | null;
  roundPoints: number;
  answerType: AnswerType | null;
  answerTimeMs: number | null;
}

/** A fully-prepared round: song info + pre-generated choices. */
export interface PlaylistItem {
  id: number;
  anime: string;
  franchise: string | null;
  validAnswers: string[];
  title: string;
  artist: string;
  typeLabel: string;
  difficulty: string;
  videoKey: string;
  videoStartTime: number;
  guessDuration: number;
  cover: string | null;
  animeId: number;
  year: number | null;
  season: string | null;
  format: string | null;
  episodeRange: string | null;
  coverColor: string | null;
  siteUrl: string;
  tags: string[];
  choices: string[];
  duo: string[];
}

/**
 * Live match progress for the admin panel. Admin-only, so it may include the
 * current anime/title (never leaked to players mid-round via the sync state).
 */
export interface AdminMatchProgress {
  currentRound: number;
  totalRounds: number;
  phase: 'intro' | 'ready' | 'guessing' | 'reveal' | null;
  anime: string | null;
  title: string | null;
  /** Server timestamp (ms) at which the current phase ends, or null. */
  endsAt: number | null;
}

/** An answer recorded in memory during the match, flushed to DB at finalize. */
export interface RecordedAnswer {
  userId: string;
  answer: string | null;
  isCorrect: boolean;
  answerType: AnswerType;
  timeMs: number | null;
  pointsAwarded: number;
}

export interface RecordedRound {
  roundNumber: number;
  songId: number;
  answers: RecordedAnswer[];
}

/** Convert an internal RoomPlayer to the public wire shape. */
export const toPublicPlayer = (
  player: RoomPlayer,
  opts: { hostId: string; status: string; returned: boolean; revealAnswers: boolean },
): GamePlayer => {
  const base: GamePlayer = {
    id: player.userId,
    username: player.username,
    avatar: player.avatar,
    score: player.score,
    streak: player.streak,
    isReady: player.isReady,
    isConnected: player.isConnected,
    isHost: player.userId === opts.hostId,
    isBot: player.isBot === true,
    role: player.role ?? 'USER',
    level: player.isBot ? undefined : player.level,
    // "In game" = still in the match flow (playing, paused, or on the game-over
    // screen) and has NOT returned to the lobby yet. Cleared on return / reset.
    isInGame:
      opts.status !== 'waiting' && opts.status !== 'starting' && !opts.returned,
    anilistUsername: player.anilistUsername,
    hasAnswered: player.hasAnswered,
    matchCorrectCount: player.matchCorrectCount,
    matchTotalCount: player.matchTotalCount,
  };

  // Anti-cheat: answer content / correctness / points only leak at reveal.
  if (opts.revealAnswers) {
    base.currentAnswer = player.currentAnswer;
    base.isCorrect = player.isCorrect;
    base.roundPoints = player.roundPoints;
    base.answerType = player.answerType;
  } else {
    base.currentAnswer = null;
    base.isCorrect = null;
    base.roundPoints = 0;
    base.answerType = null;
  }

  return base;
};
