// --- TYPES ------------------------------------------------------------------

export type UserListFilter =
  'all' | 'players' | 'moderators' | 'admins' | 'muted' | 'banned' | 'online' | 'in_game';

export type UserListSort = 'username' | 'xp' | 'games' | 'created' | 'seen';

export type Role = 'USER' | 'MODERATOR' | 'ADMIN';
export type Presence = 'online' | 'in_game' | 'offline';

export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: {
    online: number;
    inGame: number;
    banned: number;
    muted: number;
  };
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  avatar: string;
  role: Role;
  level: number;
  xp: number;
  gamesPlayed: number;
  gamesWon: number;
  bannedUntil: string | null;
  mutedUntil: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  isBot: boolean;
  presence: Presence;
  currentRoom: { id: string; name: string } | null;
}

export interface AdminProfileStats {
  totalSongs: number;
  discoveredSongs: number;
  progressPercent: number;
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

export interface AdminUserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  role: Role;
  level: number;
  xp: number;
  gamesPlayed: number;
  gamesWon: number;
  bannedUntil: string | null;
  mutedUntil: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  anilistUsername: string | null;
  malUsername: string | null;
  isBot: boolean;
  stats: AdminProfileStats;
}

export interface AdminRoomPlayer {
  userId: string;
  username: string;
  avatar: string;
  isHost: boolean;
  isBot: boolean;
  isConnected: boolean;
  score: number;
}

export interface AdminRoomProgress {
  currentRound: number;
  totalRounds: number;
  phase: 'intro' | 'ready' | 'guessing' | 'reveal' | null;
  anime: string | null;
  title: string | null;
  artist: string | null;
  typeLabel: string | null;
  videoKey: string | null;
  videoStartTime: number | null;
  cover: string | null;
  endsAt: number | null;
}

export interface AdminRoomSettings {
  mode: string;
  gameType: string;
  speedBonusEnabled: boolean;
  responseType: string;
  soundCount: number;
  soundTypes: string[];
  difficulty: string[];
  guessDuration: number;
  soundSelection: string;
}

export interface AdminRoom {
  id: string;
  name: string;
  hostId: string;
  status: string;
  isPrivate: boolean;
  password: string;
  maxPlayers: number;
  playerCount: number;
  humanCount: number;
  createdAt: string;
  settings: AdminRoomSettings;
  progress: AdminRoomProgress | null;
  players: AdminRoomPlayer[];
}

export interface BotConfig {
  accuracy: number;
  minDelayMs: number;
  maxDelayMs: number;
}

export type SongStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'SKIPPED';
export type SongDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface AdminSong {
  id: number;
  title: string;
  artist: string;
  songType: string;
  sequence: number;
  difficulty: SongDifficulty;
  downloadStatus: SongStatus;
  isLocked: boolean;
  errorLog: string | null;
  videoKey: string;
  updatedAt: string;
  anime: { id: number; name: string } | null;
}

export type SongType = 'OP' | 'ED' | 'INSERT';

export interface CatalogueSong {
  id: number;
  title: string;
  artist: string;
  songType: SongType;
  sequence: number;
  videoKey: string;
  sourceUrl: string | null;
  duration: number | null;
  difficulty: SongDifficulty;
  episodeRange: string | null;
  tags: string[];
  isLocked: boolean;
  downloadStatus: SongStatus;
  errorLog: string | null;
  animeId: number;
  updatedAt: string;
}

export interface CatalogueAnime {
  id: number;
  name: string;
  altNames: string[];
  siteUrl: string | null;
  studio: string | null;
  coverImage: string | null;
  popularity: number;
  tags: string[];
  format: string | null;
  status: string | null;
  seasonYear: number | null;
  franchiseId: number | null;
  isLocked: boolean;
  songs: CatalogueSong[];
}

export interface CatalogueFranchiseGroup {
  /** null = the virtual "Sans franchise" group. */
  id: number | null;
  name: string;
  genres: string[];
  isLocked: boolean;
  animes: CatalogueAnime[];
}

export interface CatalogueTree {
  groups: CatalogueFranchiseGroup[];
  pagination: { page: number; pageSize: number; totalGroups: number; totalPages: number };
  counts: { franchises: number; animes: number; songs: number; completedSongs: number };
}

export interface SongWrite {
  title?: string;
  artist?: string;
  songType?: SongType;
  sequence?: number;
  videoKey?: string;
  sourceUrl?: string | null;
  duration?: number | null;
  difficulty?: SongDifficulty;
  downloadStatus?: SongStatus;
  isLocked?: boolean;
  tags?: string[];
  episodeRange?: string | null;
  animeId?: number;
}

export interface AnimeWrite {
  name?: string;
  altNames?: string[];
  siteUrl?: string | null;
  studio?: string | null;
  coverImage?: string | null;
  popularity?: number;
  tags?: string[];
  format?: string | null;
  status?: string | null;
  seasonYear?: number | null;
  franchiseId?: number | null;
  isLocked?: boolean;
}

export interface FranchiseWrite {
  name?: string;
  genres?: string[];
  isLocked?: boolean;
}
