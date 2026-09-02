-- Align the accuracy ranking index with the query's numeric division.
-- Drop the unused maxStreak index (streak is no longer a public leaderboard metric).

DROP INDEX IF EXISTS "Profile_maxStreak_idx";
DROP INDEX IF EXISTS "Profile_accuracy_eligible_idx";

CREATE INDEX IF NOT EXISTS "Profile_accuracy_eligible_idx"
ON "Profile" ((("correctGuesses")::numeric / "totalGuesses") DESC, "totalGuesses" DESC)
WHERE "totalGuesses" >= 50 AND id NOT LIKE 'bot-%';
