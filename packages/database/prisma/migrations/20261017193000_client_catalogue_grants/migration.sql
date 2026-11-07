-- Client roles (anon / authenticated) must not read media locators or insert profiles.
-- Table-level SELECT overrides a column REVOKE, so Song SELECT is revoked and
-- re-granted on every column except videoKey and sourceUrl.
-- Profile INSERT is revoked: handle_new_user() is SECURITY DEFINER and does not
-- need the grant. The old INSERT policy only checked id = auth.uid(), so a
-- missing profile row could be created with role = ADMIN.
-- reviewedById is the only foreign key without an index (ON DELETE SET NULL).

ALTER TABLE "Anime" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Franchise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Song" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SongHistory" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Animes" ON "Anime";
CREATE POLICY "Public Read Animes" ON "Anime" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Franchises" ON "Franchise";
CREATE POLICY "Public Read Franchises" ON "Franchise" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Songs" ON "Song";
CREATE POLICY "Public Read Songs" ON "Song" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can read own profile" ON "Profile";
CREATE POLICY "Users can read own profile" ON "Profile"
  FOR SELECT
  USING (((SELECT auth.uid() AS uid))::text = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON "Profile";

DROP POLICY IF EXISTS "View own history" ON "SongHistory";
CREATE POLICY "View own history" ON "SongHistory"
  FOR SELECT
  USING (((SELECT auth.uid() AS uid))::text = "profileId");

REVOKE INSERT ON TABLE "Profile" FROM anon, authenticated;

REVOKE SELECT ON TABLE "Song" FROM anon, authenticated;
GRANT SELECT (
  id,
  title,
  artist,
  "artistNames",
  "songType",
  sequence,
  tags,
  duration,
  difficulty,
  "episodeRange",
  "animeId",
  "isLocked",
  "downloadStatus",
  "errorLog",
  "likeCount",
  "createdAt",
  "updatedAt"
) ON TABLE "Song" TO anon, authenticated;

CREATE INDEX IF NOT EXISTS "DailyChallenge_reviewedById_idx"
  ON "DailyChallenge"("reviewedById");

NOTIFY pgrst, 'reload schema';
