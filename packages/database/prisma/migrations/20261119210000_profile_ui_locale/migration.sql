-- Explicit UI language. Null means the client follows the browser.

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "uiLocale" TEXT;
