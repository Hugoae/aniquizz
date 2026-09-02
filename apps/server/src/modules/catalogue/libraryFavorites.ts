import { isBotId, prisma } from '@aniquizz/database';
import type { LibrarySongsResponse } from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import { countLikedSongs } from './songLikeService';
import { mapRowsWithUserFlags, resolveUserSongFlags, songSelect } from './librarySongQuery';

export class UserFavoritesError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID_USER' | 'NOT_FOUND',
  ) {
    super(message);
    this.name = 'UserFavoritesError';
  }
}

const PROFILE_FAVORITES_PAGE_SIZE = 5;
const PROFILE_FAVORITES_MAX_PAGE_SIZE = 24;
const PROFILE_PINNED_MAX = 5;

/** Public read of a profile's liked songs (pinned showcase first, else newest likes). */
export const browseUserFavoriteSongs = async (
  profileId: string,
  opts: { page?: number; pageSize?: number },
  viewerId?: string | null,
): Promise<LibrarySongsResponse> => {
  if (!profileId?.trim() || isBotId(profileId)) {
    throw new UserFavoritesError('Identifiant utilisateur invalide.', 'INVALID_USER');
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true, showFavoriteSongs: true },
  });
  if (!profile) {
    throw new UserFavoritesError('Profil introuvable.', 'NOT_FOUND');
  }

  const isOwner = viewerId === profileId;
  const publicVisible = profile.showFavoriteSongs;
  const totalLikes = await countLikedSongs(profileId);

  if (!publicVisible && !isOwner) {
    return {
      songs: [],
      pagination: {
        page: 1,
        pageSize: PROFILE_FAVORITES_PAGE_SIZE,
        totalItems: 0,
        totalPages: 1,
      },
      totalLikes: 0,
      visible: false,
    };
  }

  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(
    Math.max(1, Math.floor(opts.pageSize ?? PROFILE_FAVORITES_PAGE_SIZE)),
    PROFILE_FAVORITES_MAX_PAGE_SIZE,
  );

  const playableLike = {
    profileId,
    song: { downloadStatus: 'COMPLETED' as const },
  };

  const pinnedCount = await prisma.songLike.count({
    where: { ...playableLike, pinOrder: { not: null } },
  });

  const usePinned = pinnedCount > 0;
  const likeWhere = usePinned
    ? { ...playableLike, pinOrder: { not: null } }
    : playableLike;

  const [totalItems, likeRows] = await Promise.all([
    usePinned ? pinnedCount : prisma.songLike.count({ where: likeWhere }),
    prisma.songLike.findMany({
      where: likeWhere,
      orderBy: usePinned ? { pinOrder: 'asc' } : { likedAt: 'desc' },
      skip: usePinned ? 0 : (page - 1) * pageSize,
      take: usePinned ? PROFILE_PINNED_MAX : pageSize,
      select: { song: { select: songSelect } },
    }),
  ]);

  const rows = likeRows.map((r) => r.song);
  const songIds = rows.map((r) => r.id);

  let discovered = new Set<number>();
  let liked = new Set<number>();
  if (viewerId && songIds.length) {
    try {
      const flags = await resolveUserSongFlags(viewerId, songIds);
      discovered = flags.discovered;
      liked = flags.liked;
    } catch (e) {
      logger.warn('[Library] Failed to resolve viewer flags for user favorites', 'Library', e);
    }
  }

  if (viewerId === profileId) {
    for (const id of songIds) liked.add(id);
  }

  return {
    songs: mapRowsWithUserFlags(rows, discovered, liked),
    pagination: {
      page: usePinned ? 1 : page,
      pageSize: usePinned ? PROFILE_PINNED_MAX : pageSize,
      totalItems,
      totalPages: usePinned ? 1 : Math.max(1, Math.ceil(totalItems / pageSize)),
    },
    totalLikes,
    visible: true,
    ...(isOwner ? { publicVisible } : {}),
    ...(usePinned ? { curated: true } : {}),
  };
};
