import { supabase } from "./supabase";
import { env } from "./env";

/**
 * Thin client for the server-side admin REST API. Every call attaches the
 * Supabase access token as a Bearer header; the server enforces roles.
 */

const IS_PROD = import.meta.env.MODE === "production";
const API_BASE = IS_PROD
  ? env.VITE_SERVER_URL || "https://aniquizz-server.onrender.com"
  : "http://localhost:3001";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeaders()),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${API_BASE}/admin${path}`, { ...init, headers });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new AdminApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- TYPES ------------------------------------------------------------------

export type UserListFilter =
  | "all"
  | "players"
  | "moderators"
  | "admins"
  | "muted"
  | "banned"
  | "online"
  | "in_game";

export type UserListSort = "username" | "xp" | "games" | "created" | "seen";

export type Role = "USER" | "MODERATOR" | "ADMIN";
export type Presence = "online" | "in_game" | "offline";

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
  phase: "intro" | "ready" | "guessing" | "reveal" | null;
  anime: string | null;
  title: string | null;
  endsAt: number | null;
}

export interface AdminRoomSettings {
  mode: string;
  gameType: string;
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

export type SongStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "ERROR" | "SKIPPED";
export type SongDifficulty = "EASY" | "MEDIUM" | "HARD";

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

export type SongType = "OP" | "ED" | "INSERT";

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

export interface AdminStats {
  uptimeSeconds: number;
  activeRooms: number;
  activeMatches: number;
  connectedSockets: number;
  playersInRooms: number;
}

export type StatsPeriod = "24h" | "7d" | "30d" | "all";

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
    topAnimes: { name: string; count: number }[];
    topSongs: { title: string; artist: string; anime: string; count: number }[];
    topDifficulty: { difficulty: string; count: number } | null;
    modes: { mode: string; count: number }[];
    perDay: { date: string; count: number }[];
  };
}

// --- ENDPOINTS --------------------------------------------------------------

export const adminApi = {
  me: () => request<{ userId: string; username: string; role: Role }>("/me"),
  claimAdmin: () => request<{ role: Role }>("/dev/claim-admin", { method: "POST" }),

  // Users
  listUsers: (opts: {
    query?: string;
    page?: number;
    filter?: UserListFilter;
    sort?: UserListSort;
    sortDir?: "asc" | "desc";
  } = {}) => {
    const params = new URLSearchParams();
    if (opts.query) params.set("query", opts.query);
    if (opts.page) params.set("page", String(opts.page));
    if (opts.filter && opts.filter !== "all") params.set("filter", opts.filter);
    if (opts.sort && opts.sort !== "username") params.set("sort", opts.sort);
    if (opts.sortDir === "desc") params.set("sortDir", "desc");
    const qs = params.toString();
    return request<AdminUserListResponse>(`/users${qs ? `?${qs}` : ""}`);
  },
  setRole: (id: string, role: Role) =>
    request(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  ban: (id: string, minutes: number | null) =>
    request(`/users/${id}/ban`, { method: "POST", body: JSON.stringify({ minutes }) }),
  mute: (id: string, minutes: number | null) =>
    request(`/users/${id}/mute`, { method: "POST", body: JSON.stringify({ minutes }) }),
  resetStats: (id: string) => request(`/users/${id}/reset-stats`, { method: "POST" }),
  disconnectUser: (id: string) =>
    request<{ disconnected: number }>(`/users/${id}/disconnect`, { method: "POST" }),
  getUserProfile: (id: string) => request<AdminUserProfile>(`/users/${id}/profile`),

  // Live rooms
  listRooms: () => request<{ rooms: AdminRoom[] }>("/rooms"),
  endMatch: (id: string) => request(`/rooms/${id}/end`, { method: "POST" }),
  closeRoom: (id: string) => request(`/rooms/${id}/close`, { method: "POST" }),
  kick: (roomId: string, userId: string) =>
    request(`/rooms/${roomId}/kick`, { method: "POST", body: JSON.stringify({ userId }) }),

  // Catalogue
  listSongs: (opts: { query?: string; status?: SongStatus } = {}) => {
    const params = new URLSearchParams();
    if (opts.query) params.set("query", opts.query);
    if (opts.status) params.set("status", opts.status);
    const qs = params.toString();
    return request<{ songs: AdminSong[] }>(`/catalogue/songs${qs ? `?${qs}` : ""}`);
  },
  catalogueTree: (
    opts: {
      query?: string;
      status?: SongStatus;
      difficulty?: SongDifficulty;
      locked?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
  ) => {
    const params = new URLSearchParams();
    if (opts.query) params.set("query", opts.query);
    if (opts.status) params.set("status", opts.status);
    if (opts.difficulty) params.set("difficulty", opts.difficulty);
    if (opts.locked !== undefined) params.set("locked", String(opts.locked));
    if (opts.page) params.set("page", String(opts.page));
    if (opts.pageSize) params.set("pageSize", String(opts.pageSize));
    const qs = params.toString();
    return request<CatalogueTree>(`/catalogue/tree${qs ? `?${qs}` : ""}`);
  },
  updateSong: (id: number, data: SongWrite) =>
    request<CatalogueSong>(`/catalogue/songs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  createSong: (data: SongWrite & { title: string; artist: string; songType: SongType; videoKey: string; animeId: number }) =>
    request<CatalogueSong>(`/catalogue/songs`, { method: "POST", body: JSON.stringify(data) }),
  deleteSong: (id: number) => request(`/catalogue/songs/${id}`, { method: "DELETE" }),
  bulkUpdateSongs: (
    ids: number[],
    data: { difficulty?: SongDifficulty; downloadStatus?: SongStatus; isLocked?: boolean },
  ) =>
    request<{ count: number }>(`/catalogue/songs/bulk`, {
      method: "POST",
      body: JSON.stringify({ ids, data }),
    }),
  updateAnime: (id: number, data: AnimeWrite) =>
    request<CatalogueAnime>(`/catalogue/animes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  createAnime: (data: AnimeWrite & { name: string }) =>
    request<CatalogueAnime>(`/catalogue/animes`, { method: "POST", body: JSON.stringify(data) }),
  deleteAnime: (id: number) => request(`/catalogue/animes/${id}`, { method: "DELETE" }),
  updateFranchise: (id: number, data: FranchiseWrite) =>
    request(`/catalogue/franchises/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  createFranchise: (data: FranchiseWrite & { name: string }) =>
    request(`/catalogue/franchises`, { method: "POST", body: JSON.stringify(data) }),
  deleteFranchise: (id: number) => request(`/catalogue/franchises/${id}`, { method: "DELETE" }),

  // Stats
  stats: () => request<AdminStats>("/stats"),
  statsOverview: (period: StatsPeriod = "7d") =>
    request<StatsOverview>(`/stats/overview?period=${period}`),
  resetActivityStats: () =>
    request<{
      matches: number;
      rounds: number;
      answers: number;
      matchPlayers: number;
      songHistory: number;
    }>("/stats/reset-activity", { method: "POST" }),

  // Dev tooling
  addBots: (roomId: string, count: number, config?: BotConfig) =>
    request<{ added: number }>(`/dev/rooms/${roomId}/bots`, {
      method: "POST",
      body: JSON.stringify({ count, config }),
    }),
  removeBots: (roomId: string, count?: number) =>
    request<{ removed: number }>(`/dev/rooms/${roomId}/remove-bots`, {
      method: "POST",
      body: JSON.stringify(count ? { count } : {}),
    }),
  runScenario: (opts: {
    botCount: number;
    autoStart: boolean;
    join?: boolean;
    soundCount?: number;
    responseType?: "typing" | "qcm" | "mix";
    difficulty?: string[];
    soundTypes?: string[];
    guessDuration?: number;
    precision?: Precision;
    soundSelection?: "random" | "mix" | "watched" | "playlist";
    config?: BotConfig;
  }) =>
    request<{ roomId: string; botsAdded: number }>("/dev/scenario", {
      method: "POST",
      body: JSON.stringify(opts),
    }),
  devInfo: () =>
    request<{ devEnabled: boolean; botRosterSize: number; isBotId: boolean }>("/dev/info"),
};
