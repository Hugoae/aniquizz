// packages/shared/src/events.ts
// Typed Socket.io contract shared by client and server.
// Server:  Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
// Client:  Socket<ServerToClientEvents, ClientToServerEvents>

import type { GamePlayer } from './types';
import type { UserRole } from './roles';
import type {
  AnswerType,
  ChatMessage,
  ErrorPayload,
  FriendPresencePayload,
  FriendsState,
  FriendSummary,
  GameStartedPayload,
  GameSyncState,
  LevelUpPayload,
  LobbyInvitePayload,
  LobbyJoinedPayload,
  AnsweredPayload,
  PlayersUpdatePayload,
  PreloadVideoPayload,
  PublicProfile,
  RecentPlayer,
  RoomListItem,
  RoomSettings,
  RoomUpdatedPayload,
  RoundRevealPayload,
  RoundStartPayload,
  GameReadyPayload,
  GameOverPayload,
  RoundHistoryEntry,
  VictoryData,
  VoteUpdatePayload,
} from './game';

// --- CANONICAL IDENTITY (attached to every socket, server-side) ---
export interface SocketData {
  /** Supabase auth user id — the ONLY trusted identity. Null for guests. */
  userId: string | null;
  username: string;
  isAuthenticated: boolean;
  /** DB-resolved role (server-authoritative). Null for guests. */
  role: UserRole | null;
  /** ISO timestamp until which the user is muted, if any (server-resolved). */
  mutedUntil: string | null;
  /** Player level derived from lifetime XP (server-resolved). Null for guests. */
  level: number | null;
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
  /**
   * Marks a join triggered from a friend invite / "Rejoindre" shortcut.
   * Purely informational — private rooms still require the password.
   */
  fromInvite?: boolean;
}

export interface RoomIdInput {
  roomId: string;
}

export interface AnswerInput {
  roomId: string;
  answer: string;
  answerType: AnswerType;
}

// --- FRIENDS (Phase 7) ---
export interface FriendRequestInput {
  /** Exact username of the user to befriend (contextless add). */
  username?: string;
  /** OR the target profile id (contextual add from game-over/lobby). */
  userId?: string;
}

export interface FriendRequestActionInput {
  /** Friendship row id to accept / reject. */
  requestId: string;
}

export interface FriendRemoveInput {
  /** Profile id (userId) of the friend to remove. */
  userId: string;
}

export interface FriendUserIdInput {
  /** Profile id (userId) target of a block/unblock/invite/profile action. */
  userId: string;
}

export interface FriendInviteInput {
  /** Friend to invite to the current lobby. */
  userId: string;
}

export interface FriendPrivacyInput {
  /** When false, refuse all incoming friend requests. */
  allow: boolean;
}

// --- SERVER → CLIENT ---
export interface ServerToClientEvents {
  // Lobby
  'lobby:joined': (payload: LobbyJoinedPayload) => void;
  rooms_update: (rooms: RoomListItem[]) => void;
  room_updated: (payload: RoomUpdatedPayload) => void;
  room_closed: (payload?: { reason?: string }) => void;
  password_required: (payload: { roomId: string }) => void;
  host_promoted: () => void;
  /** Admin forced the account to sign out (kick without ban). */
  force_logout: (payload?: { reason?: string }) => void;
  /** This connection is being replaced by a newer one for the same user. */
  session_replaced: () => void;
  update_players: (payload: PlayersUpdatePayload) => void;

  // Match lifecycle
  game_started: (payload: GameStartedPayload) => void;
  /** Round-1 only: intro done, UI up, 0.5s before audio + timer. */
  'game:ready': (payload: GameReadyPayload) => void;
  round_start: (payload: RoundStartPayload) => void;
  'game:answered': (payload: AnsweredPayload) => void;
  round_reveal: (payload: RoundRevealPayload) => void;
  /** Warm a clip's buffer ahead of playback (round 1 in intro, next during reveal). */
  'game:preload': (payload: PreloadVideoPayload) => void;
  game_over: (payload: GameOverPayload) => void;
  /** Sent to a player's own socket when a finished match levels them up. */
  level_up: (payload: LevelUpPayload) => void;
  game_state_sync: (state: GameSyncState) => void;
  vote_update: (payload: VoteUpdatePayload) => void;
  game_paused: (payload: { isPaused: boolean }) => void;
  game_resuming: (payload: { duration: number }) => void;
  game_cancelled: (payload?: { reason?: string }) => void;
  'game:fallback_notification': (payload: { message: string }) => void;

  // Data
  anime_list: (list: AnimeListEntry[]) => void;
  my_watched_list: (ids: number[]) => void;

  // Chat / profile / general
  'chat:message': (message: ChatMessage) => void;
  'profile:stats': (stats: unknown) => void;
  'profile:error': (payload: ErrorPayload) => void;
  user_profile: (payload: { success: boolean }) => void;
  home_stats: (stats: { animes: number; users: number; songs: number; online: number; inMultiplayer: number }) => void;

  // Friends (Phase 7)
  'friends:state': (state: FriendsState) => void;
  /** A new incoming request arrived (for a toast, on top of the state refresh). */
  'friends:request_received': (payload: { from: FriendSummary }) => void;
  'friends:presence': (payload: FriendPresencePayload) => void;
  /** Recent non-bot players the user played with, offered for a 1-click add. */
  'friends:recent': (payload: { players: RecentPlayer[] }) => void;
  /** A friend invited the user to their lobby. */
  'friends:invite_received': (payload: LobbyInvitePayload) => void;
  /** Lightweight success ack (e.g. "invitation envoyée"). */
  'friends:info': (payload: { message: string }) => void;
  'friends:error': (payload: ErrorPayload) => void;

  // Public profile (Phase 7)
  'profile:public': (payload: PublicProfile) => void;

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
  /** Host removes another player from the lobby. */
  'lobby:kick': (payload: { roomId: string; targetId: string }) => void;
  /** DEV-only: host adds simulated players to the lobby to test multiplayer. */
  'dev:add_bots': (payload: { roomId: string; count: number }) => void;
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
  update_profile_data: (payload: { username?: string; avatarUrl?: string; anilistUsername?: string | null }) => void;
  get_home_stats: () => void;

  // Friends (Phase 7)
  'friends:list': () => void;
  'friends:request': (payload: FriendRequestInput) => void;
  'friends:accept': (payload: FriendRequestActionInput) => void;
  'friends:reject': (payload: FriendRequestActionInput) => void;
  'friends:remove': (payload: FriendRemoveInput) => void;
  'friends:block': (payload: FriendUserIdInput) => void;
  'friends:unblock': (payload: FriendUserIdInput) => void;
  'friends:invite': (payload: FriendInviteInput) => void;
  'friends:recent': () => void;
  'friends:set_privacy': (payload: FriendPrivacyInput) => void;

  // Public profile (Phase 7)
  'profile:get_public': (payload: FriendUserIdInput) => void;
}

/** Anime autocomplete entry served to the client for typing suggestions. */
export interface AnimeListEntry {
  name: string;
  franchise: string | null;
  altNames: string[];
}

export type { GamePlayer };
