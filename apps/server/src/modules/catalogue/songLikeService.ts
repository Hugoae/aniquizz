import { isBotId, prisma } from '@aniquizz/database';
import type {
  ProfilePinnedSongsResponse,
  SongLikeToggleResponse,
  SongLikesIdsResponse,
} from '@aniquizz/shared';

export const MAX_PROFILE_PINNED_SONGS = 5;
/** Hard cap on GET /library/likes/ids — hearts only need playable catalogue ids. */
export const MAX_LIKED_IDS = 5000;

export class SongLikeError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID_SONG' | 'BOT' | 'NOT_FOUND' | 'LIMIT',
  ) {
    super(message);
    this.name = 'SongLikeError';
  }
}

const assertPlayableSong = async (songId: number): Promise<void> => {
  if (!Number.isInteger(songId) || songId <= 0) {
    throw new SongLikeError('Identifiant de son invalide.', 'INVALID_SONG');
  }
  const song = await prisma.song.findFirst({
    where: { id: songId, downloadStatus: 'COMPLETED' },
    select: { id: true },
  });
  if (!song) {
    throw new SongLikeError('Son introuvable ou non jouable.', 'INVALID_SONG');
  }
};

const assertHumanUser = (userId: string): void => {
  if (isBotId(userId)) {
    throw new SongLikeError('Action non autorisée pour ce compte.', 'BOT');
  }
};

export const likeSong = async (userId: string, songId: number): Promise<SongLikeToggleResponse> => {
  assertHumanUser(userId);
  await assertPlayableSong(songId);

  await prisma.$transaction(async (tx) => {
    // INSERT ON CONFLICT DO NOTHING — concurrent PUT cannot P2002 the unique like.
    const created = await tx.songLike.createMany({
      data: [{ profileId: userId, songId }],
      skipDuplicates: true,
    });
    if (created.count === 0) return;

    await tx.song.update({
      where: { id: songId },
      data: { likeCount: { increment: 1 } },
    });
  });

  return { songId, liked: true };
};

export const unlikeSong = async (
  userId: string,
  songId: number,
): Promise<SongLikeToggleResponse> => {
  assertHumanUser(userId);
  await assertPlayableSong(songId);

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.songLike.deleteMany({
      where: { profileId: userId, songId },
    });
    if (deleted.count > 0) {
      await tx.song.update({
        where: { id: songId },
        data: { likeCount: { decrement: deleted.count } },
      });
    }
  });

  return { songId, liked: false };
};

export const getLikedSongIds = async (userId: string): Promise<SongLikesIdsResponse> => {
  assertHumanUser(userId);
  const where = {
    profileId: userId,
    song: { downloadStatus: 'COMPLETED' as const },
  };
  const [total, rows] = await Promise.all([
    prisma.songLike.count({ where }),
    prisma.songLike.findMany({
      where,
      select: { songId: true },
      orderBy: { likedAt: 'desc' },
      take: MAX_LIKED_IDS,
    }),
  ]);
  const songIds = rows.map((r) => r.songId);
  return { songIds, total };
};

export const countLikedSongs = async (userId: string): Promise<number> => {
  assertHumanUser(userId);
  return prisma.songLike.count({ where: { profileId: userId } });
};

export const resolveLikedIds = async (userId: string, songIds: number[]): Promise<Set<number>> => {
  if (!songIds.length) return new Set();
  const rows = await prisma.songLike.findMany({
    where: { profileId: userId, songId: { in: songIds } },
    select: { songId: true },
  });
  return new Set(rows.map((r) => r.songId));
};

export const getPinnedSongIds = async (userId: string): Promise<ProfilePinnedSongsResponse> => {
  assertHumanUser(userId);
  const rows = await prisma.songLike.findMany({
    where: { profileId: userId, pinOrder: { not: null } },
    orderBy: { pinOrder: 'asc' },
    select: { songId: true },
  });
  return { songIds: rows.map((r) => r.songId) };
};

export const setPinnedSongs = async (
  userId: string,
  songIds: number[],
): Promise<ProfilePinnedSongsResponse> => {
  assertHumanUser(userId);

  if (!Array.isArray(songIds)) {
    throw new SongLikeError('Liste de favoris invalide.', 'INVALID_SONG');
  }
  if (songIds.length > MAX_PROFILE_PINNED_SONGS) {
    throw new SongLikeError(
      `Vous ne pouvez épingler que ${MAX_PROFILE_PINNED_SONGS} titres maximum.`,
      'LIMIT',
    );
  }

  const unique: number[] = [];
  const seen = new Set<number>();
  for (const raw of songIds) {
    if (!Number.isInteger(raw) || raw <= 0) {
      throw new SongLikeError('Identifiant de son invalide.', 'INVALID_SONG');
    }
    if (seen.has(raw)) continue;
    seen.add(raw);
    unique.push(raw);
  }

  if (!unique.length) {
    await prisma.songLike.updateMany({
      where: { profileId: userId },
      data: { pinOrder: null },
    });
    return { songIds: [] };
  }

  const likes = await prisma.songLike.findMany({
    where: { profileId: userId, songId: { in: unique } },
    select: { songId: true },
  });
  if (likes.length !== unique.length) {
    throw new SongLikeError('Certains titres ne sont pas dans vos favoris.', 'NOT_FOUND');
  }

  await prisma.$transaction(async (tx) => {
    await tx.songLike.updateMany({
      where: { profileId: userId },
      data: { pinOrder: null },
    });
    for (let i = 0; i < unique.length; i += 1) {
      await tx.songLike.update({
        where: { profileId_songId: { profileId: userId, songId: unique[i]! } },
        data: { pinOrder: i + 1 },
      });
    }
  });

  return { songIds: unique };
};
