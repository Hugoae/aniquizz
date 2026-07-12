# @aniquizz/database

Prisma schema, the shared Prisma client, and the ETL media pipeline that builds
the song catalogue: **AniList → AnimeThemes → Postgres → Cloudflare R2**.

## Layout

```
packages/database/
├── prisma/
│   ├── migrations/             <-- Prisma migration history
│   └── schema.prisma           <-- DB schema (tables, relations, enums)
│
├── src/                        <-- Package entry (shared Prisma client + bot helpers)
│   ├── index.ts                <-- exports `prisma` + @prisma/client types
│   ├── bots.ts / botCleanup.ts <-- DEV bot roster + history cleanup
│
├── data/                       <-- Pipeline I/O (JSON). Large files are gitignored.
│   ├── manual_edits.json       <-- DB snapshot for manual edits (titles/tags/locks) — source of truth
│   ├── pipeline_exclusions.json <-- Permanent blocklist (anime ids + song ids / videoKeys)
│   ├── data_step1.json         <-- Step 1 output (AniList metadata)
│   ├── data_step2.json         <-- Step 2 output (+ AnimeThemes song URLs)
│   └── animethemes_cache.json  <-- Step 2 cache (raw AnimeThemes responses, keyed by AniList id)
│
└── scripts/
    ├── 1_fetch_anilist.ts      <-- Step 1: metadata (franchises, animes, popularity → difficulty)
    ├── 2_fetch_animethemes.ts  <-- Step 2: match openings + video URLs on AnimeThemes
    ├── 3_load_initial_data.ts  <-- Step 3: upsert Franchise/Anime/Song into Postgres (status PENDING)
    ├── 4_sync_storage.ts       <-- Step 4: worker — download → compress (ffmpeg) → upload to R2 → COMPLETED
    ├── global_build.ts         <-- Orchestrates steps 1 → 2 → 3 → 4
    ├── export_db_to_json.ts    <-- Dump DB tree to data/manual_edits.json (edit titles/tags/locks)
    ├── import_edits_to_db.ts   <-- Apply data/manual_edits.json back into the DB
    ├── reset_all.ts            <-- DANGER: wipe DB catalogue + empty R2 bucket + delete local JSON
    ├── seed_db.ts              <-- Reset + refill catalogue metadata from JSON (no downloads)
    ├── seed_dev_catalogue.ts   <-- DEV: quickly put a few playable openings on R2 (COMPLETED)
    ├── set_video_cache_control.ts <-- One-off: backfill immutable Cache-Control on all R2 objects
    └── lib/                    <-- r2-client, media (ffmpeg), song-helpers, pipeline-schemas (zod)
```

Media are hosted on **Cloudflare R2** (S3-compatible). `Song.videoKey` is the R2
object key; `Song.sourceUrl` holds the AnimeThemes download URL while PENDING and
the public R2 URL once COMPLETED.

## Setup

Copy `.env.example` to `.env` and fill `DATABASE_URL` + the `R2_*` credentials.
All commands run from `packages/database/` (or via `pnpm --filter @aniquizz/database <script>`).

## Repopulate the catalogue (controllable size)

The catalogue is fetched **most-popular-first**, so a small run gives you the
best-known anime. Scale up later — steps are idempotent (upsert by AniList id /
video key) and respect `isLocked` rows.

```bash
# Small first run (top ~30 most popular):
ANILIST_LIMIT=30 npx ts-node scripts/1_fetch_anilist.ts
npx ts-node scripts/2_fetch_animethemes.ts        # uses the local cache, fast
npx ts-node scripts/3_load_initial_data.ts        # loads songs as PENDING (AnimeThemes source)
WORKER_SOURCE_INCLUDE=animethemes.moe npx ts-node scripts/4_sync_storage.ts

# Later, a bigger run (top 500) — same commands with a larger limit:
ANILIST_LIMIT=500 npx ts-node scripts/1_fetch_anilist.ts
# ... then steps 2, 3, 4 again.
```

### Fast incremental re-run (skip sequel walks)

Sequel expansion (locked franchises + new top entries) is the slowest part of
step 1: one AniList request plus `ANILIST_DELAY_MS` per hop in the chain. After a
recent full run, skip it when you only want to refresh the popularity top:

```bash
# Skip all sequel walks (locked + new franchises)
ANILIST_SKIP_SEQUELS=1 ANILIST_LIMIT=500 npx ts-node scripts/1_fetch_anilist.ts

# Or skip only one side:
ANILIST_SKIP_LOCKED_SEQUELS=1 npx ts-node scripts/1_fetch_anilist.ts   # phase 1b
ANILIST_SKIP_NEW_SEQUELS=1 npx ts-node scripts/1_fetch_anilist.ts      # phase 4
```

Prequel expansion (phase 2b) still runs — it fills earlier seasons missing from
the top list. Do **not** skip sequels on a weekly/monthly full sync or right
after a major new season release; you may miss freshly published sequels.

`WORKER_SOURCE_INCLUDE=animethemes.moe` makes the worker only download freshly
resolved AnimeThemes sources and skip any stale ones (e.g. rows left over from
the retired Supabase storage bucket).

Or run the whole thing in one shot:

```bash
ANILIST_LIMIT=30 npx ts-node scripts/global_build.ts
```

### Song types (openings / endings)

Step 2 imports **openings only** by default. Add endings (or inserts) with
`SONG_TYPES`:

```bash
SONG_TYPES=OP,ED npx ts-node scripts/2_fetch_animethemes.ts
```

The AnimeThemes cache stores **every** theme (OP + ED) regardless of this
setting, so switching from `OP` to `OP,ED` later only re-parses the cache — no
re-fetch. Step 2 picks the best video per theme (creditless first, then highest
resolution) and records the episode range into `Song.episodeRange`.

### Enriched metadata

Step 1 also stores, per anime: `idMal` (MyAnimeList id, provided directly by
AniList — no matching needed), `coverColor`, `bannerImage`, `description`,
`season`, `episodes`, and `averageScore`. All are nullable and additive.

### Locks and upgrades (30 → 500)

`isLocked` on a Franchise / Anime / Song freezes it against re-fetches
(manual titles, difficulty, etc. are preserved). Locks live in the DB.

**Step 1 lock sources (priority):**

1. `data/manual_edits.json` — export before a bigger run (recommended).
2. **Database fallback** — if the JSON file is missing or has no locked franchises,
   step 1 loads `Franchise.isLocked` rows directly from Postgres.

```bash
# Check what step 1 will protect (no AniList fetch)
pnpm --filter @aniquizz/database pipeline:check-locks

# 1. Freeze current locks + manual edits into manual_edits.json
npx ts-node scripts/export_db_to_json.ts
# 2. Bigger run — locked rows are preserved, new seasons/animes are added
ANILIST_LIMIT=500 npx ts-node scripts/1_fetch_anilist.ts
npx ts-node scripts/2_fetch_animethemes.ts
npx ts-node scripts/3_load_initial_data.ts
WORKER_SOURCE_INCLUDE=animethemes.moe npx ts-node scripts/4_sync_storage.ts
```

Locked franchises also get their **newly-released sequels** auto-appended (as
unlocked seasons) while keeping the existing locked seasons untouched.

If the database still has locked franchises but step 1 cannot load them, the
script aborts (or prompts on a TTY). Set `PIPELINE_ALLOW_UNPROTECTED=1` only for
intentional clean rebuilds.

### Quick dev sample (no full pipeline)

```bash
DEV_SEED_LIMIT=50 npx ts-node scripts/seed_dev_catalogue.ts
```

Downloads a handful of openings straight from AnimeThemes to R2 and marks them
COMPLETED — enough to exercise the game loop.

## Manual edits

```bash
npx ts-node scripts/export_db_to_json.ts   # dump DB -> data/manual_edits.json
# edit titles / tags / difficulty / isLocked in the JSON
npx ts-node scripts/import_edits_to_db.ts  # apply edits back to the DB
```

### Permanent exclusions (anime + songs)

Some seasons (OVAs, specials without OP) or bad song matches should never come back
after a re-fetch. Add them to `data/pipeline_exclusions.json`:

```json
{
  "animeIds": [204356],
  "songIds": [9457],
  "videoKeys": ["ONEPIECE-21-OP1.mp4"],
  "_comments": {
    "204356": "Boku no Hero Academia No. 170+1: More — no OP",
    "9457": "One Piece generic theme — not a real OP"
  }
}
```

- **animeIds** — Step 1 skips these AniList ids everywhere (top fetch, prequel/sequel
  expansion, locked-franchise sequel walk).
- **songIds** / **videoKeys** — Steps 2–3 skip these songs (match by DB id or
  canonical `videoKey`). Use `videoKey` when the song is not in the DB yet.

`_comments` is optional documentation for humans.

**One-time cleanup:** exclusions do not delete rows already in Postgres. Remove the
anime or song from the DB once (Prisma Studio or admin), then rely on the blocklist for
future pipeline runs. Also remove unwanted songs from `manual_edits.json` before
`import_edits_to_db.ts` — import never deletes missing rows.

```bash
pnpm pipeline:check-locks   # lists locked + excluded ids
```

## Danger zone

```bash
npx ts-node scripts/reset_all.ts   # wipes DB catalogue + empties the R2 bucket + deletes local JSON
```

## Other

```bash
npx prisma studio                  # visual DB browser
pnpm r2:scan                       # verify all COMPLETED MP4s on R2 (ffmpeg decode check)
pnpm r2:cache-control              # backfill immutable Cache-Control on R2 objects
```

### R2 integrity & repair

After a full catalogue sync, scan every `COMPLETED` song against the R2 bucket:

```bash
pnpm r2:scan
# Report: data/r2-integrity-report.json (gitignored)
# Exit code 1 if corrupt/missing/orphan keys exist
```

Repair a corrupt song by re-downloading from AnimeThemes:

```bash
pnpm exec ts-node scripts/repair_video.ts <songId> [songId...]
```

Delete orphan R2 keys:

```bash
pnpm exec ts-node scripts/delete_r2_keys.ts <videoKey.mp4> [...]
```

### Migrations (Supabase-safe workflow)

`prisma migrate dev` needs a **shadow database** that the Supabase direct
connection blocks (fails with P1001), so do **not** use it against the remote DB.
Instead:

```bash
# 1. Edit prisma/schema.prisma, then create a migration folder + SQL by hand:
#    prisma/migrations/<timestamp>_<name>/migration.sql   (additive/idempotent SQL)
# 2. Apply the SQL to the remote DB:
npx prisma db execute --file prisma/migrations/<timestamp>_<name>/migration.sql --schema prisma/schema.prisma
# 3. Record it as applied (no re-run) and regenerate the client:
npx prisma migrate resolve --applied <timestamp>_<name>
npx prisma generate
# 4. Confirm:
npx prisma migrate status          # -> "Database schema is up to date!"
```

`prisma migrate deploy` also works for already-authored migrations. To use
`migrate dev` you need a local shadow DB (set `shadowDatabaseUrl`).
