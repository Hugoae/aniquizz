-- Phase 6: admin moderation fields + presence heartbeat on Profile

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "bannedUntil" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN "mutedUntil" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Profile_lastSeenAt_idx" ON "Profile"("lastSeenAt");
