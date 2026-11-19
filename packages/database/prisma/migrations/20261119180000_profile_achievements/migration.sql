-- Profile achievements. Server-written only. Ids are catalogue strings, not an enum,
-- so a new success does not need a migration.

CREATE TABLE IF NOT EXISTS "ProfileAchievement" (
  "profileId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "xpAwarded" INTEGER NOT NULL,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProfileAchievement_pkey" PRIMARY KEY ("profileId", "achievementId")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProfileAchievement_profileId_fkey'
  ) THEN
    ALTER TABLE "ProfileAchievement"
      ADD CONSTRAINT "ProfileAchievement_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ProfileAchievement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ProfileAchievement" FROM anon, authenticated;
