-- Catalogue enrichment: extra AniList metadata on Anime (all nullable, additive/non-destructive).
-- idMal is provided directly by AniList (no cross-source matching needed).

ALTER TABLE "Anime" ADD COLUMN IF NOT EXISTS "coverColor" TEXT;
ALTER TABLE "Anime" ADD COLUMN IF NOT EXISTS "bannerImage" TEXT;
ALTER TABLE "Anime" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Anime" ADD COLUMN IF NOT EXISTS "averageScore" INTEGER;
ALTER TABLE "Anime" ADD COLUMN IF NOT EXISTS "episodes" INTEGER;
ALTER TABLE "Anime" ADD COLUMN IF NOT EXISTS "season" TEXT;
ALTER TABLE "Anime" ADD COLUMN IF NOT EXISTS "idMal" INTEGER;
