import type { UserListFilter, UserListSort } from '@/lib/adminApi';

/** Users list snapshot restored when returning from a visited profile. */
export interface AdminUsersListState {
  page: number;
  filter: UserListFilter;
  sortKey: UserListSort;
  sortDir: 'asc' | 'desc';
  query: string;
}

/** Navigation state for /admin when restoring the panel the moderator left. */
export interface AdminPanelState {
  tab?: string;
  highlightRoomId?: string | null;
  users?: AdminUsersListState;
}

/** Location state on /profile/:userId when opened from the admin panel. */
export interface ProfileFromAdminState {
  returnTo: '/admin';
  admin: AdminPanelState;
}

export const getProfileFromAdminState = (state: unknown): ProfileFromAdminState | null => {
  if (!state || typeof state !== 'object') return null;
  const s = state as Record<string, unknown>;
  if (s.returnTo !== '/admin' || !s.admin || typeof s.admin !== 'object') return null;
  return s as ProfileFromAdminState;
};

export const getAdminPanelState = (state: unknown): AdminPanelState | null => {
  if (!state || typeof state !== 'object') return null;
  const s = state as AdminPanelState;
  if (!s.tab && !s.users && !s.highlightRoomId) return null;
  return s;
};
