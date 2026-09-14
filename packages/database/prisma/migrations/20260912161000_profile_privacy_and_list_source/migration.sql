-- Privacy audiences + dual AniList/MAL links with one active source.

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "onlineStatusAudience" TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "matchHistoryAudience" TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "lobbyInviteAudience" TEXT NOT NULL DEFAULT 'friends';
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "activeListProvider" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "anilistLastSync" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "malLastSync" TIMESTAMP(3);

-- Historical priority: AniList wins when both usernames exist.
UPDATE "Profile"
SET "activeListProvider" = CASE
  WHEN "anilistUsername" IS NOT NULL AND btrim("anilistUsername") <> '' THEN 'anilist'
  WHEN "malUsername" IS NOT NULL AND btrim("malUsername") <> '' THEN 'mal'
  ELSE NULL
END
WHERE "activeListProvider" IS NULL;

UPDATE "Profile"
SET "anilistLastSync" = "lastListSync"
WHERE "anilistLastSync" IS NULL
  AND "lastListSync" IS NOT NULL
  AND "anilistUsername" IS NOT NULL
  AND btrim("anilistUsername") <> '';

UPDATE "Profile"
SET "malLastSync" = "lastListSync"
WHERE "malLastSync" IS NULL
  AND "lastListSync" IS NOT NULL
  AND "malUsername" IS NOT NULL
  AND btrim("malUsername") <> ''
  AND ("anilistUsername" IS NULL OR btrim("anilistUsername") = '');
