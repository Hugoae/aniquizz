// packages/shared/src/game.ts
// Canonical game/match domain types shared by client and server (Standard mode).
// Player identity is ALWAYS `userId` (Supabase auth). Never socket.id.

import type { GamePlayer, GameType, RoomConfig } from './types';
import type { MedalTier } from './grading';
import type { UserRole } from './roles';
import type { Precision } from './precision';
import type { PeekWindow, VideoMode } from './videoMode';

export type { Precision };

// --- STATUS & PHASES ---
export type GameStatus = 'waiting' | 'starting' | 'playing' | 'paused' | 'finished';

/** Sub-phase while a match is `playing`. */
export type RoundPhase = 'intro' | 'ready' | 'guessing' | 'reveal';

/** How a player submitted their guess. Drives scoring. */
export type AnswerType = 'typing' | 'qcm' | 'duo';

/** User-facing labels for answer types (French, isolated for i18n). */
export const ANSWER_TYPE_LABELS: Record<AnswerType, string> = {
  typing: 'Typing',
  qcm: 'Carré',
  duo: 'Duo',
};

/** Response mode configured for the room. `mix` lets the player pick per round. */
export type ResponseType = 'typing' | 'qcm' | 'mix';

// --- SETTINGS ---
/**
 * Server-authoritative room settings. Extends the client-facing `RoomConfig`
 * with the resolved display name. Validated on the server (see game/settings).
 */
export interface RoomSettings extends RoomConfig {
  name: string;
}

// --- SONG / PLAYLIST ---
/** Public per-round song info sent to clients at reveal (no answer leaks). */
export interface RevealSong {
  id: number;
  anime: string;
  title: string;
  artist: string;
  /** Display label, e.g. "OP1". */
  type: string;
  difficulty: string;
  cover?: string | null;
  franchise?: string | null;
  year?: number | null;
  /** AniList release season: WINTER / SPRING / SUMMER / FALL. */
  season?: string | null;
  /** AniList format: TV, MOVIE, OVA, etc. */
  format?: string | null;
  /** Episode range covered by this theme entry (AnimeThemes), e.g. "1-13". */
  episodeRange?: string | null;
  /** Dominant cover color from AniList — UI accent at reveal only. */
  coverColor?: string | null;
  siteUrl?: string;
  tags?: string[];
  animeId?: number;
  /** R2 video key — used to play the OP/ED during reveal. */
  videoKey: string;
  /** Start offset in seconds (0 = play from the beginning on reveal). */
  videoStartTime: number;
}

// --- TIMING (authoritative clock) ---
/**
 * Authoritative timing envelope. The client maps server time to its local clock:
 * `localEndsAt = Date.now() + (endsAt - serverNow)`.
 */
export interface PhaseTiming {
  /** Server `Date.now()` at emit. */
  serverNow: number;
  /** Server timestamp at which the current phase ends. */
  endsAt: number;
  /** Nominal phase duration in seconds (for the progress bar denominator). */
  durationSeconds: number;
}

// --- WIRE PAYLOADS (server → client) ---
export interface GameStartedPayload {
  roomId: string;
  settings: RoomSettings;
  players: GamePlayer[];
  introDuration: number;
  firstVideo: string | null;
}

export interface RoundStartPayload extends PhaseTiming {
  round: number;
  totalRounds: number;
  videoKey: string;
  videoStartTime: number;
  /** Buffer (ms) before the guess clock starts, to let the video load. */
  startBuffer: number;
  /** QCM choices (present when responseType is `qcm` or `mix`). */
  choices?: string[];
  /** Duo choices (present when responseType is `mix`). */
  duo?: string[];
  /** Present when `videoMode === 'peek'` — server-generated at round start. */
  peekWindow?: PeekWindow;
  /** Room setting echoed for client rendering (reconnect-safe). */
  videoMode?: VideoMode;
}

/** Anti-cheat: only signals THAT a player answered, never the content. */
export interface AnsweredPayload {
  userId: string;
}

/** One row in the live Sprint speed board (correct answerers only). */
export interface SprintLeaderboardEntry {
  userId: string;
  username: string;
  avatar: string;
  timeMs: number;
}

/** Final Sprint speed board pushed at round reveal (one socket per human player). */
export interface SprintLeaderboardPayload {
  /** Top three fastest correct answerers so far this round. */
  top: SprintLeaderboardEntry[];
  /** Local player's latest attempt (time + projected total when correct). */
  you: {
    timeMs: number | null;
    isCorrect: boolean | null;
    projectedPoints: number | null;
  };
}

export interface RoundRevealPayload extends PhaseTiming {
  round: number;
  song: RevealSong;
  /** Full player states, answers + correctness + points revealed here only. */
  players: GamePlayer[];
  nextVideo: string | null;
  /** Start offset (s) of the next clip, so the client can warm it at the right
   *  byte range during the reveal. Null when there is no next round. */
  nextVideoStartTime: number | null;
}

/** Ask the client to warm a clip's buffer ahead of time (round 1 during the
 *  intro, next rounds during the reveal). Emitted only in "safe" phases where
 *  the answer is not being guessed, so exposing the key leaks nothing. */
export interface PreloadVideoPayload {
  videoKey: string;
  videoStartTime: number;
}

/** Short beat after the intro loader, before round 1: game UI visible, no audio yet. */
export interface GameReadyPayload {
  serverNow: number;
  /** Wall-clock instant when `round_start` will fire. */
  startsAt: number;
  /** Nominal guess duration for the frozen ring display. */
  durationSeconds: number;
}

export interface PlayersUpdatePayload {
  players: GamePlayer[];
  hostId?: string;
  status?: GameStatus;
}

export interface VoteUpdatePayload {
  type: 'pause' | 'skip';
  count: number;
  required: number;
  isPending?: boolean;
}

export interface VictoryData {
  winner: GamePlayer | null;
  winnerIds: string[];
  rankings: GamePlayer[];
  totalMaxScore: number;
  /** Mastery ratio (0–1) required for a Bronze medal / a solo win. */
  soloTargetRatio: number;
  /** The solo player's medal (null = defeat). Multiplayer has no medals. */
  soloMedal: MedalTier;
  soloDifficulty: string;
  multiWinnerCount: number;
}

/** Per-round recap for the game-over screen (authoritative when sent by the server). */
export interface RoundHistoryEntry {
  round: number;
  song: RevealSong;
  isCorrect: boolean;
  points: number;
  /** What the player submitted (null if no answer). */
  myAnswer: string | null;
  /** How the answer was submitted (null when the player did not answer). */
  answerType: AnswerType | null;
  /** Sprint — final answer time in ms (null if unanswered or wrong). */
  answerTimeMs?: number | null;
  /** Sprint — 1-based rank among correct answerers this round. */
  speedRank?: number | null;
  /** Sprint — podium bonus points for this round. */
  speedBonus?: number;
}

/** Settings strip on the game-over screen — snapshot at match end. */
export type MatchSettingsSnapshot = Pick<
  RoomSettings,
  | 'gameType'
  | 'soundCount'
  | 'guessDuration'
  | 'difficulty'
  | 'precision'
  | 'responseType'
  | 'soundSelection'
  | 'videoMode'
  | 'songStartMode'
>;

export function pickMatchSettings(settings: RoomSettings): MatchSettingsSnapshot {
  return {
    gameType: settings.gameType,
    soundCount: settings.soundCount,
    guessDuration: settings.guessDuration,
    difficulty: settings.difficulty,
    precision: settings.precision,
    responseType: settings.responseType,
    soundSelection: settings.soundSelection,
    videoMode: settings.videoMode,
    songStartMode: settings.songStartMode,
  };
}

/** Emitted when a match ends. Round history is keyed by userId. */
export interface GameOverPayload {
  victoryData: VictoryData;
  roundHistoryByUserId: Record<string, RoundHistoryEntry[]>;
  /** Authoritative lobby config for the finished match (avoids stale client nav state). */
  matchSettings: MatchSettingsSnapshot;
}

/** Full snapshot used for (re)joining a match in progress. */
export interface GameSyncState {
  status: GameStatus;
  currentRound: number;
  totalRounds: number;
  players: GamePlayer[];
  phase: RoundPhase | null;
  round: RoundStartPayload | null;
  reveal: RoundRevealPayload | null;
  /** Populated while `phase === 'ready'` (between intro and round 1). */
  ready?: GameReadyPayload | null;
  introFirstVideo?: string | null;
  /** Populated when `status === 'finished'` (reconnect on the game-over screen). */
  victoryData?: VictoryData | null;
  /** Populated when `status === 'finished'`. Client picks its slice by userId. */
  roundHistoryByUserId?: Record<string, RoundHistoryEntry[]>;
  /** Populated when `status === 'finished'`. */
  matchSettings?: MatchSettingsSnapshot;
}

// --- LOBBY PAYLOADS ---
export interface LobbyJoinedPayload {
  roomId: string;
  userId: string;
  settings: RoomSettings;
  players: GamePlayer[];
  isHost: boolean;
  status: GameStatus;
}

export interface RoomListSettingsSummary {
  gameType?: GameType;
  soundCount: number;
  difficulty: string[];
  guessDuration: number;
  precision: Precision;
  responseType: ResponseType;
  soundSelection: string;
  videoMode?: VideoMode;
}

export interface RoomListItem {
  id: string;
  name: string;
  host: string;
  hostAvatar: string;
  mode: string;
  players: number;
  maxPlayers: number;
  isPrivate: boolean;
  status: GameStatus;
  /** Trimmed settings for the public lobby browser (no password / host duplicates). */
  settings: RoomListSettingsSummary;
}

export interface RoomUpdatedPayload {
  roomSettings: RoomSettings;
  roomName: string;
  players: GamePlayer[];
}

// --- XP / LEVELING ---
/** Pushed to a player's own socket when a finished match makes them level up. */
export interface LevelUpPayload {
  oldLevel: number;
  newLevel: number;
  /** New lifetime XP total. */
  xp: number;
}

// --- SOCIAL / FRIENDS (Phase 7) ---
/**
 * Rich presence, computed server-side from the socket rooms + GameManager.
 * `offline` = no live socket; `online` = connected but idle (menu);
 * `in_lobby` = in a waiting room; `in_game` = in a running match.
 */
export type PresenceStatus = 'offline' | 'online' | 'in_lobby' | 'in_game';

/** A user in the friends UI (confirmed friend or the other party of a request). */
export interface FriendSummary {
  /** Profile id = auth userId. */
  id: string;
  username: string;
  avatar: string;
  level: number;
  /** Account role, used to draw a staff ring on the avatar. */
  role: UserRole;
  /** Rich presence status. */
  status: PresenceStatus;
  /** ISO timestamp of last presence, null if never seen. */
  lastSeenAt: string | null;
  /** Room the friend is currently in, if any (used for "Rejoindre"). */
  roomId?: string | null;
  /** Display name of that room, if any. */
  roomName?: string | null;
  /** True when the friend's room is a joinable lobby (waiting + not full). */
  joinable?: boolean;
}

/** A pending friend request (either incoming or outgoing). */
export interface FriendRequest {
  /** Friendship row id — used to accept / reject. */
  id: string;
  /** The other party (not the current user). */
  user: FriendSummary;
  /** ISO timestamp the request was created. */
  createdAt: string;
}

/** A user recently played with, offered for a 1-click add. */
export interface RecentPlayer {
  id: string;
  username: string;
  avatar: string;
  level: number;
  /** ISO timestamp of the most recent shared match. */
  lastPlayedAt: string;
}

/** Full friends snapshot pushed on `friends:state`. */
export interface FriendsState {
  friends: FriendSummary[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  /** Users the current user has blocked. */
  blocked: FriendSummary[];
  /** Profile ids of users who blocked the current user (UI hides add button only). */
  blockedByUserIds: string[];
  /** Privacy: when false, the user refuses all incoming friend requests. */
  allowFriendRequests: boolean;
}

/** Pushed to a user's own sockets when a friend's presence changes. */
export interface FriendPresencePayload {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: string | null;
  roomId?: string | null;
  roomName?: string | null;
  joinable?: boolean;
}

/** Pushed to a user when a friend invites them to a lobby. */
export interface LobbyInvitePayload {
  /** Friendship-agnostic: who sent the invite. */
  from: { id: string; username: string; avatar: string };
  roomId: string;
  roomName: string;
  isPrivate: boolean;
}

/** Aggregated stats block shared by the personal and public profile views. */
export interface ProfileStats {
  createdAt: string;
  xp: number;
  level: number;
  bestScore: number;
  scoreTotal: number;
  avgXpPerGame: number;
  /** Average answer time in ms (null when no timed answers). */
  avgAnswerMs: number | null;
  /** Fastest answer time in ms (null when no timed answers). */
  fastestAnswerMs: number | null;
  roundsPlayed: number;
  multiCount: number;
  soloCount: number;
  playtimeMs: number;
  /** Musical Pokédex: unique songs discovered by this user. */
  discoveredSongs: number;
  /** Total playable songs (collection denominator). */
  totalSongs: number;
  /** Collection completion, 0–100. */
  progressPercent: number;
  history: MatchHistoryEntry[];
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalGuesses: number;
    correctGuesses: number;
    maxStreak: number;
    winRate: number;
    accuracy: number;
  };
}

/** Public profile/stats returned by `profile:get_public`. */
export interface PublicProfile extends ProfileStats {
  id: string;
  username: string;
  avatar: string;
  role: string;
  status: PresenceStatus;
  lastSeenAt: string | null;
  /** This user's confirmed friends (read-only, for the public profile). */
  friends: FriendSummary[];
  /** Relationship of the viewer to this profile. */
  relation: 'self' | 'friends' | 'incoming' | 'outgoing' | 'blocked' | 'none';
}

/** A finished match as shown in the profile match-history list. */
export interface MatchHistoryEntry {
  /** Match id. */
  id: string;
  /** When the match ended (or started, as a fallback). */
  playedAt: string;
  mode: string;
  /** Answer style used: 'Typing' | 'QCM' | 'Duo' | 'Mix' (null if unknown). */
  answerMode: string | null;
  totalRounds: number;
  score: number;
  /** Final placement (1-based); null for solo matches. */
  rank: number | null;
  isWinner: boolean;
  correctCount: number;
  xpEarned: number;
  /** Number of players in the match (bots included). */
  playerCount: number;
  /** Match duration in ms, when both timestamps are known. */
  durationMs: number | null;
}

// --- CHAT ---
export interface ChatMessage {
  id: string;
  senderId: string;
  username: string;
  avatar?: string;
  content: string;
  timestamp: number;
  isSystem: boolean;
}

// --- MISC ---
export interface ErrorPayload {
  message: string;
}
