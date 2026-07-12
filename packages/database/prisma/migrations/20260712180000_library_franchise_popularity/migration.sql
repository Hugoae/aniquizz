-- Denormalized max anime popularity per franchise (library sort) + altNames search index.

ALTER TABLE "Franchise" ADD COLUMN "maxPopularity" INTEGER NOT NULL DEFAULT 0;

UPDATE "Franchise" f
SET "maxPopularity" = COALESCE(
  (SELECT MAX(a."popularity") FROM "Anime" a WHERE a."franchiseId" = f.id),
  0
);

CREATE INDEX "Franchise_maxPopularity_idx" ON "Franchise"("maxPopularity" DESC);

CREATE INDEX "Anime_altNames_gin_idx" ON "Anime" USING GIN ("altNames");
