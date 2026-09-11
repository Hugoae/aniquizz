import 'dotenv/config';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../src';
import { STAFF_THEMATIC_PLAYLISTS, RETIRED_STAFF_PLAYLIST_SLUGS, type PlaylistRecipe } from '@aniquizz/shared';

const buildDimensionWhere = (recipe: PlaylistRecipe): Prisma.SongWhereInput => {
  const and: Prisma.SongWhereInput[] = [{ downloadStatus: 'COMPLETED' }];
  if (recipe.genres?.length) {
    and.push({ anime: { franchise: { genres: { hasSome: recipe.genres } } } });
  }
  if (recipe.tags?.length) {
    and.push({ tags: { hasSome: recipe.tags } });
  }
  if (recipe.yearMin != null || recipe.yearMax != null) {
    and.push({
      anime: {
        seasonYear: {
          ...(recipe.yearMin != null ? { gte: recipe.yearMin } : {}),
          ...(recipe.yearMax != null ? { lte: recipe.yearMax } : {}),
        },
      },
    });
  }
  if (recipe.formats?.length) {
    and.push({ anime: { format: { in: recipe.formats } } });
  }
  if (recipe.songTypes?.length) {
    and.push({ songType: { in: recipe.songTypes } });
  }
  if (recipe.difficulties?.length) {
    and.push({ difficulty: { in: recipe.difficulties } });
  }
  return { AND: and };
};

const resolveSongIds = async (recipe: PlaylistRecipe): Promise<number[]> => {
  const matched = await prisma.song.findMany({
    where: buildDimensionWhere(recipe),
    select: { id: true },
  });
  const ids = new Set(matched.map((row) => row.id));
  if (recipe.includeSongIds?.length) {
    const included = await prisma.song.findMany({
      where: { id: { in: recipe.includeSongIds }, downloadStatus: 'COMPLETED' },
      select: { id: true },
    });
    for (const row of included) ids.add(row.id);
  }
  if (recipe.excludeSongIds?.length) {
    for (const id of recipe.excludeSongIds) ids.delete(id);
  }
  return [...ids];
};

const refreshSnapshot = async (playlistId: string, recipe: PlaylistRecipe, publish: boolean) => {
  const songIds = await resolveSongIds(recipe);
  await prisma.$transaction([
    prisma.thematicPlaylistSong.deleteMany({ where: { playlistId } }),
    ...(songIds.length
      ? [
          prisma.thematicPlaylistSong.createMany({
            data: songIds.map((songId) => ({ playlistId, songId })),
          }),
        ]
      : []),
    prisma.thematicPlaylist.update({
      where: { id: playlistId },
      data: {
        snapshotAt: new Date(),
        snapshotCount: songIds.length,
        ...(publish ? { isPublished: true } : {}),
      },
    }),
  ]);
  return songIds.length;
};

/**
 * Upsert staff thematic playlists and freeze COMPLETED snapshots.
 * Usage (from packages/database): pnpm exec ts-node scripts/seed_thematic_playlists.ts
 */
async function main() {
  const publish = process.env.PLAYLIST_SEED_PUBLISH !== '0';
  const retired = await prisma.thematicPlaylist.deleteMany({
    where: { slug: { in: [...RETIRED_STAFF_PLAYLIST_SLUGS] } },
  });
  if (retired.count > 0) {
    console.log(`Retired ${retired.count} staff playlist(s): ${RETIRED_STAFF_PLAYLIST_SLUGS.join(', ')}`);
  }
  for (const seed of STAFF_THEMATIC_PLAYLISTS) {
    const existing = await prisma.thematicPlaylist.findUnique({ where: { slug: seed.slug } });
    const row = existing
      ? await prisma.thematicPlaylist.update({
          where: { slug: seed.slug },
          data: {
            name: seed.name,
            description: seed.description,
            category: seed.category,
            sortOrder: seed.sortOrder,
            recipe: seed.recipe as Prisma.InputJsonValue,
          },
        })
      : await prisma.thematicPlaylist.create({
          data: {
            id: randomUUID(),
            slug: seed.slug,
            name: seed.name,
            description: seed.description,
            category: seed.category,
            sortOrder: seed.sortOrder,
            recipe: seed.recipe as Prisma.InputJsonValue,
          },
        });
    const count = await refreshSnapshot(row.id, seed.recipe, publish);
    console.log(`${seed.slug}: ${count} songs (${row.id})`);
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
