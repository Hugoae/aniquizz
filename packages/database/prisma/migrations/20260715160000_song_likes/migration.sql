-- Song likes (v26.4): user-curated favorites, cascade with Profile/Song.

CREATE TABLE IF NOT EXISTS "SongLike" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "songId" INTEGER NOT NULL,
    "likedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SongLike_profileId_songId_key" ON "SongLike"("profileId", "songId");
CREATE INDEX IF NOT EXISTS "SongLike_profileId_likedAt_idx" ON "SongLike"("profileId", "likedAt" DESC);
CREATE INDEX IF NOT EXISTS "SongLike_songId_idx" ON "SongLike"("songId");

DO $$ BEGIN
  ALTER TABLE "SongLike" ADD CONSTRAINT "SongLike_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SongLike" ADD CONSTRAINT "SongLike_songId_fkey"
    FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
