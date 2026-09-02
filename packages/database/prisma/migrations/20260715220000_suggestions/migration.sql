-- Suggestions board (v26.4): structured community feedback and unique upvotes.

CREATE TYPE "SuggestionCategory" AS ENUM ('IMPROVEMENT', 'SONG_REQUEST', 'CORRECTION', 'OTHER');
CREATE TYPE "SuggestionStatus" AS ENUM ('OPEN', 'PLANNED', 'DONE', 'REJECTED');
CREATE TYPE "SuggestionCorrectionField" AS ENUM ('TITLE', 'ARTIST', 'DIFFICULTY', 'OTHER');

CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "category" "SuggestionCategory" NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'OPEN',
    "statusRank" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "songId" INTEGER,
    "correctionField" "SuggestionCorrectionField",
    "proposedValue" TEXT,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "adminReply" TEXT,
    "adminRepliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SuggestionVote" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuggestionVote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Suggestion_statusRank_voteCount_createdAt_idx"
    ON "Suggestion"("statusRank", "voteCount" DESC, "createdAt" DESC);
CREATE INDEX "Suggestion_category_status_idx" ON "Suggestion"("category", "status");
CREATE INDEX "Suggestion_authorId_createdAt_idx" ON "Suggestion"("authorId", "createdAt" DESC);
CREATE INDEX "Suggestion_songId_idx" ON "Suggestion"("songId");
CREATE UNIQUE INDEX "SuggestionVote_suggestionId_profileId_key"
    ON "SuggestionVote"("suggestionId", "profileId");
CREATE INDEX "SuggestionVote_profileId_createdAt_idx"
    ON "SuggestionVote"("profileId", "createdAt" DESC);

ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_songId_fkey"
    FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SuggestionVote" ADD CONSTRAINT "SuggestionVote_suggestionId_fkey"
    FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SuggestionVote" ADD CONSTRAINT "SuggestionVote_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
