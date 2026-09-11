import type { WatchedPoolPlayer } from '../game/watchedPoolService';
import { resolvePlayerCatalogueWithMeta, type WatchedListSources } from './listResolver';

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

export interface WatchedPoolResolveResult {
  ids: number[];
  listError?: 'anilist_blocked';
}

/**
 * Resolve union/intersection of human players' watched catalogue ids.
 * Bots are excluded from intersection quorum. Cross-provider (AniList + MAL) is OK.
 */
export const resolveWatchedPool = async (
  watchedMode: 'union' | 'intersection',
  players: WatchedPoolPlayerInput[],
): Promise<WatchedPoolResolveResult> => {
  const humanPlayers = players.filter((p) => !p.isBot);

  const resolved = await Promise.all(
    humanPlayers.map((player) =>
      resolvePlayerCatalogueWithMeta(player.userId, {
        anilistUsername: player.anilistUsername,
        malUsername: player.malUsername,
      } satisfies WatchedListSources),
    ),
  );

  const listError = resolved.some((row) => row.listError === 'anilist_blocked')
    ? 'anilist_blocked'
    : undefined;

  const perPlayerIds = resolved.map((row) => row.ids).filter((ids) => ids.length > 0);

  if (!perPlayerIds.length) return { ids: [], listError };

  if (watchedMode === 'intersection') {
    if (perPlayerIds.length < humanPlayers.length) return { ids: [], listError };
    return {
      ids: perPlayerIds.reduce((acc, cur) => acc.filter((id) => cur.includes(id)), perPlayerIds[0]),
      listError,
    };
  }

  const union = new Set<number>();
  perPlayerIds.flat().forEach((id) => union.add(id));
  return { ids: Array.from(union), listError };
};

export const resolveWatchedIds = async (
  watchedMode: 'union' | 'intersection',
  players: WatchedPoolPlayerInput[],
): Promise<number[]> => (await resolveWatchedPool(watchedMode, players)).ids;
