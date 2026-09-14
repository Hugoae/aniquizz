import type { User } from '@supabase/supabase-js';
import type { RoomConfig } from '@aniquizz/shared';
import {
  ANILIST_API_DOWN_MESSAGE,
  hasEnoughQcmNames,
  hasWatchedListLink,
  qcmPoolTooSmallReason,
} from '@aniquizz/shared';
import type { Profile } from '@/features/auth/context/AuthContext';

/** Watched source is selectable in the UI but cannot launch until a list provider is linked. */
export function isWatchedSourceBlocked(
  soundSelection: RoomConfig['soundSelection'],
  user: User | null,
  profile: Profile | null,
  playlistWatched?: boolean,
): boolean {
  const usesWatched =
    soundSelection === 'watched' || (soundSelection === 'playlist' && Boolean(playlistWatched));
  return usesWatched && (!user || !hasWatchedListLink(profile ?? {}));
}

export const WATCHED_SOURCE_BLOCK_MESSAGE =
  'Impossible : liez AniList ou MyAnimeList, ou choisissez une autre source.';

export const WATCHED_LIST_UNAVAILABLE =
  'Votre liste est vide ou inaccessible (privée sur AniList ?). Passez-la en public, ou changez de source.';

export const WATCHED_ANILIST_BLOCKED_MESSAGE = ANILIST_API_DOWN_MESSAGE;

export const WATCHED_ANILIST_STALE_MESSAGE =
  'AniList est instable : la liste affichée peut dater de quelques minutes.';

export const WATCHED_QCM_TOO_SMALL_MESSAGE = qcmPoolTooSmallReason('franchise');

export const WATCHED_SERVER_OFFLINE =
  "Le serveur de jeu n'est pas joignable (port 3001). Lance-le avec pnpm run dev, puis réessaie.";

export interface WatchedPoolLaunchCheck {
  blocked: boolean;
  reason: string | null;
}

/**
 * Launch gate when Watched pool is too small: block unless the host opted in
 * to random completion (never silent global fallback).
 */
export function checkWatchedPoolLaunch(
  soundSelection: RoomConfig['soundSelection'],
  stats:
    | {
        playableSongs: number;
        soundCount: number;
        insufficient: boolean;
        watchedMode?: 'union' | 'intersection';
        animeCount?: number;
        distinctNames?: number;
        listError?: 'anilist_blocked';
      }
    | null
    | undefined,
  watchedAllowFallback?: boolean,
  responseType: RoomConfig['responseType'] = 'mix',
  precision?: RoomConfig['precision'],
): WatchedPoolLaunchCheck {
  if (soundSelection !== 'watched' || !stats) {
    return { blocked: false, reason: null };
  }

  if (stats.playableSongs === 0) {
    if (stats.listError === 'anilist_blocked') {
      return { blocked: true, reason: WATCHED_ANILIST_BLOCKED_MESSAGE };
    }
    if (stats.animeCount === 0) {
      return { blocked: true, reason: WATCHED_LIST_UNAVAILABLE };
    }
    const modeHint = stats.watchedMode === 'intersection' ? ' en mode Commun' : '';
    return {
      blocked: true,
      reason: `Aucun son jouable${modeHint} pour ces filtres. Changez la source ou les filtres.`,
    };
  }

  if (stats.insufficient && !watchedAllowFallback) {
    const modeHint = stats.watchedMode === 'intersection' ? ' (Commun)' : '';
    return {
      blocked: true,
      reason:
        `Seulement ${stats.playableSongs} son${stats.playableSongs > 1 ? 's' : ''} jouable${stats.playableSongs > 1 ? 's' : ''}${modeHint} pour ${stats.soundCount} demandé${stats.soundCount > 1 ? 's' : ''}. ` +
        "Activez « Compléter avec l'aléatoire » ou réduisez le nombre de sons.",
    };
  }

  if (
    typeof stats.distinctNames === 'number' &&
    !hasEnoughQcmNames(stats.distinctNames, responseType ?? 'mix')
  ) {
    return { blocked: true, reason: qcmPoolTooSmallReason(precision) };
  }

  return { blocked: false, reason: null };
}

/**
 * Union/Commun only applies when several humans can contribute a list.
 * Hidden in solo and while creating (or sitting alone in) a salon.
 */
export function showWatchedFusionMode(isRoom: boolean, playerCount = 0): boolean {
  return isRoom && playerCount > 1;
}

/** French label for the Watched fusion mode (lobby banner, pool stats). */
export function watchedPoolModeLabel(mode?: 'union' | 'intersection'): string {
  return mode === 'intersection' ? 'commun' : 'union des listes';
}

/** Title-case label for rules and settings copy. */
export function watchedModeDisplayLabel(mode?: 'union' | 'intersection'): string {
  return mode === 'intersection' ? 'Commun' : 'Union';
}

export type WatchedPoolBannerVariant =
  'loading' | 'empty' | 'insufficient' | 'fallback' | 'sufficient';

export interface WatchedPoolBannerStats {
  playableSongs: number;
  soundCount: number;
  insufficient: boolean;
}

/** Lobby banner tone + copy from pool stats and fallback opt-in. */
export function resolveWatchedPoolBanner(
  stats: WatchedPoolBannerStats | null | undefined,
  loading: boolean,
  modeLabel: string,
  watchedAllowFallback?: boolean,
): { variant: WatchedPoolBannerVariant; count: number; soundCount: number; modeLabel: string } {
  if (loading || !stats) {
    return { variant: 'loading', count: 0, soundCount: 0, modeLabel };
  }
  if (stats.playableSongs === 0) {
    return { variant: 'empty', count: 0, soundCount: stats.soundCount, modeLabel };
  }
  if (stats.insufficient && watchedAllowFallback) {
    return {
      variant: 'fallback',
      count: stats.playableSongs,
      soundCount: stats.soundCount,
      modeLabel,
    };
  }
  if (stats.insufficient) {
    return {
      variant: 'insufficient',
      count: stats.playableSongs,
      soundCount: stats.soundCount,
      modeLabel,
    };
  }
  return {
    variant: 'sufficient',
    count: stats.playableSongs,
    soundCount: stats.soundCount,
    modeLabel,
  };
}

export function watchedPoolBannerVariantClasses(variant: WatchedPoolBannerVariant): string {
  switch (variant) {
    case 'loading':
      return 'border-border/60 bg-secondary/30 text-muted-foreground';
    case 'empty':
    case 'insufficient':
      return 'border-warning/40 bg-warning/10 text-warning';
    case 'fallback':
      return 'border-info/40 bg-info/10 text-info';
    case 'sufficient':
      return 'border-success/40 bg-success/10 text-success';
  }
}

interface WatchedLobbyPlayer {
  id: string | number;
  isBot?: boolean;
  hasWatchedList?: boolean;
}

export interface WatchedLobbyCheck {
  blocked: boolean;
  reason: string | null;
  /** Non-bot player ids that should show a "liste requise" badge. */
  badgeIds: Set<string | number>;
}

const NO_BLOCK: WatchedLobbyCheck = { blocked: false, reason: null, badgeIds: new Set() };

/**
 * Lobby-level validation for the Watched source:
 * - union: at least one human with AniList or MAL linked.
 * - intersection: every human must have a list linked (any provider).
 */
export function checkWatchedLobby(
  soundSelection: RoomConfig['soundSelection'],
  watchedMode: RoomConfig['watchedMode'],
  players: WatchedLobbyPlayer[],
  playlistWatched?: boolean,
): WatchedLobbyCheck {
  if (soundSelection !== 'watched' && !(soundSelection === 'playlist' && playlistWatched)) {
    return NO_BLOCK;
  }

  const humans = players.filter((p) => !p.isBot);
  if (!humans.length) return NO_BLOCK;

  const unlinked = humans.filter((p) => !p.hasWatchedList);

  if (watchedMode === 'intersection') {
    if (!unlinked.length) return NO_BLOCK;
    return {
      blocked: true,
      reason: 'Mode « Commun » : tous les joueurs doivent lier AniList ou MyAnimeList.',
      badgeIds: new Set(unlinked.map((p) => p.id)),
    };
  }

  const hasLinked = humans.length > unlinked.length;
  if (hasLinked) return NO_BLOCK;
  return {
    blocked: true,
    reason: 'Au moins un joueur doit lier AniList ou MyAnimeList (ou changez de source).',
    badgeIds: new Set(unlinked.map((p) => p.id)),
  };
}
