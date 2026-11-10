-- Optional first-time walk through game setup sections. On by default.

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "configWalkthrough" BOOLEAN NOT NULL DEFAULT true;
