// packages/shared/src/types.ts
// Shared domain types (Standard mode only).

import type { UserRole } from './roles';
import type { Precision } from './precision';
import type { VideoMode } from './videoMode';
import type { SongStartMode } from './songStartMode';

// --- GAME & ROOM CONFIG ---
export type GameMode = 'solo' | 'multiplayer' | 'competitive';
export type SoundSelection = 'random' | 'mix' | 'watched' | 'playlist';

/** Match rules variant. Quick Draw = typing-only multi speed mode (26.3). */
export type GameType = 'standard' | 'sprint';

export interface GameConfig {
  mode: GameMode;
  gameType: GameType;
  responseType: 'typing' | 'qcm' | 'mix';
  soundCount: number;
  soundTypes: string[];
  difficulty: string[];
  guessDuration: number;
  soundSelection: SoundSelection;
  precision: Precision;
  watchedMode?: 'union' | 'intersection';
  /** When true in Watched mode, the host opted in to fill missing rounds from the global catalogue. */
  watchedAllowFallback?: boolean;
  /** Guessing-phase clip presentation (reveal is always full video). */
  videoMode?: VideoMode;
  /** Where each guessing-round clip starts: random offset (default) or beginning. */
  songStartMode?: SongStartMode;
  hostAvatar?: string;
  hostName?: string;
}

export interface RoomConfig extends GameConfig {
  roomName: string;
  isPrivate: boolean;
  password: string;
  maxPlayers: number;
}

// --- PLAYER & SOCKET ENTITIES ---
export interface BasePlayer {
  id: string | number;
  username: string;
  avatar: string;
}

export interface GamePlayer extends BasePlayer {
  score: number;
  streak: number;
  rank?: string;

  isReady?: boolean;
  isConnected?: boolean;
  isHost?: boolean;
  isInGame?: boolean;
  /** DEV-only simulated player. */
  isBot?: boolean;
  /** Account role, used to draw a staff badge next to the name. */
  role?: UserRole;
  /** Player level (from lifetime XP), shown in the lobby. */
  level?: number;

  anilistUsername?: string | null;
  malUsername?: string | null;

  currentAnswer?: string | null;
  isCorrect?: boolean | null;
  roundPoints?: number;
  /** Anti-cheat: set during guessing (no answer content leaked). */
  hasAnswered?: boolean;
  /** How the current-round answer was submitted. */
  answerType?: 'typing' | 'qcm' | 'duo' | null;

  /** Quick Draw: 1-based rank among correct answerers (reveal only). */
  speedRank?: number | null;
  /** Quick Draw: speed podium bonus for this round (reveal only). */
  speedBonus?: number;

  matchCorrectCount?: number;
  matchTotalCount?: number;
  /** XP earned this match (revealed on the game-over screen). */
  xpEarned?: number;
}

// --- VISUAL & FEEDBACK ---
export interface GameNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
