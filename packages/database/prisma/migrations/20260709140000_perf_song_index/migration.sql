-- Phase 10.8 perf: composite index for the playlist candidate scan.
-- The selection query always filters downloadStatus = 'COMPLETED', usually by
-- songType (OP/ED) and per-cascade difficulty. Additive / non-destructive.

CREATE INDEX IF NOT EXISTS "Song_downloadStatus_songType_difficulty_idx"
  ON "Song" ("downloadStatus", "songType", "difficulty");
