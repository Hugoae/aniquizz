import type { Role, SongDifficulty, SongStatus } from './typesCore';

export interface AdminStats {
  uptimeSeconds: number;
  activeRooms: number;
  activeMatches: number;
  connectedSockets: number;
  playersInRooms: number;
}

export type StatsPeriod = '24h' | '7d' | '30d' | 'all';

export interface StatsOverview {
  live: {
    uptimeSeconds: number;
    connectedSockets: number;
    uniqueOnline: number;
    activeRooms: number;
    activeMatches: number;
    playersInRooms: number;
    humansInRooms: number;
    botsInRooms: number;
    roomsPublic: number;
    roomsPrivate: number;
    roomsWaiting: number;
    roomsPlaying: number;
    roomsPaused: number;
    memoryRssMb: number;
    nodeVersion: string;
  };
  community: {
    totalPlayers: number;
    newPlayers24h: number;
    newPlayers7d: number;
    activePlayers24h: number;
    activePlayers7d: number;
    banned: number;
    muted: number;
    roles: { USER: number; MODERATOR: number; ADMIN: number };
    anilistLinked: number;
    anilistLinkedPercent: number;
    malLinked: number;
    malLinkedPercent: number;
    watchedListLinked: number;
    watchedListLinkedPercent: number;
  };
  activity: {
    periodDays: number;
    totalMatches: number;
    matchesToday: number;
    matchesWeek: number;
    matchesPeriod: number;
    avgMatchDurationSec: number;
    correctRatePercent: number;
    catalogue: {
      total: number;
      completed: number;
      pending: number;
      processing: number;
      error: number;
      skipped: number;
    };
    discoveredSongs: number;
    playableSongs: number;
    coveragePercent: number;
    topAnimes: {
      name: string;
      count: number;
      cover: string | null;
      year: number | null;
      format: string | null;
      studio: string | null;
    }[];
    topSongs: {
      title: string;
      artist: string;
      anime: string;
      franchise: string | null;
      count: number;
      cover: string | null;
      songType: string;
      sequence: number;
      difficulty: string;
    }[];
    topDifficulty: { difficulty: string; count: number } | null;
    modes: { mode: string; count: number }[];
    perDay: { date: string; count: number }[];
  };
}

export interface AdminThematicPlaylist {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  recipe: unknown;
  isPublished: boolean;
  snapshotAt: string | null;
  snapshotCount: number;
  sortOrder: number;
}

export interface PlaylistRecipePreview {
  songCount: number;
  yearBreakdown: Array<{ year: number; count: number }>;
  typeBreakdown: { OP: number; ED: number };
}

export interface PlaylistUpsertInput {
  slug: string;
  name: string;
  description: string;
  category: string;
  sortOrder: number;
  recipe: unknown;
}

export interface DailyAdminRound {
  id: string;
  position: number;
  voided: boolean;
  songId: number | null;
  videoKey: string;
  videoStartTime: number;
  choices: string[];
  anime: string;
  title: string;
  artist: string;
  typeLabel: string;
  difficulty: string;
  cover: string | null;
  franchise: string | null;
  year: number | null;
}

export interface DailyAdminChallenge {
  id: string;
  challengeDate: string;
  challengeNumber: number;
  status: string;
  attemptCount: number;
  locked: boolean;
  canVoid: boolean;
  warnings: Array<{ code: string; message: string }>;
  rounds: DailyAdminRound[];
}

export interface DailySongSearchHit {
  id: number;
  title: string;
  artist: string;
  songType: 'OP' | 'ED';
  sequence: number;
  typeLabel: string;
  difficulty: SongDifficulty;
  anime: string;
  cover: string | null;
  videoKey: string;
}

export interface DailyAdminList {
  today: string;
  challenges: DailyAdminChallenge[];
}

export type StaffAuditAction = 'MUTE' | 'UNMUTE' | 'BAN' | 'UNBAN' | 'ROLE_CHANGE' | 'DISCONNECT';

export interface StaffAuditEntry {
  id: string;
  actorId: string | null;
  actorUsername: string;
  targetId: string | null;
  targetUsername: string;
  action: StaffAuditAction;
  durationMinutes: number | null;
  fromRole: Role | null;
  toRole: Role | null;
  createdAt: string;
}

export interface StaffAuditList {
  entries: StaffAuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type CatalogueRepairReason = 'error' | 'missing_video' | 'forgotten_lock';

export interface CatalogueRepairSong {
  id: number;
  title: string;
  artist: string;
  songType: string;
  sequence: number;
  downloadStatus: SongStatus;
  isLocked: boolean;
  errorLog: string | null;
  videoKey: string;
  updatedAt: string;
  reasons: CatalogueRepairReason[];
  anime: { id: number; name: string; isLocked: boolean };
  franchise: { id: number; name: string; isLocked: boolean } | null;
}
