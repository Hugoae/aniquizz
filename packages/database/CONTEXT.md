# Context — `@aniquizz/database`

**Role:** Owns the Prisma schema, the shared Prisma client (`prisma`), and the ETL media
pipeline that builds the song catalogue: **AniList → AnimeThemes → Postgres → Cloudflare R2**.
Both apps import the client; only this package runs migrations and pipeline scripts.

See [`README.md`](./README.md) for the full pipeline, scripts, and R2 workflows.

## Glossary

| Term | Definition | Where |
|------|------------|-------|
| **Franchise / Anime / Song** | Catalogue hierarchy: a Franchise groups Animes (seasons); a Song is one opening/ending with a video. | `prisma/schema.prisma` |
| **Precision** | Same concept as gameplay: `franchise` matches the whole franchise, `anime` matches the exact season. | schema + shared |
| **difficulty** | Per-song grade derived from AniList popularity (step 1); feeds medal thresholds. | `scripts/1_fetch_anilist.ts` |
| **`videoKey`** | R2 object key for a song's MP4 (the canonical media identifier). | schema, `lib/r2-client` |
| **`sourceUrl`** | AnimeThemes download URL while `PENDING`; becomes the public R2 URL once `COMPLETED`. | schema |
| **status** | Song lifecycle: `PENDING` (metadata only) → `COMPLETED` (media on R2). | schema, step 4 |
| **`isLocked`** | Freeze flag on Franchise/Anime/Song — preserves manual edits (titles, difficulty) across re-fetches. | schema, `manual_edits.json` |
| **manual_edits.json** | Source of truth for manual titles/tags/locks; exported from and imported back to the DB. | `data/` |
| **pipeline_exclusions.json** | Permanent blocklist of anime ids / song ids / videoKeys to never re-add. | `data/` |
| **Pipeline steps 1–4** | metadata → AnimeThemes match → upsert (PENDING) → download/compress/upload to R2 (COMPLETED). | `scripts/` |

## Known pitfalls

- **Migrations are manual on Supabase.** `prisma migrate dev` fails (no shadow DB, P1001).
  Author `prisma/migrations/<ts>_<name>/migration.sql` by hand (additive/idempotent),
  `npx prisma db execute --file …`, then `migrate resolve --applied <ts>_<name>` and
  `prisma generate`. Confirm with `migrate status`.
- **Pipeline steps are idempotent and lock-aware.** They upsert by AniList id / videoKey
  and never overwrite `isLocked` rows. Export locks (`export_db_to_json.ts`) **before**
  scaling `ANILIST_LIMIT` up (e.g. 30 → 500).
- **Exclusions don't delete existing rows.** Adding to `pipeline_exclusions.json` only
  blocks future runs; remove already-loaded rows once by hand.
- **`reset_all.ts` is destructive** — wipes the DB catalogue, empties the R2 bucket, and
  deletes local JSON. Never run against production data casually.
- **Media live on R2, not the DB.** A song can be `COMPLETED` in Postgres yet corrupt/missing
  on R2 — use `pnpm r2:scan` and `repair_video.ts` to reconcile.
- **Regenerate the client after schema changes** (`pnpm db:generate` at the root) so both
  apps see new fields — otherwise the server sees stale Prisma types.
