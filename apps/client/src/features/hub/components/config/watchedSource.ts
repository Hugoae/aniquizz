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
  stats: { playableSongs: number; soundCount: number; insufficient: boolean; watchedMode?: 'union' | 'intersection' } | null,
  watchedAllowFallback?: boolean,
): WatchedPoolLaunchCheck {
  if (soundSelection !== 'watched' || !stats) {
    return { blocked: false, reason: null };
  }

  if (stats.playableSongs === 0) {
    const modeHint =
      stats.watchedMode === 'intersection'
        ? ' en mode Commun'
        : '';
    return {
      blocked: true,
      reason: `Aucun son jouable${modeHint} pour ces filtres. Changez la source ou les filtres.`,
    };
  }

  if (stats.insufficient && !watchedAllowFallback) {
    const modeHint =
      stats.watchedMode === 'intersection' ? ' (Commun)' : '';
    return {
      blocked: true,
      reason:
        `Seulement ${stats.playableSongs} son${stats.playableSongs > 1 ? 's' : ''} jouable${stats.playableSongs > 1 ? 's' : ''}${modeHint} pour ${stats.soundCount} demandé${stats.soundCount > 1 ? 's' : ''}. ` +
        'Activez « Compléter avec l\'aléatoire » ou réduisez le nombre de sons.',
    };
  }

  return { blocked: false, reason: null };
}

/** French label for the Watched fusion mode (lobby banner, pool stats). */
export function watchedPoolModeLabel(mode?: 'union' | 'intersection'): string {
  return mode === 'intersection' ? 'commun' : 'union des listes';
}

/** Title-case label for rules and settings copy. */
export function watchedModeDisplayLabel(mode?: 'union' | 'intersection'): string {
  return mode === 'intersection' ? 'Commun' : 'Union';
}

export type WatchedPoolBannerVariant = 'loading' | 'empty' | 'insufficient' | 'fallback' | 'sufficient';

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
