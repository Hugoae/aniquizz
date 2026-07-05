import { z } from "zod";

const songSchema = z.object({
  title: z.string().optional(),
  artist: z.string().optional(),
  type: z.string(),
  sequence: z.number().optional(),
  sourceUrl: z.string().url(),
  difficulty: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const animeSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  isLocked: z.boolean().optional(),
  songs: z.array(songSchema).optional(),
});

export const franchisePipelineSchema = z.array(
  z.object({
    franchiseName: z.string().optional(),
    isLocked: z.boolean().optional(),
    animes: z.array(animeSchema).optional(),
  }),
);

export type FranchisePipelineData = z.infer<typeof franchisePipelineSchema>;

export function parsePipelineJson(raw: unknown, label: string): FranchisePipelineData {
  const result = franchisePipelineSchema.safeParse(raw);
  if (!result.success) {
    console.error(`Invalid ${label} JSON:`, result.error.flatten());
    throw new Error(`Invalid ${label} JSON structure`);
  }
  return result.data;
}
