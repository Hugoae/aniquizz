-- Rules snapshot for the history "play again" button. Nullable so older matches stay valid.
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "configSnapshot" JSONB;
