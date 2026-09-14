-- Persist daily win/loss and the active-round denominator for profile history/stats.

ALTER TABLE "DailyAttempt"
  ADD COLUMN IF NOT EXISTS "activeRoundCount" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "DailyAttempt"
  ADD COLUMN IF NOT EXISTS "won" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DailyPlayerStats"
  ADD COLUMN IF NOT EXISTS "wins" INTEGER NOT NULL DEFAULT 0;

UPDATE "DailyAttempt"
SET "won" = ("correctCount" >= 3)
WHERE "state" IN ('COMPLETED', 'FORFEITED', 'EXPIRED');

UPDATE "DailyPlayerStats" AS stats
SET "wins" = src.wins
FROM (
  SELECT "profileId", COUNT(*)::int AS wins
  FROM "DailyAttempt"
  WHERE "won" = true
  GROUP BY "profileId"
) AS src
WHERE stats."profileId" = src."profileId";

CREATE INDEX IF NOT EXISTS "DailyAttempt_profileId_state_completedAt_idx"
  ON "DailyAttempt"("profileId", "state", "completedAt" DESC);
