-- Answer stings can be muted without muting the whole game.

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "answerSounds" BOOLEAN NOT NULL DEFAULT true;
