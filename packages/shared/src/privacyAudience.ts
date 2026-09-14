/** Who may see a privacy-gated field on another player's account. */
export type PrivacyAudience = 'everyone' | 'friends' | 'nobody';

/** Lobby invites are never public — friends only, or nobody. */
export type LobbyInviteAudience = 'friends' | 'nobody';

export type PrivacyViewerKind = 'self' | 'friend' | 'stranger' | 'blocked';

export const DEFAULT_ONLINE_STATUS_AUDIENCE: PrivacyAudience = 'everyone';
export const DEFAULT_MATCH_HISTORY_AUDIENCE: PrivacyAudience = 'everyone';
export const DEFAULT_LOBBY_INVITE_AUDIENCE: LobbyInviteAudience = 'friends';

export function isPrivacyAudience(value: unknown): value is PrivacyAudience {
  return value === 'everyone' || value === 'friends' || value === 'nobody';
}

export function isLobbyInviteAudience(value: unknown): value is LobbyInviteAudience {
  return value === 'friends' || value === 'nobody';
}

export function normalizePrivacyAudience(
  value: unknown,
  fallback: PrivacyAudience,
): PrivacyAudience {
  return isPrivacyAudience(value) ? value : fallback;
}

export function normalizeLobbyInviteAudience(value: unknown): LobbyInviteAudience {
  return isLobbyInviteAudience(value) ? value : DEFAULT_LOBBY_INVITE_AUDIENCE;
}

/**
 * Self always sees their own data. A block in either direction sees nothing.
 * Everyone → friend or stranger; Friends → friend only; Nobody → nobody else.
 */
export function canViewAudience(audience: PrivacyAudience, viewer: PrivacyViewerKind): boolean {
  if (viewer === 'self') return true;
  if (viewer === 'blocked') return false;
  if (audience === 'everyone') return viewer === 'friend' || viewer === 'stranger';
  if (audience === 'friends') return viewer === 'friend';
  return false;
}

/** Host may invite the target only when they are accepted friends and the target allows it. */
export function canSendLobbyInvite(
  audience: LobbyInviteAudience,
  relation: PrivacyViewerKind,
): boolean {
  if (relation !== 'friend') return false;
  return audience === 'friends';
}

export interface AccountPrivacy {
  onlineStatusAudience: PrivacyAudience;
  matchHistoryAudience: PrivacyAudience;
  lobbyInviteAudience: LobbyInviteAudience;
  showFavoriteSongs: boolean;
  allowFriendRequests: boolean;
}

export type AccountPrivacyInput = Partial<AccountPrivacy>;

export const ACCOUNT_PRIVACY_DEFAULTS: AccountPrivacy = {
  onlineStatusAudience: DEFAULT_ONLINE_STATUS_AUDIENCE,
  matchHistoryAudience: DEFAULT_MATCH_HISTORY_AUDIENCE,
  lobbyInviteAudience: DEFAULT_LOBBY_INVITE_AUDIENCE,
  showFavoriteSongs: true,
  allowFriendRequests: true,
};

export function normalizeAccountPrivacy(input: unknown): AccountPrivacy {
  if (!input || typeof input !== 'object') return { ...ACCOUNT_PRIVACY_DEFAULTS };
  const rec = input as Record<string, unknown>;
  return {
    onlineStatusAudience: normalizePrivacyAudience(
      rec.onlineStatusAudience,
      ACCOUNT_PRIVACY_DEFAULTS.onlineStatusAudience,
    ),
    matchHistoryAudience: normalizePrivacyAudience(
      rec.matchHistoryAudience,
      ACCOUNT_PRIVACY_DEFAULTS.matchHistoryAudience,
    ),
    lobbyInviteAudience: normalizeLobbyInviteAudience(rec.lobbyInviteAudience),
    showFavoriteSongs: rec.showFavoriteSongs !== false,
    allowFriendRequests: rec.allowFriendRequests !== false,
  };
}
