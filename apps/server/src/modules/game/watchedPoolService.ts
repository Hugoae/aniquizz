import {
  ANILIST_API_DOWN_MESSAGE,
  hasEnoughQcmNames,
  normalizePrecision,
  resolvePoolQueryFilters,
} from '@aniquizz/shared';
import {
  countDistinctChoiceNames,
  countPlayableWatchedSongs,
  listPlayableAnimeIds,
  type SongFilters,
} from './gameService';
import type { Room } from './engine/Room';
import { resolveWatchedPool, type WatchedPoolPlayerInput } from '../lists/watchedPoolResolve';

const QCM_TOO_SMALL_REASON =
  'Pas assez d\'animes distincts dans ce pool pour le QCM (il en faut au moins 4). ' +
  'Passez en Typing ou élargissez les filtres.';

export type WatchedPoolPlayer = WatchedPoolPlayerInput;
export { resolveWatchedIds } from '../lists/watchedPoolResolve';

export const getWatchedPoolStatsForPlayers = async (
  watchedMode: 'union' | 'intersection',
  players: WatchedPoolPlayer[],
  songFilters: Pick<SongFilters, 'difficulty' | 'types'>,
  soundCount: number,
  precision?: string,
) => {
  const { ids: watchedIds, listError } = await resolveWatchedPool(watchedMode, players);
  const resolvedFilters = resolvePoolQueryFilters(songFilters);
  const playableSongs = await countPlayableWatchedSongs(watchedIds, resolvedFilters);
  const playableAnimeIds = await listPlayableAnimeIds({
    ...resolvedFilters,
    watchedIds,
  });
  const distinctNames = await countDistinctChoiceNames(
    normalizePrecision(precision),
    playableAnimeIds,
  );
  return {
    animeCount: watchedIds.length,
    playableSongs,
    soundCount,
    insufficient: playableSongs < soundCount,
    distinctNames,
    watchedMode,
    listError,
  };
};

/** Server-side gate before starting a Watched match (no silent global fallback). */
export const validateWatchedStart = async (
  room: Room,
): Promise<{ ok: boolean; reason?: string }> => {
  const settings = room.settings;
  if (settings.soundSelection !== 'watched') return { ok: true };

  const players = [...room.players.values()].map((p) => ({
    userId: p.userId,
    isBot: p.isBot,
    anilistUsername: p.anilistUsername,
    malUsername: p.malUsername,
  }));

  const stats = await getWatchedPoolStatsForPlayers(
    settings.watchedMode ?? 'union',
    players,
    { difficulty: settings.difficulty, types: settings.soundTypes },
    settings.soundCount,
    settings.precision,
  );

  if (stats.playableSongs === 0) {
    return {
      ok: false,
      reason:
        stats.listError === 'anilist_blocked'
          ? ANILIST_API_DOWN_MESSAGE
          : settings.watchedMode === 'intersection'
            ? 'Aucun son jouable en mode Commun pour ces filtres.'
            : 'Aucun son jouable dans votre liste pour ces filtres. Liez AniList ou MyAnimeList, ou changez la source.',
    };
  }

  if (stats.insufficient && !settings.watchedAllowFallback) {
    const modeHint =
      settings.watchedMode === 'intersection'
        ? ' (Commun)'
        : '';
    return {
      ok: false,
      reason:
        `Seulement ${stats.playableSongs} son${stats.playableSongs > 1 ? 's' : ''} jouable${stats.playableSongs > 1 ? 's' : ''}${modeHint} pour ${stats.soundCount} demandé${stats.soundCount > 1 ? 's' : ''}. ` +
        'Activez « Compléter avec l\'aléatoire » ou réduisez le nombre de sons.',
    };
  }

  if (!hasEnoughQcmNames(stats.distinctNames, settings.responseType ?? 'mix')) {
    return { ok: false, reason: QCM_TOO_SMALL_REASON };
  }

  return { ok: true };
};
