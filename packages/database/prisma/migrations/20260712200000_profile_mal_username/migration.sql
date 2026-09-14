-- MyAnimeList username link. Dual-link support was added later through activeListProvider.

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "malUsername" TEXT;

CREATE INDEX IF NOT EXISTS "Anime_idMal_idx" ON "Anime"("idMal");