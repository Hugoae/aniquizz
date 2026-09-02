-- Leaderboard v26.4: ranking indexes for games played, streak, and eligible accuracy.

CREATE INDEX IF NOT EXISTS "Profile_gamesPlayed_idx" ON "Profile"("gamesPlayed" DESC);
CREATE INDEX IF NOT EXISTS "Profile_maxStreak_idx" ON "Profile"("maxStreak" DESC);

-- Expression index used by GET /leaderboard?metric=accuracy (50-round gate, bots excluded).
CREATE INDEX IF NOT EXISTS "Profile_accuracy_eligible_idx"
ON "Profile" ((("correctGuesses")::double precision / NULLIF("totalGuesses", 0)) DESC, "totalGuesses" DESC)
WHERE "totalGuesses" >= 50 AND id NOT LIKE 'bot-%';
