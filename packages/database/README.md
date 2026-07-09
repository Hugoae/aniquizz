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
(manual titles, difficulty, etc. are preserved). Locks live in the DB, but
**step 1 reads them from `data/manual_edits.json`** — so always export before a
bigger run:

```bash
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

## Danger zone

```bash
npx ts-node scripts/reset_all.ts   # wipes DB catalogue + empties the R2 bucket + deletes local JSON
```

## Other

```bash
npx prisma studio                  # visual DB browser
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
