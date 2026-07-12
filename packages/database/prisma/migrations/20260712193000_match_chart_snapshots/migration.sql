-- Match settings + solo medal snapshots for profile statistical charts (v26.2).

CREATE TYPE "StoredResponseType" AS ENUM ('TYPING', 'QCM', 'MIX');
CREATE TYPE "StoredPrecision" AS ENUM ('FRANCHISE', 'ANIME');
CREATE TYPE "StoredSoloMedal" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

ALTER TABLE "Match" ADD COLUMN "responseType" "StoredResponseType";
ALTER TABLE "Match" ADD COLUMN "precision" "StoredPrecision";

ALTER TABLE "MatchPlayer" ADD COLUMN "soloMedal" "StoredSoloMedal";

CREATE INDEX "Match_startedAt_idx" ON "Match"("startedAt" DESC);
