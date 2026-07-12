-- MyAnimeList username link (mutually exclusive with anilistUsername at app layer).

ALTER TABLE "Profile" ADD COLUMN "malUsername" TEXT;

CREATE INDEX "Anime_idMal_idx" ON "Anime"("idMal");