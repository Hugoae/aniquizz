-- Phase 4: schema cleanup (SongType/Difficulty, indexes, SongHistory aggregate, drop SongVote)

-- CreateEnum
CREATE TYPE "SongType" AS ENUM ('OP', 'ED', 'INSERT');
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- Drop SongVote (and dependent RLS policies)
DROP TABLE IF EXISTS "SongVote";

-- DropEnum
DROP TYPE IF EXISTS "VoteType";

-- Song: split type → songType + sequence
ALTER TABLE "Song" ADD COLUMN "songType" "SongType";
ALTER TABLE "Song" ADD COLUMN "sequence" INTEGER NOT NULL DEFAULT 1;

UPDATE "Song" SET
  "songType" = CASE
    WHEN "type" ~ '^OP' THEN 'OP'::"SongType"
    WHEN "type" ~ '^ED' THEN 'ED'::"SongType"
    WHEN "type" ~ '^IN' THEN 'INSERT'::"SongType"
    ELSE 'OP'::"SongType"
  END,
  "sequence" = GREATEST(
    1,
    COALESCE(NULLIF(regexp_replace("type", '\D', '', 'g'), '')::INTEGER, 1)
  );

ALTER TABLE "Song" ALTER COLUMN "songType" SET NOT NULL;
ALTER TABLE "Song" DROP COLUMN "type";

-- Song: difficulty string → enum
ALTER TABLE "Song" ADD COLUMN "difficulty_new" "Difficulty" NOT NULL DEFAULT 'MEDIUM';

UPDATE "Song" SET "difficulty_new" = CASE LOWER("difficulty")
  WHEN 'easy' THEN 'EASY'::"Difficulty"
  WHEN 'hard' THEN 'HARD'::"Difficulty"
  ELSE 'MEDIUM'::"Difficulty"
END;

ALTER TABLE "Song" DROP COLUMN "difficulty";
ALTER TABLE "Song" RENAME COLUMN "difficulty_new" TO "difficulty";

-- Song: timestamps + cascade on anime
ALTER TABLE "Song" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Song" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Song" DROP CONSTRAINT IF EXISTS "Song_animeId_fkey";
ALTER TABLE "Song" ADD CONSTRAINT "Song_animeId_fkey"
  FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Anime: timestamps + franchise onDelete
ALTER TABLE "Anime" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Anime" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Anime" DROP CONSTRAINT IF EXISTS "Anime_franchiseId_fkey";
ALTER TABLE "Anime" ADD CONSTRAINT "Anime_franchiseId_fkey"
  FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Franchise: timestamps
ALTER TABLE "Franchise" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Franchise" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- PlayerAnimeList: timestamps
ALTER TABLE "PlayerAnimeList" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PlayerAnimeList" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- SongHistory: aggregate columns
ALTER TABLE "SongHistory" ADD COLUMN "playCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SongHistory" ADD COLUMN "correctCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SongHistory" ADD COLUMN "lastPlayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "SongHistory" SET "lastPlayedAt" = "listenedAt" WHERE "listenedAt" IS NOT NULL;

ALTER TABLE "SongHistory" DROP COLUMN "listenedAt";

-- Indexes (advisor-confirmed FK / hot columns)
CREATE INDEX "Anime_franchiseId_idx" ON "Anime"("franchiseId");
CREATE INDEX "Anime_popularity_idx" ON "Anime"("popularity" DESC);

CREATE INDEX "Song_animeId_idx" ON "Song"("animeId");
CREATE INDEX "Song_downloadStatus_idx" ON "Song"("downloadStatus");
CREATE INDEX "Song_difficulty_idx" ON "Song"("difficulty");

CREATE INDEX "SongHistory_songId_idx" ON "SongHistory"("songId");

CREATE INDEX "PlayerAnimeList_animeId_idx" ON "PlayerAnimeList"("animeId");

CREATE INDEX "GameParticipant_profileId_idx" ON "GameParticipant"("profileId");
CREATE INDEX "GameParticipant_gameId_idx" ON "GameParticipant"("gameId");

CREATE INDEX "Profile_xp_level_idx" ON "Profile"("xp" DESC, "level" DESC);
CREATE INDEX "Profile_gamesWon_idx" ON "Profile"("gamesWon" DESC);
