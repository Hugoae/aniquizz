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
  return { returnTo: '/admin', admin: s.admin as AdminPanelState };
};

export const getAdminPanelState = (state: unknown): AdminPanelState | null => {
  if (!state || typeof state !== 'object') return null;
  const s = state as AdminPanelState;
  if (!s.tab && !s.users && !s.highlightRoomId) return null;
  return s;
};

export const ADMIN_TAB_VALUES = [
  'users',
  'rooms',
  'catalogue',
  'playlists',
  'daily',
  'suggestions',
  'stats',
  'audit',
  'dev',
] as const;

export type AdminTab = (typeof ADMIN_TAB_VALUES)[number];

const isAdminTab = (value: string): value is AdminTab =>
  (ADMIN_TAB_VALUES as readonly string[]).includes(value);

/** Allowlisted `?tab=` — staff-only tabs collapse to users when the role cannot open them. */
export function parseAdminTab(
  raw: string | null,
  opts: { canManage: boolean; isDev: boolean },
): AdminTab {
  if (!raw || !isAdminTab(raw)) return 'users';
  if ((raw === 'playlists' || raw === 'daily') && !opts.canManage) return 'users';
  if (raw === 'dev' && !(opts.canManage && opts.isDev)) return 'users';
  return raw;
}
