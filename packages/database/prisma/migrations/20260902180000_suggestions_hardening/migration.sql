-- Harden suggestions: nullable anonymized author, staff lock, voteCount floor,
-- and a persistent HTTP rate-limit bucket table.

UPDATE "Suggestion" AS s
SET "voteCount" = COALESCE((
  SELECT COUNT(*)::int FROM "SuggestionVote" AS v WHERE v."suggestionId" = s.id
), 0);

ALTER TABLE "Suggestion" DROP CONSTRAINT "Suggestion_authorId_fkey";
ALTER TABLE "Suggestion" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Suggestion" ADD COLUMN "staffTreatedAt" TIMESTAMP(3);
UPDATE "Suggestion"
SET "staffTreatedAt" = COALESCE("adminRepliedAt", "updatedAt")
WHERE "status" <> 'OPEN' OR "adminReply" IS NOT NULL;

CREATE INDEX "Suggestion_staffTreatedAt_idx" ON "Suggestion"("staffTreatedAt");

ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_voteCount_nonnegative"
  CHECK ("voteCount" >= 0);

CREATE TABLE "HttpRateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HttpRateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "HttpRateLimitBucket_expiresAt_idx" ON "HttpRateLimitBucket"("expiresAt");
