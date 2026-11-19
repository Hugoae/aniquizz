-- v26.9 Song of the day: one shared discovery clip per Paris date. Server-only.

CREATE TABLE IF NOT EXISTS "SongOfTheDay" (
  "id" TEXT NOT NULL,
  "featuredDate" DATE NOT NULL,
  "songId" INTEGER NOT NULL,
  "videoStartTime" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SongOfTheDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SongOfTheDay_featuredDate_key" ON "SongOfTheDay"("featuredDate");
CREATE INDEX IF NOT EXISTS "SongOfTheDay_songId_idx" ON "SongOfTheDay"("songId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SongOfTheDay_songId_fkey') THEN
    ALTER TABLE "SongOfTheDay"
      ADD CONSTRAINT "SongOfTheDay_songId_fkey"
      FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "SongOfTheDay" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "SongOfTheDay" FROM anon, authenticated;
