-- Phase 9.1: defense-in-depth RLS on server-only tables + revoke client write on catalogue.

ALTER TABLE "Friendship" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Match" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MatchPlayer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MatchRound" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoundAnswer" ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "Anime" FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "Song" FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "Franchise" FROM anon, authenticated;

REVOKE UPDATE, DELETE ON "Profile" FROM anon, authenticated;
