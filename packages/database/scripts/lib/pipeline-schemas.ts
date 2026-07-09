import { z } from "zod";
import { getPipelineSongSource } from "./song-helpers";

const songSchema = z
  .object({
    title: z.string().optional(),
    artist: z.string().optional(),
    songType: z.enum(['OP', 'ED', 'INSERT']).optional(),
    sequence: z.number().int().positive().optional(),
    /** @deprecated legacy pipeline field — use songType + sequence */
    type: z.string().optional(),
    /** New pipeline: AnimeThemes download URL (PENDING) or R2 URL (COMPLETED). */
    sourceUrl: z.string().url().optional(),
    /** Legacy pipeline stored the AnimeThemes URL here; DB exports store the real R2 key. */
    videoKey: z.string().optional(),
    difficulty: z.string().optional(),
    tags: z.array(z.string()).optional(),
    duration: z.number().nullable().optional(),
    /** Episode range covered by the theme entry (AnimeThemes), e.g. "1-13". */
    episodeRange: z.string().nullable().optional(),
  })
  .refine((s) => s.songType || s.type, { message: 'songType or legacy type required' })
  .refine((s) => !!getPipelineSongSource(s), {
    message: 'a usable http(s) source is required (sourceUrl, or legacy videoKey URL)',
  });

const animeSchema = z.object({
  id: z.number(),
  idMal: z.number().nullable().optional(),
  name: z.string().optional(),
  altNames: z.array(z.string()).optional(),
  siteUrl: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  /** Step-1 emits `coverColor`; some legacy JSON used `color`. */
  coverColor: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  bannerImage: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  studio: z.string().nullable().optional(),
  popularity: z.number().nullable().optional(),
  averageScore: z.number().nullable().optional(),
  episodes: z.number().nullable().optional(),
  season: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  format: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  /** Pipeline step-1 uses `year`; DB exports use `seasonYear`. */
  year: z.number().nullable().optional(),
  seasonYear: z.number().nullable().optional(),
  isLocked: z.boolean().optional(),
  songs: z.array(songSchema).optional(),
});

const franchiseSchema = z.object({
  franchiseName: z.string().optional(),
  /** DB exports use `name` for the franchise instead of `franchiseName`. */
  name: z.string().optional(),
  isLocked: z.boolean().optional(),
  genres: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  animes: z.array(animeSchema).optional(),
});

export const franchisePipelineSchema = z.array(franchiseSchema);

export type FranchisePipelineData = z.infer<typeof franchisePipelineSchema>;
export type FranchisePipelineEntry = z.infer<typeof franchiseSchema>;
export type AnimePipelineEntry = z.infer<typeof animeSchema>;

export function parsePipelineJson(raw: unknown, label: string): FranchisePipelineData {
  const result = franchisePipelineSchema.safeParse(raw);
  if (!result.success) {
    console.error(`Invalid ${label} JSON:`, result.error.flatten());
    throw new Error(`Invalid ${label} JSON structure`);
  }
  return result.data;
}
