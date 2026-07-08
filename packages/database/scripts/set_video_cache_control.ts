import path from "path";
import dotenv from "dotenv";
import { createR2Client, getR2Bucket, r2BackfillCacheControl } from "./lib/r2-client";

dotenv.config({ path: path.join(__dirname, "../.env") });

/**
 * One-off backfill: set an immutable Cache-Control on every existing R2 video so
 * previously-uploaded clips become browser/CDN cacheable (new uploads already get
 * the header via `r2UploadFile`). Safe to re-run — it just rewrites the metadata.
 */
async function main(): Promise<void> {
  const client = createR2Client();
  const bucket = getR2Bucket();

  console.log(`Backfilling Cache-Control on all objects in "${bucket}"…`);
  const updated = await r2BackfillCacheControl(client, bucket);
  console.log(`Done. Updated ${updated} object(s).`);
}

main().catch((error) => {
  console.error("Cache-Control backfill failed:", error);
  process.exit(1);
});
