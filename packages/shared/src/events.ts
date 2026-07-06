// packages/shared/src/events.ts
// Typed Socket.io contract shared by client and server.
// Server:  Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
// Client:  Socket<ServerToClientEvents, ClientToServerEvents>

import type { GamePlayer } from './types';
import type {
  AnswerType,
  ChatMessage,
  ErrorPayload,
  GameStartedPayload,
  GameSyncState,
  LobbyJoinedPayload,
  AnsweredPayload,
  PlayersUpdatePayload,
  RoomListItem,
  RoomSettings,
  RoomUpdatedPayload,
  RoundRevealPayload,
  RoundStartPayload,
  VictoryData,
  VoteUpdatePayload,
} from './game';

// --- CANONICAL IDENTITY (attached to every socket, server-side) ---
export interface SocketData {
  /** Supabase auth user id — the ONLY trusted identity. Null for guests. */
  userId: string | null;
  username: string;
  isAuthenticated: boolean;
}

// --- CLIENT → SERVER INPUT PAYLOADS ---
export interface CreateLobbyInput {
  roomName?: string;
  username: string;
  avatar: string;
  settings: Partial<RoomSettings>;
}

export interface JoinLobbyInput {
  roomId: string;
  username: string;
  avatar: string;
  password?: string;
}

export interface RoomIdInput {
  roomId: string;
}

export interface AnswerInput {
  roomId: string;
  answer: string;
  answerType: AnswerType;
}

// --- SERVER → CLIENT ---
export interface ServerToClientEvents {
  // Lobby
  'lobby:joined': (payload: LobbyJoinedPayload) => void;
  rooms_update: (rooms: RoomListItem[]) => void;
  room_updated: (payload: RoomUpdatedPayload) => void;
  room_closed: () => void;
  password_required: (payload: { roomId: string }) => void;
  host_promoted: () => void;
  update_players: (payload: PlayersUpdatePayload) => void;

  // Match lifecycle
  game_started: (payload: GameStartedPayload) => void;
  round_start: (payload: RoundStartPayload) => void;
  'game:answered': (payload: AnsweredPayload) => void;
  round_reveal: (payload: RoundRevealPayload) => void;
  game_over: (payload: { victoryData: VictoryData }) => void;
  game_state_sync: (state: GameSyncState) => void;
  vote_update: (payload: VoteUpdatePayload) => void;
  game_paused: (payload: { isPaused: boolean }) => void;
  game_resuming: (payload: { duration: number }) => void;
  game_cancelled: () => void;
  'game:fallback_notification': (payload: { message: string }) => void;

  // Data
  anime_list: (list: AnimeListEntry[]) => void;
  my_watched_list: (ids: number[]) => void;

  // Chat / profile / general
  'chat:message': (message: ChatMessage) => void;
  'profile:stats': (stats: unknown) => void;
  'profile:error': (payload: ErrorPayload) => void;
  user_profile: (payload: { success: boolean }) => void;
  home_stats: (stats: { animes: number; users: number; songs: number }) => void;

  // Misc
  error: (payload: ErrorPayload) => void;
}

// --- CLIENT → SERVER ---
export interface ClientToServerEvents {
  // Lobby
  'lobby:create': (payload: CreateLobbyInput) => void;
  'lobby:join': (payload: JoinLobbyInput) => void;
  get_rooms: () => void;
  transfer_host: (payload: { roomId: string; targetId: string }) => void;
  leave_room: (payload: RoomIdInput) => void;
  toggle_ready: (payload: RoomIdInput) => void;
  update_room_settings: (payload: { roomId: string; settings: Partial<RoomSettings> }) => void;

  // Match
  start_game: (payload: RoomIdInput) => void;
  'game:answer': (payload: AnswerInput) => void;
  vote_pause: (payload: RoomIdInput) => void;
  vote_skip: (payload: RoomIdInput) => void;
  'game:skip_round': (payload: RoomIdInput) => void;
  'game:return_to_lobby': (payload: RoomIdInput) => void;
  'game:cancel': (payload: RoomIdInput) => void;
  get_game_state: (payload: RoomIdInput) => void;
  player_watched_ids: (payload: { roomId: string; ids: number[] }) => void;
  get_my_watched: (payload: { username: string }) => void;
  get_anime_list: () => void;

  // Chat / profile / general
  'chat:sendMessage': (payload: { roomId: string; content: string }) => void;
  'profile:get_stats': () => void;
  update_profile_data: (payload: { username?: string; avatarUrl?: string }) => void;
  get_home_stats: () => void;
}

/** Anime autocomplete entry served to the client for typing suggestions. */
export interface AnimeListEntry {
  name: string;
  franchise: string | null;
  altNames: string[];
}

export type { GamePlayer };
