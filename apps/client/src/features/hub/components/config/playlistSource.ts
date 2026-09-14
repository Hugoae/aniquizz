import type { User } from '@supabase/supabase-js';
import type { PlaylistPoolStats, RoomConfig } from '@aniquizz/shared';
import {
  ANILIST_API_DOWN_MESSAGE,
  hasEnoughQcmNames,
  hasPlaylistSource,
  hasWatchedListLink,
  qcmPoolTooSmallReason,
} from '@aniquizz/shared';
import type { Profile } from '@/features/auth/context/AuthContext';
import { PLAYLISTS_COPY } from './playlistsCopy';

export interface PlaylistLaunchCheck {
  blocked: boolean;
  reason: string | null;
}

const NO_BLOCK: PlaylistLaunchCheck = { blocked: false, reason: null };

export function isPlaylistSourceBlocked(
  soundSelection: RoomConfig['soundSelection'],
  playlistId: string | null | undefined,
  decadePlaylistId?: string | null,
): boolean {
  return soundSelection === 'playlist' && !hasPlaylistSource({ playlistId, decadePlaylistId });
}

export function isPlaylistWatchedLinkBlocked(
  soundSelection: RoomConfig['soundSelection'],
  playlistWatched: boolean | undefined,
  user: User | null,
  profile: Profile | null,
): boolean {
  return (
    soundSelection === 'playlist' &&
    Boolean(playlistWatched) &&
    (!user || !hasWatchedListLink(profile ?? {}))
  );
}

export function checkPlaylistPoolLaunch(
  soundSelection: RoomConfig['soundSelection'],
  responseType: RoomConfig['responseType'],
  stats: PlaylistPoolStats | null,
  watchedAllowFallback?: boolean,
  precision?: RoomConfig['precision'],
): PlaylistLaunchCheck {
  if (soundSelection !== 'playlist') return NO_BLOCK;
  if (!stats) return NO_BLOCK;

  if (stats.filteredCount === 0) {
    return { blocked: true, reason: PLAYLISTS_COPY.filteredEmpty };
  }
  if (stats.packInsufficient) {
    return { blocked: true, reason: PLAYLISTS_COPY.packTooSmall };
  }
  if (stats.playlistWatched && stats.playableSongs === 0 && !watchedAllowFallback) {
    if (stats.listError === 'anilist_blocked') {
      return { blocked: true, reason: ANILIST_API_DOWN_MESSAGE };
    }
    return { blocked: true, reason: PLAYLISTS_COPY.overlayEmpty };
  }
  if (stats.playlistWatched && stats.insufficient && !watchedAllowFallback) {
    return {
      blocked: true,
      reason: PLAYLISTS_COPY.overlayInsufficient(stats.playableSongs, stats.soundCount),
    };
  }
  if (!hasEnoughQcmNames(stats.distinctNames, responseType)) {
    return { blocked: true, reason: qcmPoolTooSmallReason(precision) };
  }
  return NO_BLOCK;
}
