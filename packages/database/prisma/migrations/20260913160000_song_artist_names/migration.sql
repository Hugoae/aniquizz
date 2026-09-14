-- Structured artist credits for future artist-precision answers.
-- Display `artist` is unchanged; `artistNames` holds atomic people/units.

ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "artistNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
