-- Phase 7: XP win-streak bonus — consecutive won matches counter on Profile

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "currentWinStreak" INTEGER NOT NULL DEFAULT 0;
