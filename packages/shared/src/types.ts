// packages/shared/src/types.ts
// Shared domain types (Standard mode only).

import type { UserRole } from './roles';
import type { Precision } from './precision';
import type { VideoMode } from './videoMode';
import type { SongStartMode } from './songStartMode';
import type { WatchedListProvider } from './watchedList';

// --- GAME & ROOM CONFIG ---
export type GameMode = 'solo' | 'multiplayer' | 'competitive';
export type SoundSelection = 'random' | 'mix' | 'watched' | 'playlist';

/** Match rules variant. Speed podium is `speedBonusEnabled` on Standard, not a GameType. */
export type GameType = 'standard' | 'timeAttack';

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  standard: 'Standard',
  timeAttack: 'Contre-la-montre',
};

export type GameTypeId = GameType;

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
  /** Staff thematic playlist id when `soundSelection === 'playlist'`. Null clears a previous id. */
  playlistId?: string | null;
  /** Optional decade pack combined with `playlistId` (snapshot intersection). Null clears it. */
  decadePlaylistId?: string | null;
  /**
   * When true with a playlist source, intersect the pack with AniList/MAL lists.
   * Fallback (if opted in) fills from the rest of the pack, never the global catalogue.
   */
  playlistWatched?: boolean;
  /**
   * Multiplayer typing modifier: podium bonus for the fastest correct answers.
   * Ignored unless response type is typing and the room has at least two seats.
   */
  speedBonusEnabled?: boolean;
  /**
   * Solo time-attack budget in seconds (60–300, step 30). Ignored on Standard.
   */
  timeBudgetSeconds?: number;
  /**
   * Solo time-attack: skips get more expensive within the run (default true).
   * False keeps every skip at the flat 5 s tax.
   */
  timeAttackPunitiveSkip?: boolean;
  /**
   * Solo time-attack: show the 3 s reveal after a found / missed title (default true).
   * False jumps straight to the next clip; the recent-titles list still shows the answer.
   */
  timeAttackReveal?: boolean;
  /**
   * Solo Standard: after a submitted answer, reveal the clip immediately.
   * Ignored in multiplayer and in time attack. Default off.
   */
  soloInstantReveal?: boolean;
  /**
   * Admin-only. The match plays through, but nothing is written for the
   * participants (history, XP, stats, heard songs). The server drops this
   * unless the host who set it is an admin.
   */
  testMatch?: boolean;
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
  /** Which linked list feeds Watched mode. Null when none is linked. */
  activeListProvider?: WatchedListProvider | null;

  currentAnswer?: string | null;
  isCorrect?: boolean | null;
  roundPoints?: number;
  /** Anti-cheat: set during guessing (no answer content leaked). */
  hasAnswered?: boolean;
  /** How the current-round answer was submitted. */
  answerType?: 'typing' | 'qcm' | 'duo' | null;

  /** Speed bonus: 1-based rank among correct answerers (reveal only). */
  speedRank?: number | null;
  /** Speed bonus: podium points for this round (reveal only). */
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
