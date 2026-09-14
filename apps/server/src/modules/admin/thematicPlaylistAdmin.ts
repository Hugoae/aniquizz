import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma, Prisma } from '@aniquizz/database';
import {
  STAFF_THEMATIC_PLAYLISTS,
  RETIRED_STAFF_PLAYLIST_SLUGS,
  PLAYLIST_RECIPE_LIMITS,
  nextPlaylistPublishState,
  recipeHasPositiveConstraint,
  recipeYearRangeIsValid,
} from '@aniquizz/shared';
import {
  parsePlaylistRecipe,
  previewPlaylistRecipe,
  refreshPlaylistSnapshot,
} from '../game/playlistRecipeService';

export { refreshPlaylistSnapshot } from '../game/playlistRecipeService';

export const playlistRecipeSchema = z
  .object({
    genres: z
      .array(z.string().max(PLAYLIST_RECIPE_LIMITS.stringMax))
      .max(PLAYLIST_RECIPE_LIMITS.genres)
      .optional(),
    tags: z
      .array(z.string().max(PLAYLIST_RECIPE_LIMITS.stringMax))
      .max(PLAYLIST_RECIPE_LIMITS.tags)
      .optional(),
    yearMin: z.number().int().optional(),
    yearMax: z.number().int().optional(),
    formats: z
      .array(z.string().max(PLAYLIST_RECIPE_LIMITS.stringMax))
      .max(PLAYLIST_RECIPE_LIMITS.formats)
      .optional(),
    songTypes: z
      .array(z.enum(['OP', 'ED']))
      .max(PLAYLIST_RECIPE_LIMITS.songTypes)
      .optional(),
    difficulties: z
      .array(z.enum(['EASY', 'MEDIUM', 'HARD']))
      .max(PLAYLIST_RECIPE_LIMITS.difficulties)
      .optional(),
    includeSongIds: z
      .array(z.number().int().positive())
      .max(PLAYLIST_RECIPE_LIMITS.includeSongIds)
      .optional(),
    excludeSongIds: z
      .array(z.number().int().positive())
      .max(PLAYLIST_RECIPE_LIMITS.excludeSongIds)
      .optional(),
  })
  .superRefine((raw, ctx) => {
    const recipe = parsePlaylistRecipe(raw);
    if (!recipeHasPositiveConstraint(recipe)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Recipe must include at least one constraint.',
      });
    }
    if (!recipeYearRangeIsValid(recipe)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'yearMin must be <= yearMax.',
        path: ['yearMin'],
      });
    }
  });

export const playlistUpsertSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  description: z.string().max(400).default(''),
  category: z.enum(['genre', 'tag', 'decade', 'format', 'theme']).default('theme'),
  sortOrder: z.coerce.number().int().default(0),
  recipe: playlistRecipeSchema,
  isPublished: z.boolean().optional(),
});

export const listAdminPlaylists = async () =>
  prisma.thematicPlaylist.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

export const previewRecipe = async (raw: unknown) => {
  const recipe = parsePlaylistRecipe(raw);
  return previewPlaylistRecipe(recipe);
};

export const upsertPlaylist = async (
  id: string | undefined,
  input: z.infer<typeof playlistUpsertSchema>,
) => {
  const recipe = parsePlaylistRecipe(input.recipe);
  if (id) {
    const existing = await prisma.thematicPlaylist.findUnique({ where: { id } });
    const publishState = existing
      ? nextPlaylistPublishState({
          previousRecipe: parsePlaylistRecipe(existing.recipe),
          nextRecipe: recipe,
          requestedPublish: input.isPublished,
          snapshotCount: existing.snapshotCount,
        })
      : {};
    return prisma.thematicPlaylist.update({
      where: { id },
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description,
        category: input.category,
        sortOrder: input.sortOrder,
        recipe: recipe as Prisma.InputJsonValue,
        ...publishState,
      },
    });
  }
  return prisma.thematicPlaylist.create({
    data: {
      id: randomUUID(),
      slug: input.slug,
      name: input.name,
      description: input.description,
      category: input.category,
      sortOrder: input.sortOrder,
      recipe: recipe as Prisma.InputJsonValue,
    },
  });
};

export const deletePlaylist = async (id: string) => {
  await prisma.thematicPlaylist.delete({ where: { id } });
};

export const seedStaffPlaylists = async (publish: boolean) => {
  if (RETIRED_STAFF_PLAYLIST_SLUGS.length > 0) {
    await prisma.thematicPlaylist.deleteMany({
      where: { slug: { in: [...RETIRED_STAFF_PLAYLIST_SLUGS] } },
    });
  }
  const results: Array<{ slug: string; id: string; snapshotCount: number }> = [];
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
    const snapshotCount = await refreshPlaylistSnapshot(row.id, publish);
    results.push({ slug: seed.slug, id: row.id, snapshotCount });
  }
  return results;
};
