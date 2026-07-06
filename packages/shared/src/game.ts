// packages/shared/src/game.ts
// Canonical game/match domain types shared by client and server (Standard mode).
// Player identity is ALWAYS `userId` (Supabase auth). Never socket.id.

import type { GamePlayer, RoomConfig } from './types';

// --- STATUS & PHASES ---
export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';

/** Sub-phase while a match is `playing`. */
export type RoundPhase = 'intro' | 'guessing' | 'reveal';

/** How a player submitted their guess. Drives scoring. */
export type AnswerType = 'typing' | 'qcm' | 'duo';

/** Response mode configured for the room. `mix` lets the player pick per round. */
export type ResponseType = 'typing' | 'qcm' | 'mix';

/** Answer precision: match the exact anime name or any title in its franchise. */
export type Precision = 'exact' | 'franchise';

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
}

/** Anti-cheat: only signals THAT a player answered, never the content. */
export interface AnsweredPayload {
  userId: string;
}

export interface RoundRevealPayload extends PhaseTiming {
  round: number;
  song: RevealSong;
  /** Full player states, answers + correctness + points revealed here only. */
  players: GamePlayer[];
  nextVideo: string | null;
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
  soloTargetScore: number;
  soloDifficulty: string;
  multiWinnerCount: number;
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
  introFirstVideo?: string | null;
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
  settings: RoomSettings;
}

export interface RoomUpdatedPayload {
  roomSettings: RoomSettings;
  roomName: string;
  players: GamePlayer[];
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
