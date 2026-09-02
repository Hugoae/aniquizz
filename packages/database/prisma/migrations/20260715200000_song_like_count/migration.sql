-- Denormalized like counter on Song (v26.4).

ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "likeCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Song" s
SET "likeCount" = sub.cnt
FROM (
  SELECT "songId", COUNT(*)::int AS cnt
  FROM "SongLike"
  GROUP BY "songId"
) sub
WHERE s.id = sub."songId";
