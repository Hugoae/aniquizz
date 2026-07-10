import { prisma } from '@aniquizz/database';
import { logger } from '../../utils/logger';
import { getUserAnimeIds } from '../anilist/anilistService';
import { countPlayableWatchedSongs, type SongFilters } from './gameService';
import type { Room } from './engine/Room';

export interface WatchedPoolPlayer {
  userId: string;
  isBot?: boolean;
  anilistUsername?: string | null;
}

/**
 * Resolve union/intersection of human players' AniList watched ids.
 * Mirrors PlaylistBuilder logic (bots excluded from intersection quorum).
 */
export const resolveWatchedIds = async (
  watchedMode: 'union' | 'intersection',
  players: WatchedPoolPlayer[],
): Promise<number[]> => {
  const humanPlayers = players.filter((p) => !p.isBot);

  const needProfileLookup = humanPlayers
    .filter((p) => !p.anilistUsername)
    .map((p) => p.userId);
  const profileMap = new Map<string, string | null>();
  if (needProfileLookup.length) {
    const profiles = await prisma.profile.findMany({
      where: { id: { in: needProfileLookup } },
      select: { id: true, anilistUsername: true },
    });
    profiles.forEach((p) => profileMap.set(p.id, p.anilistUsername));
  }

  const resolved = await Promise.all(
    humanPlayers.map(async (player) => {
      const username = player.anilistUsername || profileMap.get(player.userId) || null;
      if (!username) return [] as number[];
      return getUserAnimeIds(username);
    }),
  );
  const perPlayerIds = resolved.filter((ids) => ids.length > 0);

  if (!perPlayerIds.length) {
    logger.warn('[WatchedPool] No AniList lists resolved.', 'Anilist');
    return [];
  }

  if (watchedMode === 'intersection') {
    if (perPlayerIds.length < humanPlayers.length) return [];
    return perPlayerIds.reduce((acc, cur) => acc.filter((id) => cur.includes(id)), perPlayerIds[0]);
  }

  const union = new Set<number>();
  perPlayerIds.flat().forEach((id) => union.add(id));
  return Array.from(union);
};

export const getWatchedPoolStatsForPlayers = async (
  watchedMode: 'union' | 'intersection',
  players: WatchedPoolPlayer[],
  songFilters: Pick<SongFilters, 'difficulty' | 'types'>,
  soundCount: number,
) => {
  const watchedIds = await resolveWatchedIds(watchedMode, players);
  const playableSongs = await countPlayableWatchedSongs(watchedIds, songFilters);
  return {
    animeCount: watchedIds.length,
    playableSongs,
    soundCount,
    insufficient: playableSongs < soundCount,
    watchedMode,
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
  }));

  const stats = await getWatchedPoolStatsForPlayers(
    settings.watchedMode ?? 'union',
    players,
    { difficulty: settings.difficulty, types: settings.soundTypes },
    settings.soundCount,
  );

  if (stats.playableSongs === 0) {
    return {
      ok: false,
      reason:
        settings.watchedMode === 'intersection'
          ? 'Aucun son jouable en mode Commun pour ces filtres.'
          : 'Aucun son jouable dans votre liste AniList pour ces filtres. Liez AniList ou changez la source.',
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

  return { ok: true };
};
