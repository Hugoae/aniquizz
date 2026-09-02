-- Profile showcase: up to 10 user-picked favorites (pinOrder 1–10 on SongLike).

ALTER TABLE "SongLike" ADD COLUMN "pinOrder" INTEGER;

CREATE UNIQUE INDEX "SongLike_profileId_pinOrder_key" ON "SongLike"("profileId", "pinOrder");

CREATE INDEX "SongLike_profileId_pinOrder_idx" ON "SongLike"("profileId", "pinOrder");
