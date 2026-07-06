// packages/shared/src/types.ts
// Shared domain types (Standard mode only).

// --- GAME & ROOM CONFIG ---
export type GameMode = 'solo' | 'multiplayer' | 'competitive';
export type SoundSelection = 'random' | 'mix' | 'watched' | 'playlist';

export interface GameConfig {
  mode: GameMode;
  gameType: 'standard';
  responseType: 'typing' | 'qcm' | 'mix';
  soundCount: number;
  soundTypes: string[];
  difficulty: string[];
  guessDuration: number;
  soundSelection: SoundSelection;
  playlist: string | null;
  precision: 'exact' | 'franchise';
  decade?: string;
  watchedMode?: 'union' | 'intersection';
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

  anilistUsername?: string | null;

  currentAnswer?: string | null;
  isCorrect?: boolean | null;
  roundPoints?: number;

  matchCorrectCount?: number;
  matchTotalCount?: number;
}

// --- VISUAL & FEEDBACK ---
export interface GameNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
