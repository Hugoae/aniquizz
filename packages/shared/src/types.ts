// packages/shared/src/types.ts
// Shared domain types. Non-standard game modes are kept until Phase 4 cleanup.

// --- GAME & ROOM CONFIG ---
export type GameMode = 'solo' | 'multiplayer' | 'competitive';
export type SoundSelection = 'random' | 'mix' | 'watched' | 'playlist';

export interface GameConfig {
  mode: GameMode;
  gameType: 'standard' | 'battle-royale' | 'challenger' | 'time-trial';
  responseType: 'typing' | 'qcm' | 'mix';
  soundCount: number;
  soundTypes: string[];
  difficulty: string[];
  guessDuration: number;
  soundSelection: SoundSelection;
  playlist: string | null;
  livesCount?: number;
  // Starting time for Time Trial (15, 30, 45, 60)
  startingTime?: number;
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

  // Room management state
  isReady?: boolean;
  isConnected?: boolean;
  isHost?: boolean;
  isInGame?: boolean;

  // Mode-specific state
  lives?: number; // Battle Royale / Challenger
  isEliminated?: boolean; // Battle Royale / Challenger
  anilistUsername?: string | null; // Watched mode

  // Current round state
  currentAnswer?: string | null;
  isCorrect?: boolean | null;
  roundPoints?: number;

  // Session counters (stats)
  matchCorrectCount?: number;
  matchTotalCount?: number;
}

// Alias so existing Battle Royale code keeps compiling (removed in Phase 4).
export type BattleRoyalePlayer = GamePlayer;

export interface BattleRoyaleState {
  survivors: GamePlayer[];
  eliminated: GamePlayer[];
  phase: 'warmup' | 'main' | 'duel';
}

// --- VISUAL & FEEDBACK ---
export interface GameNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
