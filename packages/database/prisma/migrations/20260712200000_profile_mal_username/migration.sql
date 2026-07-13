-- MyAnimeList username link (mutually exclusive with anilistUsername at app layer).

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "malUsername" TEXT;

CREATE INDEX IF NOT EXISTS "Anime_idMal_idx" ON "Anime"("idMal");