import { prisma } from '@aniquizz/database';
import { formatSongTypeLabel } from '@aniquizz/shared';
import { buildSongFilter } from '../catalogue/librarySongQuery';

const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 120;

export interface DailySongSearchHit {
  id: number;
  title: string;
  artist: string;
  songType: 'OP' | 'ED';
  sequence: number;
  typeLabel: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  anime: string;
  cover: string | null;
  videoKey: string;
}

export async function searchDailyPlayableSongs(
  query: string,
  excludeIds: number[] = [],
  limit = DEFAULT_LIMIT,
): Promise<DailySongSearchHit[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];

  const libraryWhere = await buildSongFilter({ q, songType: ['OP', 'ED'] });
  const rows = await prisma.song.findMany({
    where: {
      AND: [
        libraryWhere,
        { videoKey: { not: '' } },
        ...(excludeIds.length ? [{ id: { notIn: excludeIds } }] : []),
      ],
    },
    take: Math.min(DEFAULT_LIMIT, Math.max(1, limit)),
    orderBy: [
      { anime: { franchise: { name: 'asc' } } },
      { anime: { name: 'asc' } },
      { songType: 'asc' },
      { sequence: 'asc' },
    ],
    select: {
      id: true,
      title: true,
      artist: true,
      songType: true,
      sequence: true,
      difficulty: true,
      videoKey: true,
      anime: { select: { name: true, coverImage: true } },
    },
  });

  return rows
    .filter((row): row is typeof row & { songType: 'OP' | 'ED' } => row.songType === 'OP' || row.songType === 'ED')
    .map((row) => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      songType: row.songType,
      sequence: row.sequence,
      typeLabel: formatSongTypeLabel(row.songType, row.sequence),
      difficulty: row.difficulty,
      anime: row.anime.name,
      cover: row.anime.coverImage,
      videoKey: row.videoKey,
    }));
}
