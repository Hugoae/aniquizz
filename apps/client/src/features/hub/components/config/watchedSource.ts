import type { User } from '@supabase/supabase-js';
import type { RoomConfig } from '@aniquizz/shared';
import type { Profile } from '@/features/auth/context/AuthContext';

/** Watched source is selectable in the UI but cannot launch until AniList is linked. */
export function isWatchedSourceBlocked(
  soundSelection: RoomConfig['soundSelection'],
  user: User | null,
  profile: Profile | null,
): boolean {
  return soundSelection === 'watched' && (!user || !profile?.anilistUsername?.trim());
}

export const WATCHED_SOURCE_BLOCK_MESSAGE =
  'Impossible : liez votre compte AniList ou choisissez une autre source.';

interface WatchedLobbyPlayer {
  id: string | number;
  isBot?: boolean;
  hasAniList?: boolean;
}

export interface WatchedLobbyCheck {
  /** True when the host cannot launch given the watched-mode requirements. */
  blocked: boolean;
  /** French reason to show under the launch button (null when not blocked). */
  reason: string | null;
  /** Non-bot player ids that should show an "AniList requis" badge. */
  badgeIds: Set<string | number>;
}

const NO_BLOCK: WatchedLobbyCheck = { blocked: false, reason: null, badgeIds: new Set() };

/**
 * Lobby-level validation for the Watched source, based on the actual players:
 * - union: at least one non-bot player must have AniList linked.
 * - intersection: every non-bot player must have AniList linked.
 */
export function checkWatchedLobby(
  soundSelection: RoomConfig['soundSelection'],
  watchedMode: RoomConfig['watchedMode'],
  players: WatchedLobbyPlayer[],
): WatchedLobbyCheck {
  if (soundSelection !== 'watched') return NO_BLOCK;

  const humans = players.filter((p) => !p.isBot);
  if (!humans.length) return NO_BLOCK;

  const unlinked = humans.filter((p) => !p.hasAniList);

  if (watchedMode === 'intersection') {
    if (!unlinked.length) return NO_BLOCK;
    return {
      blocked: true,
      reason: 'Mode « Commun » : tous les joueurs doivent lier leur compte AniList.',
      badgeIds: new Set(unlinked.map((p) => p.id)),
    };
  }

  // Union: needs at least one linked human.
  const hasLinked = humans.length > unlinked.length;
  if (hasLinked) return NO_BLOCK;
  return {
    blocked: true,
    reason: 'Au moins un joueur doit lier son compte AniList (ou changez de source).',
    badgeIds: new Set(unlinked.map((p) => p.id)),
  };
}
