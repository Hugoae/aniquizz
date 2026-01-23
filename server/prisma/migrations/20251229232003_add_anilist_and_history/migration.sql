/*
  Warnings:

  - You are about to drop the column `malUsername` on the `Profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Anime" ADD COLUMN     "coverImage" TEXT;

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "malUsername",
ADD COLUMN     "lastListSync" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SongHistory" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "songId" INTEGER NOT NULL,
    "listenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAnimeList" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "animeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "PlayerAnimeList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SongHistory_profileId_songId_key" ON "SongHistory"("profileId", "songId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAnimeList_profileId_animeId_key" ON "PlayerAnimeList"("profileId", "animeId");

-- AddForeignKey
ALTER TABLE "SongHistory" ADD CONSTRAINT "SongHistory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongHistory" ADD CONSTRAINT "SongHistory_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAnimeList" ADD CONSTRAINT "PlayerAnimeList_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAnimeList" ADD CONSTRAINT "PlayerAnimeList_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
