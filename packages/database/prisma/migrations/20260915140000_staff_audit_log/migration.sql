-- Staff moderation journal: who muted / banned / changed a role, with duration.
-- Server-only (RLS on, no anon/authenticated grants) — Express owns reads and writes.

CREATE TYPE "StaffAuditAction" AS ENUM (
  'MUTE',
  'UNMUTE',
  'BAN',
  'UNBAN',
  'ROLE_CHANGE',
  'DISCONNECT'
);

CREATE TABLE "StaffAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorUsername" TEXT NOT NULL,
    "targetId" TEXT,
    "targetUsername" TEXT NOT NULL,
    "action" "StaffAuditAction" NOT NULL,
    "durationMinutes" INTEGER,
    "fromRole" "UserRole",
    "toRole" "UserRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffAuditLog_createdAt_idx" ON "StaffAuditLog"("createdAt" DESC);
CREATE INDEX "StaffAuditLog_actorId_createdAt_idx" ON "StaffAuditLog"("actorId", "createdAt" DESC);
CREATE INDEX "StaffAuditLog_targetId_createdAt_idx" ON "StaffAuditLog"("targetId", "createdAt" DESC);
CREATE INDEX "StaffAuditLog_action_createdAt_idx" ON "StaffAuditLog"("action", "createdAt" DESC);

ALTER TABLE "StaffAuditLog" ADD CONSTRAINT "StaffAuditLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffAuditLog" ADD CONSTRAINT "StaffAuditLog_targetId_fkey"
    FOREIGN KEY ("targetId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StaffAuditLog" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "StaffAuditLog" FROM anon, authenticated;
