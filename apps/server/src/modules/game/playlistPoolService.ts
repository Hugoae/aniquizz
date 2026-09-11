import {
  hasEnoughQcmNames,
  hasPlaylistSource,
  isWatchedPoolInsufficient,
  normalizePrecision,
  ANILIST_API_DOWN_MESSAGE,
  PLAYLIST_UNAVAILABLE_REASON,
  playlistSourceIds,
  resolvePoolQueryFilters,
  type PlaylistPoolStats,
} from '@aniquizz/shared';
import type { Room } from './engine/Room';
import {
  countDistinctChoiceNames,
  countPlayableSongs,
  listPlayableAnimeIds,
  type SongFilters,
} from './gameService';
import { loadPlaylistPoolScope } from './playlistRecipeService';
import { validateWatchedStart } from './watchedPoolService';
import { resolveWatchedPool } from '../lists/watchedPoolResolve';

type PoolSongFilters = Pick<SongFilters, 'difficulty' | 'types'>;

/** `null` means the host cleared that slot; omit (`undefined`) keeps the room value. */
const pickPlaylistId = (
  override: string | null | undefined,
  fallback: string | null | undefined,
): string | undefined => {
  if (override === null) return undefined;
  if (override !== undefined) return override;
  return fallback ?? undefined;
};

const emptyStats = (
  playlistId: string,
  soundCount: number,
  decadePlaylistId?: string,
  requestId?: number,
): PlaylistPoolStats => ({
  playlistId,
  decadePlaylistId,
  snapshotCount: 0,
  filteredCount: 0,
  playableSongs: 0,
  animeCount: 0,
  distinctNames: 0,
  soundCount,
  insufficient: true,
  packInsufficient: true,
  staleDropped: 0,
  playlistWatched: false,
  requestId,
});

export const computePlaylistPoolStats = async (input: {
  playlistId?: string | null;
  decadePlaylistId?: string | null;
  soundCount: number;
  songFilters: PoolSongFilters;
  precision: string | undefined;
  playlistWatched: boolean;
  allowFallback: boolean;
  watchedMode?: 'union' | 'intersection';
  watchedIds?: number[];
  listError?: 'anilist_blocked';
}): Promise<PlaylistPoolStats | { missing: true }> => {
  const ids = playlistSourceIds(input);
  if (!ids.length) return { missing: true };
  const scope = await loadPlaylistPoolScope(ids);
  if (!scope || !scope.isPublished) return { missing: true };

  const primaryId = input.playlistId ?? input.decadePlaylistId ?? scope.playlistIds[0] ?? '';
  const lobbyFilters = resolvePoolQueryFilters(input.songFilters);
  const filters = {
    ...lobbyFilters,
    playlistIds: scope.playlistIds,
  };
  const filteredCount = await countPlayableSongs(filters);
  const overlayActive = input.playlistWatched;
  const playableSongs = overlayActive
    ? await countPlayableSongs({ ...filters, watchedIds: input.watchedIds ?? [] })
    : filteredCount;

  const namesFromPack = !overlayActive || input.allowFallback;
  const choiceAnimeIds = await listPlayableAnimeIds(
    namesFromPack ? filters : { ...filters, watchedIds: input.watchedIds ?? [] },
  );
  const distinctNames = await countDistinctChoiceNames(
    normalizePrecision(input.precision),
    choiceAnimeIds,
  );

  return {
    playlistId: primaryId,
    decadePlaylistId: input.decadePlaylistId ?? undefined,
    snapshotCount: scope.snapshotCount,
    filteredCount,
    playableSongs,
    animeCount: choiceAnimeIds.length,
    distinctNames,
    soundCount: input.soundCount,
    insufficient: isWatchedPoolInsufficient(playableSongs, input.soundCount),
    packInsufficient: isWatchedPoolInsufficient(filteredCount, input.soundCount),
    staleDropped: scope.staleDropped,
    playlistWatched: overlayActive,
    watchedMode: input.watchedMode,
    listError: overlayActive ? input.listError : undefined,
  };
};

export const getPlaylistPoolStatsForRoom = async (
  room: Room,
  overrides?: {
    playlistId?: string | null;
    decadePlaylistId?: string | null;
    soundCount?: number;
    difficulty?: string[];
    types?: string[];
    playlistWatched?: boolean;
    watchedMode?: 'union' | 'intersection';
  },
): Promise<PlaylistPoolStats | { missing: true }> => {
  const playlistId = pickPlaylistId(overrides?.playlistId, room.settings.playlistId);
  const decadePlaylistId = pickPlaylistId(overrides?.decadePlaylistId, room.settings.decadePlaylistId);
  if (!hasPlaylistSource({ playlistId, decadePlaylistId })) return { missing: true };

  const playlistWatched = overrides?.playlistWatched ?? Boolean(room.settings.playlistWatched);
  const watchedMode = overrides?.watchedMode ?? room.settings.watchedMode ?? 'union';
  let watchedIds: number[] | undefined;
  let listError: 'anilist_blocked' | undefined;
  if (playlistWatched) {
    const resolved = await resolveWatchedPool(
      watchedMode,
      [...room.players.values()].map((p) => ({
        userId: p.userId,
        isBot: p.isBot,
        anilistUsername: p.anilistUsername,
        malUsername: p.malUsername,
      })),
    );
    watchedIds = resolved.ids;
    listError = resolved.listError;
  }

  return computePlaylistPoolStats({
    playlistId,
    decadePlaylistId,
    soundCount: overrides?.soundCount ?? room.settings.soundCount,
    songFilters: {
      difficulty: overrides?.difficulty ?? room.settings.difficulty,
      types: overrides?.types ?? room.settings.soundTypes,
    },
    precision: room.settings.precision,
    playlistWatched,
    allowFallback: Boolean(room.settings.watchedAllowFallback),
    watchedMode,
    watchedIds,
    listError,
  });
};

export { emptyStats as emptyPlaylistPoolStats };

export const validateMusicSourceStart = async (
  room: Room,
): Promise<{ ok: boolean; reason?: string }> => {
  const settings = room.settings;
  if (settings.soundSelection !== 'playlist') {
    return validateWatchedStart(room);
  }

  if (!hasPlaylistSource(settings)) {
    return { ok: false, reason: 'Choisissez une playlist pour lancer la partie.' };
  }

  const stats = await getPlaylistPoolStatsForRoom(room);
  if ('missing' in stats) {
    return { ok: false, reason: PLAYLIST_UNAVAILABLE_REASON };
  }
  if (stats.filteredCount === 0) {
    return {
      ok: false,
      reason: 'Aucun son jouable dans ce pack pour ces filtres (type ou difficulté).',
    };
  }
  if (stats.packInsufficient) {
    return {
      ok: false,
      reason:
        `Ce pack n'a que ${stats.filteredCount} son${stats.filteredCount > 1 ? 's' : ''} jouable${stats.filteredCount > 1 ? 's' : ''} ` +
        `pour ${stats.soundCount} manches. Réduisez le nombre de sons ou élargissez les filtres ` +
        `(pas de complétion hors pack).`,
    };
  }

  if (settings.playlistWatched) {
    if (stats.playableSongs === 0 && !settings.watchedAllowFallback) {
      if (stats.listError === 'anilist_blocked') {
        return { ok: false, reason: ANILIST_API_DOWN_MESSAGE };
      }
      return {
        ok: false,
        reason:
          settings.watchedMode === 'intersection'
            ? 'Aucun son du pack en mode Commun pour ces listes.'
            : 'Aucun son du pack dans vos listes AniList ou MyAnimeList.',
      };
    }
    if (stats.insufficient && !settings.watchedAllowFallback) {
      return {
        ok: false,
        reason:
          `Seulement ${stats.playableSongs} son${stats.playableSongs > 1 ? 's' : ''} du pack dans vos listes ` +
          `pour ${stats.soundCount} manches. Activez « Compléter avec le pack » ou réduisez le nombre de sons.`,
      };
    }
  }

  if (!hasEnoughQcmNames(stats.distinctNames, settings.responseType ?? 'mix')) {
    return {
      ok: false,
      reason:
        'Pas assez d\'animes distincts dans ce pool pour le QCM (il en faut au moins 4). ' +
        'Passez en Typing ou élargissez le pack / les filtres.',
    };
  }

  return { ok: true };
};
