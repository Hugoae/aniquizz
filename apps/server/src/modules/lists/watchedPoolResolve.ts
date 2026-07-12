import type { WatchedPoolPlayer } from '../game/watchedPoolService';
import { resolvePlayerCatalogueIds, type WatchedListSources } from './listResolver';

export interface WatchedPoolPlayerInput {
  userId: string;
  isBot?: boolean;
  anilistUsername?: string | null;
  malUsername?: string | null;
}

export const toWatchedPoolPlayer = (player: WatchedPoolPlayerInput): WatchedPoolPlayer => ({
  userId: player.userId,
  isBot: player.isBot,
  anilistUsername: player.anilistUsername,
  malUsername: player.malUsername,
});

/**
 * Resolve union/intersection of human players' watched catalogue ids.
 * Bots are excluded from intersection quorum. Cross-provider (AniList + MAL) is OK.
 */
export const resolveWatchedIds = async (
  watchedMode: 'union' | 'intersection',
  players: WatchedPoolPlayerInput[],
): Promise<number[]> => {
  const humanPlayers = players.filter((p) => !p.isBot);

  const resolved = await Promise.all(
    humanPlayers.map((player) =>
      resolvePlayerCatalogueIds(player.userId, {
        anilistUsername: player.anilistUsername,
        malUsername: player.malUsername,
      } satisfies WatchedListSources),
    ),
  );
  const perPlayerIds = resolved.filter((ids) => ids.length > 0);

  if (!perPlayerIds.length) return [];

  if (watchedMode === 'intersection') {
    if (perPlayerIds.length < humanPlayers.length) return [];
    return perPlayerIds.reduce((acc, cur) => acc.filter((id) => cur.includes(id)), perPlayerIds[0]);
  }

  const union = new Set<number>();
  perPlayerIds.flat().forEach((id) => union.add(id));
  return Array.from(union);
};
