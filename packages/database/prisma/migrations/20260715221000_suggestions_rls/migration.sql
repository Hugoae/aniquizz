-- Suggestions are server-only: Express validates every read and mutation.

ALTER TABLE "Suggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SuggestionVote" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "Suggestion" FROM anon, authenticated;
REVOKE ALL ON "SuggestionVote" FROM anon, authenticated;
