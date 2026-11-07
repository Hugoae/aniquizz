import type { Precision, SuggestionAdminUpdateInput, SuggestionItem } from '@aniquizz/shared';
import { request } from './http';
import type {
  AdminRoom,
  AdminSong,
  AdminUserListResponse,
  AdminUserProfile,
  AnimeWrite,
  BotConfig,
  CatalogueAnime,
  CatalogueSong,
  CatalogueTree,
  FranchiseWrite,
  Role,
  UserListFilter,
  UserListSort,
  SongDifficulty,
  SongStatus,
  SongType,
  SongWrite,
} from './typesCore';
import type {
  AdminStats,
  AdminThematicPlaylist,
  CatalogueRepairSong,
  DailyAdminList,
  DailySongSearchHit,
  PlaylistRecipePreview,
  PlaylistUpsertInput,
  StaffAuditAction,
  StaffAuditList,
  StatsOverview,
  StatsPeriod,
} from './typesRest';

export const adminApi = {
  claimAdmin: () => request<{ role: Role }>('/dev/claim-admin', { method: 'POST' }),

  // Users
  listUsers: (
    opts: {
      query?: string;
      page?: number;
      filter?: UserListFilter;
      sort?: UserListSort;
      sortDir?: 'asc' | 'desc';
    } = {},
  ) => {
    const params = new URLSearchParams();
    if (opts.query) params.set('query', opts.query);
    if (opts.page) params.set('page', String(opts.page));
    if (opts.filter && opts.filter !== 'all') params.set('filter', opts.filter);
    if (opts.sort && opts.sort !== 'username') params.set('sort', opts.sort);
    if (opts.sortDir === 'desc') params.set('sortDir', 'desc');
    const qs = params.toString();
    return request<AdminUserListResponse>(`/users${qs ? `?${qs}` : ''}`);
  },
  setRole: (id: string, role: Role) =>
    request(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  ban: (id: string, minutes: number | null) =>
    request(`/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ minutes }) }),
  mute: (id: string, minutes: number | null) =>
    request(`/users/${id}/mute`, { method: 'POST', body: JSON.stringify({ minutes }) }),
  resetStats: (id: string) => request(`/users/${id}/reset-stats`, { method: 'POST' }),
  resetDaily: (id: string) =>
    request<{ reset: boolean; xpReverted: number }>(`/users/${id}/reset-daily`, { method: 'POST' }),
  disconnectUser: (id: string) =>
    request<{ disconnected: number }>(`/users/${id}/disconnect`, { method: 'POST' }),
  getUserProfile: (id: string) => request<AdminUserProfile>(`/users/${id}/profile`),
  listAudit: (opts: { page?: number; action?: StaffAuditAction } = {}) => {
    const params = new URLSearchParams();
    if (opts.page) params.set('page', String(opts.page));
    if (opts.action) params.set('action', opts.action);
    const qs = params.toString();
    return request<StaffAuditList>(`/audit${qs ? `?${qs}` : ''}`);
  },

  // Live rooms
  listRooms: () => request<{ rooms: AdminRoom[] }>('/rooms'),
  getRoom: (id: string) => request<{ room: AdminRoom }>(`/rooms/${id}`),
  endMatch: (id: string) => request(`/rooms/${id}/end`, { method: 'POST' }),
  closeRoom: (id: string) => request(`/rooms/${id}/close`, { method: 'POST' }),
  kick: (roomId: string, userId: string) =>
    request(`/rooms/${roomId}/kick`, { method: 'POST', body: JSON.stringify({ userId }) }),

  // Catalogue
  listSongs: (opts: { query?: string; status?: SongStatus } = {}) => {
    const params = new URLSearchParams();
    if (opts.query) params.set('query', opts.query);
    if (opts.status) params.set('status', opts.status);
    const qs = params.toString();
    return request<{ songs: AdminSong[] }>(`/catalogue/songs${qs ? `?${qs}` : ''}`);
  },
  catalogueTree: (
    opts: {
      query?: string;
      status?: SongStatus;
      difficulty?: SongDifficulty;
      locked?: boolean;
      page?: number;
      pageSize?: number;
      songId?: number;
      signal?: AbortSignal;
    } = {},
  ) => {
    const params = new URLSearchParams();
    if (opts.query) params.set('query', opts.query);
    if (opts.status) params.set('status', opts.status);
    if (opts.difficulty) params.set('difficulty', opts.difficulty);
    if (opts.locked !== undefined) params.set('locked', String(opts.locked));
    if (opts.page) params.set('page', String(opts.page));
    if (opts.pageSize) params.set('pageSize', String(opts.pageSize));
    if (opts.songId) params.set('songId', String(opts.songId));
    const qs = params.toString();
    return request<CatalogueTree>(`/catalogue/tree${qs ? `?${qs}` : ''}`, {
      signal: opts.signal,
    });
  },
  catalogueRepair: () =>
    request<{ songs: CatalogueRepairSong[]; truncated: boolean }>('/catalogue/repair'),
  updateSong: (id: number, data: SongWrite) =>
    request<CatalogueSong>(`/catalogue/songs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  createSong: (
    data: SongWrite & {
      title: string;
      artist: string;
      songType: SongType;
      videoKey: string;
      animeId: number;
    },
  ) => request<CatalogueSong>(`/catalogue/songs`, { method: 'POST', body: JSON.stringify(data) }),
  deleteSong: (id: number) => request(`/catalogue/songs/${id}`, { method: 'DELETE' }),
  bulkUpdateSongs: (
    ids: number[],
    data: { difficulty?: SongDifficulty; downloadStatus?: SongStatus; isLocked?: boolean },
  ) =>
    request<{ count: number }>(`/catalogue/songs/bulk`, {
      method: 'POST',
      body: JSON.stringify({ ids, data }),
    }),
  updateAnime: (id: number, data: AnimeWrite) =>
    request<CatalogueAnime>(`/catalogue/animes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  createAnime: (data: AnimeWrite & { name: string }) =>
    request<CatalogueAnime>(`/catalogue/animes`, { method: 'POST', body: JSON.stringify(data) }),
  deleteAnime: (id: number) => request(`/catalogue/animes/${id}`, { method: 'DELETE' }),
  updateFranchise: (id: number, data: FranchiseWrite) =>
    request(`/catalogue/franchises/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createFranchise: (data: FranchiseWrite & { name: string }) =>
    request(`/catalogue/franchises`, { method: 'POST', body: JSON.stringify(data) }),
  deleteFranchise: (id: number) => request(`/catalogue/franchises/${id}`, { method: 'DELETE' }),

  listPlaylists: () => request<{ playlists: AdminThematicPlaylist[] }>('/playlists'),
  previewPlaylistRecipe: (recipe: unknown) =>
    request<PlaylistRecipePreview>('/playlists/preview', {
      method: 'POST',
      body: JSON.stringify({ recipe }),
    }),
  seedPlaylists: (publish = true) =>
    request<{ seeded: Array<{ slug: string; id: string; snapshotCount: number }> }>(
      '/playlists/seed',
      {
        method: 'POST',
        body: JSON.stringify({ publish }),
      },
    ),
  createPlaylist: (data: PlaylistUpsertInput) =>
    request<AdminThematicPlaylist>('/playlists', { method: 'POST', body: JSON.stringify(data) }),
  updatePlaylist: (id: string, data: PlaylistUpsertInput) =>
    request<AdminThematicPlaylist>(`/playlists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  publishPlaylist: (id: string) =>
    request<{ snapshotCount: number; isPublished: boolean }>(`/playlists/${id}/publish`, {
      method: 'POST',
    }),
  refreshPlaylist: (id: string) =>
    request<{ snapshotCount: number }>(`/playlists/${id}/refresh`, { method: 'POST' }),
  deletePlaylist: (id: string) => request<void>(`/playlists/${id}`, { method: 'DELETE' }),

  listDaily: () => request<DailyAdminList>('/daily'),
  searchDailySongs: (opts: { query?: string; exclude?: number[]; signal?: AbortSignal } = {}) => {
    const params = new URLSearchParams();
    if (opts.query) params.set('query', opts.query);
    if (opts.exclude?.length) params.set('exclude', opts.exclude.join(','));
    const qs = params.toString();
    return request<{ songs: DailySongSearchHit[] }>(`/daily/songs${qs ? `?${qs}` : ''}`, {
      signal: opts.signal,
    });
  },
  setDailyStatus: (id: string, status: 'ready' | 'draft') =>
    request<DailyAdminList>(`/daily/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  regenerateDaily: (date: string) =>
    request<DailyAdminList>('/daily/regenerate', {
      method: 'POST',
      body: JSON.stringify({ date }),
    }),
  replaceDailyRound: (id: string, roundId: string, songId: number) =>
    request<DailyAdminList>(`/daily/${id}/rounds/${roundId}/replace`, {
      method: 'POST',
      body: JSON.stringify({ songId }),
    }),
  regenerateDailyRound: (id: string, roundId: string) =>
    request<DailyAdminList>(`/daily/${id}/rounds/${roundId}/regenerate`, { method: 'POST' }),
  reshuffleDailyRoundClip: (id: string, roundId: string) =>
    request<DailyAdminList>(`/daily/${id}/rounds/${roundId}/clip`, { method: 'POST' }),
  voidDailyRound: (id: string, roundId: string) =>
    request<DailyAdminList>(`/daily/${id}/rounds/${roundId}/void`, { method: 'POST' }),
  restoreDailyRound: (id: string, roundId: string) =>
    request<DailyAdminList>(`/daily/${id}/rounds/${roundId}/restore`, { method: 'POST' }),
  reorderDailyRounds: (id: string, orderedIds: string[]) =>
    request<DailyAdminList>(`/daily/${id}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    }),

  // Stats
  stats: () => request<AdminStats>('/stats'),
  statsOverview: (period: StatsPeriod = '7d') =>
    request<StatsOverview>(`/stats/overview?period=${period}`),
  resetActivityStats: () =>
    request<{
      matches: number;
      rounds: number;
      answers: number;
      matchPlayers: number;
      songHistory: number;
    }>('/stats/reset-activity', { method: 'POST' }),

  // Suggestions
  updateSuggestion: (id: string, data: SuggestionAdminUpdateInput) =>
    request<SuggestionItem>(`/suggestions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteSuggestion: (id: string) => request<void>(`/suggestions/${id}`, { method: 'DELETE' }),

  // Dev tooling
  addBots: (roomId: string, count: number, config?: BotConfig) =>
    request<{ added: number }>(`/dev/rooms/${roomId}/bots`, {
      method: 'POST',
      body: JSON.stringify({ count, config }),
    }),
  removeBots: (roomId: string, count?: number) =>
    request<{ removed: number }>(`/dev/rooms/${roomId}/remove-bots`, {
      method: 'POST',
      body: JSON.stringify(count ? { count } : {}),
    }),
  runScenario: (opts: {
    botCount: number;
    autoStart: boolean;
    join?: boolean;
    soundCount?: number;
    responseType?: 'typing' | 'qcm' | 'mix';
    difficulty?: string[];
    soundTypes?: string[];
    guessDuration?: number;
    precision?: Precision;
    soundSelection?: 'random' | 'mix' | 'watched' | 'playlist';
    config?: BotConfig;
  }) =>
    request<{ roomId: string; botsAdded: number }>('/dev/scenario', {
      method: 'POST',
      body: JSON.stringify(opts),
    }),
  devInfo: () =>
    request<{ devEnabled: boolean; botRosterSize: number; isBotId: boolean }>('/dev/info'),
};
