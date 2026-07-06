-- Phase 5: match persistence models (replace GameSession/GameParticipant)

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('STANDARD');
CREATE TYPE "MatchStatus" AS ENUM ('IN_PROGRESS', 'FINISHED', 'ABANDONED');
CREATE TYPE "AnswerType" AS ENUM ('TYPING', 'QCM', 'DUO');

-- Drop legacy game tables (empty; replaced by Match/MatchPlayer/MatchRound/RoundAnswer)
DROP TABLE IF EXISTS "GameParticipant";
DROP TABLE IF EXISTS "GameSession";

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "mode" "GameMode" NOT NULL DEFAULT 'STANDARD',
    "status" "MatchStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalRounds" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchPlayer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MatchPlayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchRound" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "songId" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoundAnswer" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "matchPlayerId" TEXT NOT NULL,
    "answer" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "answerType" "AnswerType" NOT NULL,
    "timeMs" INTEGER,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

CREATE INDEX "MatchPlayer_profileId_idx" ON "MatchPlayer"("profileId");
CREATE UNIQUE INDEX "MatchPlayer_matchId_profileId_key" ON "MatchPlayer"("matchId", "profileId");

CREATE INDEX "MatchRound_songId_idx" ON "MatchRound"("songId");
CREATE UNIQUE INDEX "MatchRound_matchId_roundNumber_key" ON "MatchRound"("matchId", "roundNumber");

CREATE INDEX "RoundAnswer_matchPlayerId_idx" ON "RoundAnswer"("matchPlayerId");
CREATE UNIQUE INDEX "RoundAnswer_roundId_matchPlayerId_key" ON "RoundAnswer"("roundId", "matchPlayerId");

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchRound" ADD CONSTRAINT "MatchRound_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchRound" ADD CONSTRAINT "MatchRound_songId_fkey"
  FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RoundAnswer" ADD CONSTRAINT "RoundAnswer_roundId_fkey"
  FOREIGN KEY ("roundId") REFERENCES "MatchRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoundAnswer" ADD CONSTRAINT "RoundAnswer_matchPlayerId_fkey"
  FOREIGN KEY ("matchPlayerId") REFERENCES "MatchPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
