-- v26.6 Quiz du jour: server-only daily challenge, attempts, and streak stats.
-- Additive / idempotent. Manual apply on Supabase (no shadow DB).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DailyChallengeStatus') THEN
    CREATE TYPE "DailyChallengeStatus" AS ENUM ('DRAFT', 'READY', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DailyAttemptState') THEN
    CREATE TYPE "DailyAttemptState" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FORFEITED', 'EXPIRED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DailyChallenge" (
  "id" TEXT NOT NULL,
  "challengeDate" DATE NOT NULL,
  "challengeNumber" INTEGER NOT NULL,
  "status" "DailyChallengeStatus" NOT NULL DEFAULT 'DRAFT',
  "rulesVersion" INTEGER NOT NULL DEFAULT 1,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyChallenge_challengeDate_key" ON "DailyChallenge"("challengeDate");
CREATE UNIQUE INDEX IF NOT EXISTS "DailyChallenge_challengeNumber_key" ON "DailyChallenge"("challengeNumber");
CREATE INDEX IF NOT EXISTS "DailyChallenge_status_challengeDate_idx" ON "DailyChallenge"("status", "challengeDate");

CREATE TABLE IF NOT EXISTS "DailyChallengeRound" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "songId" INTEGER,
  "snapshot" JSONB NOT NULL,
  "videoStartTime" INTEGER NOT NULL,
  "choices" TEXT[] NOT NULL,
  "voided" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DailyChallengeRound_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyChallengeRound_challengeId_position_key"
  ON "DailyChallengeRound"("challengeId", "position");
CREATE INDEX IF NOT EXISTS "DailyChallengeRound_songId_idx" ON "DailyChallengeRound"("songId");

CREATE TABLE IF NOT EXISTS "DailyAttempt" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "state" "DailyAttemptState" NOT NULL DEFAULT 'IN_PROGRESS',
  "currentRound" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "currentRoundStartedAt" TIMESTAMP(3),
  "revealUntil" TIMESTAMP(3),
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "points" INTEGER NOT NULL DEFAULT 0,
  "totalResponseMs" INTEGER NOT NULL DEFAULT 0,
  "xpAwarded" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "DailyAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyAttempt_challengeId_profileId_key"
  ON "DailyAttempt"("challengeId", "profileId");
CREATE INDEX IF NOT EXISTS "DailyAttempt_profileId_startedAt_idx"
  ON "DailyAttempt"("profileId", "startedAt" DESC);
CREATE INDEX IF NOT EXISTS "DailyAttempt_challengeId_state_correctCount_totalResponseMs_completedAt_idx"
  ON "DailyAttempt"("challengeId", "state", "correctCount" DESC, "totalResponseMs", "completedAt");

CREATE TABLE IF NOT EXISTS "DailyAttemptAnswer" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "selectedLabel" TEXT,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "responseMs" INTEGER NOT NULL DEFAULT 0,
  "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DailyAttemptAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyAttemptAnswer_attemptId_roundId_key"
  ON "DailyAttemptAnswer"("attemptId", "roundId");
CREATE INDEX IF NOT EXISTS "DailyAttemptAnswer_roundId_idx" ON "DailyAttemptAnswer"("roundId");

CREATE TABLE IF NOT EXISTS "DailyPlayerStats" (
  "profileId" TEXT NOT NULL,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "longestStreak" INTEGER NOT NULL DEFAULT 0,
  "completions" INTEGER NOT NULL DEFAULT 0,
  "perfectDays" INTEGER NOT NULL DEFAULT 0,
  "lastCompletionDate" DATE,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DailyPlayerStats_pkey" PRIMARY KEY ("profileId")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyChallenge_reviewedById_fkey') THEN
    ALTER TABLE "DailyChallenge"
      ADD CONSTRAINT "DailyChallenge_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyChallengeRound_challengeId_fkey') THEN
    ALTER TABLE "DailyChallengeRound"
      ADD CONSTRAINT "DailyChallengeRound_challengeId_fkey"
      FOREIGN KEY ("challengeId") REFERENCES "DailyChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyChallengeRound_songId_fkey') THEN
    ALTER TABLE "DailyChallengeRound"
      ADD CONSTRAINT "DailyChallengeRound_songId_fkey"
      FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyAttempt_challengeId_fkey') THEN
    ALTER TABLE "DailyAttempt"
      ADD CONSTRAINT "DailyAttempt_challengeId_fkey"
      FOREIGN KEY ("challengeId") REFERENCES "DailyChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyAttempt_profileId_fkey') THEN
    ALTER TABLE "DailyAttempt"
      ADD CONSTRAINT "DailyAttempt_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyAttemptAnswer_attemptId_fkey') THEN
    ALTER TABLE "DailyAttemptAnswer"
      ADD CONSTRAINT "DailyAttemptAnswer_attemptId_fkey"
      FOREIGN KEY ("attemptId") REFERENCES "DailyAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyAttemptAnswer_roundId_fkey') THEN
    ALTER TABLE "DailyAttemptAnswer"
      ADD CONSTRAINT "DailyAttemptAnswer_roundId_fkey"
      FOREIGN KEY ("roundId") REFERENCES "DailyChallengeRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyPlayerStats_profileId_fkey') THEN
    ALTER TABLE "DailyPlayerStats"
      ADD CONSTRAINT "DailyPlayerStats_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "DailyChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyChallengeRound" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyAttemptAnswer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyPlayerStats" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "DailyChallenge" FROM anon, authenticated;
REVOKE ALL ON "DailyChallengeRound" FROM anon, authenticated;
REVOKE ALL ON "DailyAttempt" FROM anon, authenticated;
REVOKE ALL ON "DailyAttemptAnswer" FROM anon, authenticated;
REVOKE ALL ON "DailyPlayerStats" FROM anon, authenticated;
