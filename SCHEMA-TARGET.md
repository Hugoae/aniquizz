# Schema Target — AniQuizz

> Design reference for the database schema. **Design only** — implementation is spread across phases (see mapping at the bottom). The source of truth today is `packages/database/prisma/schema.prisma`; this document describes where it is going.

## Context & live-DB findings (verified via Supabase MCP, project `qjnfdhmvvledhtwwfrzb`)

- **All game tables are currently empty (0 rows)** and `_prisma_migrations` is empty. The baseline migration `20260705000000_init` exists locally but is **not yet recorded** as applied → resolving it is non-destructive.
- **Identity is already wired**: a `handle_new_user()` `SECURITY DEFINER` trigger inserts a `Profile` row using `new.id` (the `auth.users.id`). So `Profile.id` already equals the Supabase auth user id. The Prisma `@default(uuid())` on `Profile.id` is drift and must be removed (Phase 2).
- **RLS already partially configured** (from the old project): policies exist on `Profile`, `SongHistory`, `SongVote`, `PlayerAnimeList`; `GameSession`/`GameParticipant` have RLS enabled but no policies.
- **Advisor findings** (to fix in the relevant phases):
  - Performance: unindexed foreign keys on `Anime.franchiseId`, `Song.animeId`, `SongHistory.songId`, `SongVote.songId`, `PlayerAnimeList.animeId`, `GameParticipant.gameId`, `GameParticipant.profileId`.
  - Performance: RLS policies re-evaluate `auth.<fn>()` per row (`Profile`, `SongHistory`, `SongVote`, `PlayerAnimeList`) → wrap in `(select auth.<fn>())`.
  - Performance: duplicate permissive `SELECT` policies on `Profile` and `SongVote` → consolidate.
  - Security: `handle_new_user()` is executable by `anon`/`authenticated` via RPC → revoke `EXECUTE`.
  - Security: Auth "leaked password protection" disabled → enable.
  - Security: `_prisma_migrations` has RLS disabled (low risk — Prisma connects as superuser and bypasses RLS; enabling RLS with no policy closes anon read).

## Design principles

1. **Identity = `userId` (Supabase auth) everywhere**, never `socket.id`.
2. **Index hot columns** (Postgres does not auto-index FKs).
3. **Enums over `String`** for fixed value sets — *except* AniList-sourced free-ish fields (`Anime.format`, `Anime.status`, `PlayerAnimeList.status`) kept as `String` for flexibility.
4. **Timestamps everywhere** (`createdAt`/`updatedAt`).
5. **Explicit, consistent `onDelete`**.
6. **Schema comments in English** (project convention).

## Decisions log

| # | Decision | Choice |
|---|----------|--------|
| 1 | Per-round match detail (`MatchRound`/`RoundAnswer`) | **Yes** — heavier now, but reused later (replay, fine stats, speed mode) |
| 2 | `SongHistory` shape | **Aggregate** (`playCount`/`correctCount`/`lastPlayedAt`) — event-level detail already lives in `RoundAnswer`, so a history log would duplicate it |
| 3 | `SongVote` + `VoteType` | **Removed** (unused). Isolated table → trivial to re-add later via one migration |
| 4 | `Anime.format` / `Anime.status` (and `PlayerAnimeList.status`) | **Keep `String`** — flexible vs AniList values |
| 5 | `onDelete` for `Song → Anime` | **Cascade** — convenient for catalogue regeneration |

## Target schema

```prisma
// --- ENUMS ---
enum UserRole       { USER MODERATOR ADMIN }
enum DownloadStatus { PENDING PROCESSING COMPLETED ERROR SKIPPED }
enum SongType       { OP ED INSERT }
enum Difficulty     { EASY MEDIUM HARD }
enum GameMode       { STANDARD }              // SPEED (AMQ-style) added later
enum MatchStatus    { IN_PROGRESS FINISHED ABANDONED }
enum AnswerType     { TYPING QCM DUO }
enum FriendshipStatus { PENDING ACCEPTED BLOCKED }
// VoteType removed (SongVote dropped)

// --- IDENTITY ---
model Profile {
  id       String @id            // = auth.users.id (NO @default; fed by handle_new_user trigger or passed explicitly)
  username String @unique
  email    String @unique
  avatar   String @default("default_avatar.png")

  level Int @default(1)
  xp    Int @default(0)

  role        UserRole  @default(USER)
  bannedUntil DateTime?            // admin (Phase 6)
  mutedUntil  DateTime?            // admin (Phase 6)
  lastSeenAt  DateTime?            // presence for friends (Phase 7)

  anilistUsername String?
  lastListSync    DateTime?

  gamesPlayed    Int @default(0)
  gamesWon       Int @default(0)
  totalGuesses   Int @default(0)
  correctGuesses Int @default(0)
  maxStreak      Int @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  matchPlayers     MatchPlayer[]
  history          SongHistory[]
  animeList        PlayerAnimeList[]
  sentRequests     Friendship[] @relation("SentRequests")
  receivedRequests Friendship[] @relation("ReceivedRequests")

  @@index([xp(sort: Desc), level(sort: Desc)])   // leaderboard
  @@index([gamesWon(sort: Desc)])
  @@index([lastSeenAt])
}

// --- CATALOGUE ---
model Franchise {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  genres    String[]
  isLocked  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  animes    Anime[]
}

model Anime {
  id         Int      @id @default(autoincrement())
  name       String   @unique
  altNames   String[]
  siteUrl    String?
  studio     String?
  coverImage String?
  popularity Int      @default(0)
  tags       String[]
  format     String?              // AniList value, kept flexible
  status     String?              // AniList value, kept flexible
  seasonYear Int?
  franchiseId Int?
  isLocked   Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  franchise   Franchise? @relation(fields: [franchiseId], references: [id], onDelete: SetNull)
  songs       Song[]
  playerLists PlayerAnimeList[]

  @@index([franchiseId])
  @@index([popularity(sort: Desc)])
}

model Song {
  id        Int      @id @default(autoincrement())
  title     String
  artist    String
  songType  SongType             // was `type: String` ("OP1"...) → split into type + sequence
  sequence  Int      @default(1)
  videoKey  String   @unique     // R2 object key
  sourceUrl String?              // AnimeThemes URL, then R2 public URL after upload
  duration  Int?
  tags      String[]
  difficulty Difficulty @default(MEDIUM)
  episodeRange String?
  animeId   Int
  isLocked  Boolean  @default(false)
  downloadStatus DownloadStatus @default(PENDING)
  errorLog  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  anime   Anime @relation(fields: [animeId], references: [id], onDelete: Cascade)
  history SongHistory[]
  rounds  MatchRound[]

  @@index([animeId])
  @@index([downloadStatus])       // worker polls PENDING in a loop
  @@index([difficulty])
}

// --- MATCH PERSISTENCE (Phase 5, replaces GameSession/GameParticipant) ---
model Match {
  id          String      @id @default(uuid())
  mode        GameMode    @default(STANDARD)
  status      MatchStatus @default(IN_PROGRESS)
  totalRounds Int
  startedAt   DateTime    @default(now())
  endedAt     DateTime?

  players MatchPlayer[]
  rounds  MatchRound[]

  @@index([status])
}

model MatchPlayer {
  id           String  @id @default(uuid())
  matchId      String
  profileId    String
  score        Int     @default(0)
  rank         Int?
  isWinner     Boolean @default(false)
  correctCount Int     @default(0)
  xpEarned     Int     @default(0)

  match   Match   @relation(fields: [matchId], references: [id], onDelete: Cascade)
  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  answers RoundAnswer[]

  @@unique([matchId, profileId])
  @@index([profileId])
}

model MatchRound {
  id          String   @id @default(uuid())
  matchId     String
  roundNumber Int
  songId      Int?                       // nullable so a deleted song doesn't wipe match history
  startedAt   DateTime @default(now())

  match   Match @relation(fields: [matchId], references: [id], onDelete: Cascade)
  song    Song? @relation(fields: [songId], references: [id], onDelete: SetNull)
  answers RoundAnswer[]

  @@unique([matchId, roundNumber])
  @@index([songId])
}

model RoundAnswer {
  id            String     @id @default(uuid())
  roundId       String
  matchPlayerId String
  answer        String?
  isCorrect     Boolean    @default(false)
  answerType    AnswerType
  timeMs        Int?                       // time-to-answer (stats + future speed mode)
  pointsAwarded Int        @default(0)
  answeredAt    DateTime   @default(now())

  round       MatchRound  @relation(fields: [roundId], references: [id], onDelete: Cascade)
  matchPlayer MatchPlayer @relation(fields: [matchPlayerId], references: [id], onDelete: Cascade)

  @@unique([roundId, matchPlayerId])
  @@index([matchPlayerId])
}

// --- PLAYER DATA ---
model SongHistory {
  id           String   @id @default(uuid())
  profileId    String
  songId       Int
  playCount    Int      @default(1)
  correctCount Int      @default(0)
  lastPlayedAt DateTime @default(now())

  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  song    Song    @relation(fields: [songId], references: [id], onDelete: Cascade)

  @@unique([profileId, songId])
  @@index([songId])
}

model PlayerAnimeList {
  id        String   @id @default(uuid())
  profileId String
  animeId   Int
  status    String                  // AniList list status, kept flexible
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  anime   Anime   @relation(fields: [animeId], references: [id], onDelete: Cascade)

  @@unique([profileId, animeId])
  @@index([animeId])
}

// --- SOCIAL (Phase 7) ---
model Friendship {
  id          String           @id @default(uuid())
  requesterId String
  addresseeId String
  status      FriendshipStatus @default(PENDING)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  requester Profile @relation("SentRequests", fields: [requesterId], references: [id], onDelete: Cascade)
  addressee Profile @relation("ReceivedRequests", fields: [addresseeId], references: [id], onDelete: Cascade)

  @@unique([requesterId, addresseeId])
  @@index([addresseeId, status])   // incoming requests
}
```

## Removed vs current schema

- `GameSession`, `GameParticipant` → replaced by `Match` / `MatchPlayer` / `MatchRound` / `RoundAnswer`.
- `SongVote` + `VoteType` enum → dropped (re-addable later).

## Phase mapping

| Phase | Schema work |
|-------|-------------|
| **1 (now)** | `prisma migrate resolve --applied 20260705000000_init` on live DB. No model changes. |
| **2** | Remove `Profile.id @default(uuid())` (align with auth trigger). RLS cleanup per advisors: consolidate duplicate `Profile`/`SongVote` `SELECT` policies, wrap `auth.<fn>()` in `(select …)`, revoke `EXECUTE` on `handle_new_user()`, enable leaked-password protection. Formalize policies for `Profile` (public read of limited fields + self-update) and `SongHistory`. |
| **4** | Enums (`SongType`, `Difficulty`); split `Song.type` → `songType` + `sequence` (**impacts pipeline steps 2 & 3**); add FK indexes (advisor); timestamps on `Song`/`Anime`/`Franchise`; `onDelete: Cascade` on `Song → Anime`; drop `SongVote` + `VoteType`; rework `SongHistory` to aggregate; anglicize schema comments. |
| **5** | `Match` / `MatchPlayer` / `MatchRound` / `RoundAnswer`; drop `GameSession` / `GameParticipant`. |
| **6** | `Profile.bannedUntil` / `mutedUntil` (admin actions). |
| **7** | `Friendship`; `Profile.lastSeenAt` (presence). |

## Watchouts

- Splitting `Song.type` into `songType` + `sequence` requires updating `scripts/2_fetch_animethemes.ts` (currently sets `type: OP${seq}`) and `scripts/3_load_initial_data.ts`. Do it together with the Phase 4 migration and regenerate the catalogue.
- Each schema change in Phases 4/5/7 is a **new versioned migration** on top of the baseline — never edit `20260705000000_init`.
- Re-run `get_advisors` after each DDL change.
