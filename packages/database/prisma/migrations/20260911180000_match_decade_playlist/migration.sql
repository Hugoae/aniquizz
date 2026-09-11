-- v26.5: persist decade overlay separately so Shonen ∩ 2010s is not stored as Shonen-only.
-- Additive / idempotent. Manual apply on Supabase (no shadow DB).

ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "decadePlaylistId" TEXT;

CREATE INDEX IF NOT EXISTS "Match_decadePlaylistId_idx" ON "Match"("decadePlaylistId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Match_decadePlaylistId_fkey'
  ) THEN
    ALTER TABLE "Match"
      ADD CONSTRAINT "Match_decadePlaylistId_fkey"
      FOREIGN KEY ("decadePlaylistId") REFERENCES "ThematicPlaylist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
