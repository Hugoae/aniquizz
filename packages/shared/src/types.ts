// --- CONFIGURATION JEU & SALON ---
export type GameMode = 'solo' | 'multiplayer' | 'competitive';
export type SoundSelection = 'random' | 'mix' | 'watched';

export interface GameConfig {
  mode: GameMode;
  gameType: 'standard' | 'battle-royale' | 'lives';
  responseType: 'typing' | 'qcm' | 'mix';
  soundCount: number;
  soundTypes: string[];
  difficulty: string[];
  guessDuration: number;
  soundSelection: SoundSelection;
  playlist: string | null;
  livesCount?: number;
  precision: 'exact' | 'franchise';
  decade?: string;
  watchedMode?: 'union' | 'intersection';
}

export interface RoomConfig extends GameConfig {
  roomName: string;
  isPrivate: boolean;
  password: string;
  maxPlayers: number;
}

// --- ENTITÉS JOUEUR & SOCKET ---
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
  
  // État Round Actuel
  currentAnswer?: string | null;
  isCorrect?: boolean | null;
  roundPoints?: number;
}

export interface BattleRoyalePlayer extends GamePlayer {
  lives: number;
  isEliminated: boolean; // "Ghost Mode"
}

export interface Room {
  id: string;
  name: string;
  hostId: string | number;
  players: GamePlayer[];
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  settings: RoomConfig;
}