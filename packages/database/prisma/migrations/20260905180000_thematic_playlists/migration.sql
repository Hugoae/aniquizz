-- v26.6 thematic playlists: staff packs (recipe + frozen snapshot) and match FK.
-- Additive / idempotent. Manual apply on Supabase (no shadow DB).

CREATE TABLE IF NOT EXISTS "ThematicPlaylist" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL DEFAULT 'theme',
  "recipe" JSONB NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "snapshotAt" TIMESTAMP(3),
  "snapshotCount" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ThematicPlaylist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ThematicPlaylist_slug_key" ON "ThematicPlaylist"("slug");
CREATE INDEX IF NOT EXISTS "ThematicPlaylist_isPublished_sortOrder_idx"
  ON "ThematicPlaylist"("isPublished", "sortOrder");

CREATE TABLE IF NOT EXISTS "ThematicPlaylistSong" (
  "playlistId" TEXT NOT NULL,
  "songId" INTEGER NOT NULL,

  CONSTRAINT "ThematicPlaylistSong_pkey" PRIMARY KEY ("playlistId", "songId")
);

CREATE INDEX IF NOT EXISTS "ThematicPlaylistSong_songId_idx" ON "ThematicPlaylistSong"("songId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ThematicPlaylistSong_playlistId_fkey'
  ) THEN
    ALTER TABLE "ThematicPlaylistSong"
      ADD CONSTRAINT "ThematicPlaylistSong_playlistId_fkey"
      FOREIGN KEY ("playlistId") REFERENCES "ThematicPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ThematicPlaylistSong_songId_fkey'
  ) THEN
    ALTER TABLE "ThematicPlaylistSong"
      ADD CONSTRAINT "ThematicPlaylistSong_songId_fkey"
      FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "playlistId" TEXT;

CREATE INDEX IF NOT EXISTS "Match_playlistId_idx" ON "Match"("playlistId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Match_playlistId_fkey'
  ) THEN
    ALTER TABLE "Match"
      ADD CONSTRAINT "Match_playlistId_fkey"
      FOREIGN KEY ("playlistId") REFERENCES "ThematicPlaylist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Franchise_genres_idx" ON "Franchise" USING GIN ("genres");
CREATE INDEX IF NOT EXISTS "Song_tags_idx" ON "Song" USING GIN ("tags");

ALTER TABLE "ThematicPlaylist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ThematicPlaylistSong" ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "ThematicPlaylist" FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "ThematicPlaylistSong" FROM anon, authenticated;
