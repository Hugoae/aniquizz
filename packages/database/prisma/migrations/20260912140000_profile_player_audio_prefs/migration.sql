-- Player audio prefs: volume (0–100) and mute, synced across devices.

ALTER TABLE "Profile" ADD COLUMN "audioVolume" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "Profile" ADD COLUMN "audioMuted" BOOLEAN NOT NULL DEFAULT false;
