-- Persist each day's leaderboard standing on the attempt ledger.

ALTER TABLE "DailyAttempt"
  ADD COLUMN IF NOT EXISTS "rank" INTEGER;

UPDATE "DailyAttempt" AS attempt
SET "rank" = ranked.rank
FROM (
  SELECT
    id,
    RANK() OVER (
      PARTITION BY "challengeId"
      ORDER BY "correctCount" DESC, "totalResponseMs" ASC
    )::int AS rank
  FROM "DailyAttempt"
  WHERE "state" IN ('COMPLETED', 'FORFEITED', 'EXPIRED')
) AS ranked
WHERE attempt.id = ranked.id;
