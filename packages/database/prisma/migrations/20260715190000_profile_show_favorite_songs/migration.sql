-- Privacy: allow users to hide the favorites section from their public profile.

ALTER TABLE "Profile" ADD COLUMN "showFavoriteSongs" BOOLEAN NOT NULL DEFAULT true;
