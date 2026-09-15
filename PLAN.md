# AniQuizz — Roadmap

Versioning: **year-based** (`26.x` = 2026). Patch = small fixes; minor = planned updates.

| Version   | Status     | Summary                                                                                                               |
| --------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| **26.0**  | 🚀 Launch  | Full refactor shipped (Phases 0–10). Standard mode, friends, XP, admin, perf, legal/SEO baseline.                     |
| **26.1**  | ✅ Shipped | Account + AniList UX + lobby depth (video modes, song start, rules panel, admin lobby bots). Tag `26.1` (2026-07-10). |
| **26.2**  | ✅ Shipped | Librairie + MyAnimeList + UX/perf polish. Tag `26.2` (2026-07-12).                                                    |
| **26.3**  | ✅ Shipped | Engine tests + doc · GameForm full-screen · **Sprint** · release content                                              |
| **26.4**  | ✅ Shipped | Song likes, suggestions, library views, community leaderboard                                                         |
| **26.5**  | ✅ Shipped | Endings, staff playlists, product-audit hardening — tag `26.5`, commit `89c7627`                                      |
| **26.6**  | ✅ Shipped | Quiz du jour · player settings · Ko-fi · artist precision — tag `26.6` (2026-09-15)                                   |
| **26.7**  | 🔮 Next    | Profile pokédex found bar · heard / found / liked playlists                                                           |
| **26.x+** | 🔮 Backlog | Competitive, i18n, user playlists, profile charts, etc.                                                               |

**Conventions:** code/docs/commits in English · UI copy French (i18n-ready) · player identity = JWT `userId` · review at each update boundary.

**References:** `ARCHITECTURE.md` · `SCHEMA-TARGET.md` (historical schema notes) · package `CONTEXT.md` files.

---

## Update 26.1 — Account, AniList UX & lobby depth

Goal: polish the core Standard experience before bigger features (librairie, charts, MAL).

### 1. Delete account (RGPD)

- Profile action **« Supprimer mon compte »** with explicit confirmation.
- Server-authoritative: Supabase Auth delete + Prisma cascade (`Profile`, `MatchPlayer`, `RoundAnswer`, `SongHistory`, `Friendship`) + avatar in Storage.
- Aligns with privacy policy (right to erasure).

### 2. AniList — minimum intersection threshold

- When **Watched + intersection** yields fewer than **X** playable songs, **block start** or offer an explicit host choice (« compléter avec l'aléatoire ? ») — no silent fallback to the global pool.
- Clear lobby UX: why Watched is disabled, playable count hint.

### 3. Règles du mode (lobby)

- **« Règles »** tab/button in the lobby: objective, scoring per answer type, solo medals vs multi podium, pause/skip voting, active modifiers.
- Content adapts to the room's `RoomSettings`; French copy isolated for future i18n.

### 4. Video display modes

- Room option for guessing-phase presentation: **hidden** (default — black stage, audio only) · **blurred** (full frame obscured) · **peek** (22 % square on short side, ≥ 8 % margin from edges; random position per round at `round_start`, server-seeded).
- `RoomSettings.videoMode` · `GameConfigForm` tabs **Général** | **Avancé** (picker in Avancé, above sons/timer row) · `VideoStage` rendering · reveal always full video · **no scoring change**.
- See `docs/game/video-display-modes.md`.

### 5. Song start position

- Advanced lobby option: clip starts **from the beginning** (`videoStartTime = 0`) or **random offset** (current `PlaylistBuilder.pickStartTime` behaviour).
- `RoomSettings.songStartMode: 'beginning' | 'random'` · zod in `settings.ts` · wired on `round_start` as today.

### 6. Admin lobby bots (production)

- Reuse the existing **« Ajouter un bot »** host control in `MultiplayerLobby` (today: `canAddBots={import.meta.env.DEV}` only).
- On the **live server**: show the same button when the host has role **ADMIN** (socket `dev:add_bots` is already gated server-side — non-dev requires `ADMIN`).
- No new UI or dev-tools panel; lobby-only, host-only, waiting state only — parity with local dev for staff testing or filling lobbies.

### 26.1 checklist (at boundary)

- [x] All six items shipped.
- [x] Integration tests for delete-account and AniList threshold paths.
- [x] `pnpm build` + `pnpm test` green · `PROGRESS.md` updated.
- [x] Tag `26.1` (commit `874c0f3`, 2026-07-10).

---

## Update 26.2 — Discovery & integrations

Goal: catalogue browsing and second list provider.

### 1. Librairie

- Replace Coming Soon placeholder with a **browse** experience (catalogue search/filter: anime, franchise, OP/ED, difficulty).
- v1 scope: discovery + links (tree browse, filters, video preview).

### 2. MyAnimeList

- Link MAL account (public API + client id) · sync watched list · use in **Watched** mode as an alternative to AniList (union/intersection in multi).
- Mirror existing AniList patterns: `Profile.malUsername`, server-side fetch, lobby warm-up, `PlaylistBuilder` filter.

### 26.2 checklist (at boundary)

- [x] Librairie + MAL link/sync working end-to-end.
- [x] Docs updated (`ARCHITECTURE.md`, profile/list integration).
- [x] `PROGRESS.md` updated.
- [x] Tag `26.2` (commit `41ec7ee`, 2026-07-12).

---

## Update 26.3 — Engine hardening, config UX & Quick Draw

Goal: harden the scoring engine, move room config to a proper full-screen surface, then land the
first new multiplayer mode on top of it.

Order is deliberate: tests first (safety net before touching scoring), then the config UX rework
(the surface that will host mode selection), then the new mode.

### 1. Polish — engine tests & docs (buffer)

- **`MatchEngine` unit tests** — cover the current Standard scoring path before it changes for Quick Draw:
  standard round (typing / qcm / mix), anti-cheat `effectiveAnswerType` clamp, answer-change before
  round end, streak/`maxStreak`, multi timer (26.2.1 regression), reveal → next round.
- **Autocomplete doc** — update `docs/perf/baseline.md` to reflect the real 26.2.1 fix: catalogue
  fetched once via `anime:get_all` → `anime:all_names`, then **local** fuzzy matching in `useAnimeSearch`
  (replace the stale server-side warmup/debounce description).
- Catalogue curation is **out of scope** here (already cleaned; a larger re-fetch is a later data pass).

### 2. GameForm — full-screen route (config UX rework)

- Move room/solo configuration out of the modal (`DialogContent`) into a **dedicated full-screen route**
  (e.g. `/play/create`, `/play/join`) — the modal is already cramped with 6 sections and cannot host a
  mode selector + per-mode options comfortably.
- **Reuse** every existing section component (`./config/*`: `RoomSettingsSection`, `RulesSection`,
  `SourceSection`, `FiltersSection`, `VideoDisplaySection`, `SongStartSection`) — only the container and
  layout change (multi-column / section nav), not the config logic or types.
- Introduces a place for a **mode selector** (Standard vs Sprint) so step 3 slots in cleanly.

### 3. Sprint — new multiplayer speed mode ✅

Renamed **Quick Draw → Sprint** in code and UI (`gameType: 'sprint'`, label « Sprint »).

- **Rules:** Standard match, **typing only** (no QCM / mix), **multiplayer only** (podium bonus is
  meaningless solo).
- **Scoring:** base = correct typing answer (`GAME_CONFIG.SCORING.TYPING`, 5 pts) **plus** a speed
  podium bonus scaled to the number of **correct** answerers this round (not lobby size):

  | Correct answerers this round | Bonus (fastest → slowest)    |
  | ---------------------------- | ---------------------------- |
  | 1                            | **+0** (you outraced nobody) |
  | 2                            | **+2 / +1**                  |
  | 3+                           | **+3 / +2 / +1**             |

- **Architecture (required):** the podium bonus depends on the relative rank of all correct players,
  which is only known once the round ends — it **cannot** be computed in `handleAnswer` (as today).
  Extend the `ScoringStrategy` interface with a second, round-level step, e.g.
  `roundBonus(rankedCorrect: { userId: string; timeMs: number }[]): Map<string, number>`:
  - `handleAnswer` computes only the **base** points.
  - `endRound` sorts correct players by `answerTimeMs` ascending, calls `roundBonus`, and adds the bonus.
  - Standard mode's `roundBonus` returns empty → behaviour unchanged.
- **UX:** reveal shows arrival order (1st / 2nd / 3rd) so the speed race is legible. Copy FR isolated.

**Data prep (shipped, no UI):** match snapshots persisted at game-over (`Match.responseType`,
`Match.precision`, `MatchPlayer.soloMedal`) — schema from migration `20260712193000`; wired in
`MatchRepository` for future profile charts (UI deferred to 26.x+ backlog).

### 26.3 checklist (at boundary)

- [x] `MatchEngine` unit tests green in CI · `docs/perf/baseline.md` autocomplete section updated.
- [x] GameForm served as a full-screen route; sections reused; parity with old modal.
- [x] Sprint playable in multi: typing-forced, relative podium bonus, arrival order at reveal.
- [x] `ScoringStrategy` extended with round-level bonus; Standard unchanged (guarded by step 1 tests).
- [x] Match setting snapshots persisted (`responseType`, `precision`, `soloMedal`) — data layer only.
- [x] `pnpm build` + `pnpm test` green · `PROGRESS.md` updated · release content (news, roadmap, Home tag).
- [x] Tag `26.3`.

---

## Update 26.4 — Song likes, library views, suggestions & leaderboard

Goal: let players favorite songs at reveal, browse the catalogue in three views, propose / vote on community ideas, and compare lifetime stats on a public leaderboard.

### 1. Song likes — data + API + in-game + library

- **`SongLike` schema** — `profileId` + `songId` unique, cascade on Profile/Song delete (RGPD).
- **REST API** — `PUT/DELETE /library/songs/:id/like`, `GET /library/likes/ids`; enrich library rows with `liked?: true`.
- **Library filter** — `?liked=liked|unliked` (auth); badge « Favori » on tree + drawer.
- **In-game UX** — heart button on `SongInfoCard` at **reveal only** (no guessing-phase leak).
- **`SongLikesProvider`** — prefetch liked ids, optimistic toggle + toast FR.

### 2. Scope added during the phase (shipped)

- **Profile showcase** — « Titres favoris » section, up to 5 pinned + reorder, `Profile.showFavoriteSongs`
  privacy toggle, public read via `GET /library/users/:userId/favorites`.
- **`Song.likeCount`** — denormalized counter (± in the same transaction as the like), backfilled.
- **Library browse views** — Franchise / Anime / Sons toggle, `sort=likes|liked_recent`, URL-persisted.
- **Defense-in-depth** — `SongLike` RLS enabled, client grants revoked (`20260715210000_song_like_rls`).

### 3. Community suggestions board (shipped)

- **Public board** — `/suggestions`, Top / recent sorts, category filters; read without account,
  create and vote with authentication.
- **Structured feedback** — improvement, song request, catalogue correction (song + field + proposed
  value), other. No user comments in v1; official team reply only.
- **Voting** — unique `SuggestionVote`, denormalized `voteCount` updated transactionally, open
  suggestions only, 5 creations per rolling 24 hours.
- **Admin** — Suggestions tab for status (Open / Planned / Done / Rejected), official reply, delete.
- **Home** — third secondary « Idées » button, lazy route prefetch, public prerender.
- **Security** — server-only `Suggestion` / `SuggestionVote`, RLS deny-by-default + client grants
  revoked; staff-treated ideas stay anonymized (`authorId` SET NULL) when an account is deleted.

### 4. Community leaderboard (shipped)

- **Five lifetime tabs** — XP (level + total XP), victories, games played, musical Pokédex
  (`SongHistory` distinct songs), accuracy after 50 played rounds (unanswered rounds count as misses).
  Equal victories share a rank; win rate then games played break remaining ties.
- **Public GET `/leaderboard`** — optional auth for « Votre position », competition ranks (1-2-2-4),
  top 25 plus the signed-in viewer if they sit outside that cut, bots and active bans excluded,
  Postgres-backed public-read rate limit.
- **Integrity** — `computeVictory` receives human competitors only so bot-filled lobbies no longer
  inflate the multiplayer podium.

### 26.4 checklist (at boundary)

- [x] Migrations applied (local + prod): `song_likes`, `profile_pinned_favorites`,
      `profile_show_favorite_songs`, `song_like_count`, `song_like_rls`.
- [x] Integration tests `songLikes.integration.test.ts` green (8).
- [x] `pnpm build` + `pnpm test` green (292 tests: shared 130, server 82 + 1 skipped, client 80) · `PROGRESS.md` updated.
- [x] Release content (news id 6 dated 2026-09-02, roadmap Classement 2 sept. 2026, `v26.4` tag on Home + app-shell).
- [x] Suggestions board migrations + integration tests + public/client/admin surfaces.
- [x] Suggestions hardening: concurrent votes, Postgres rate limits, staff lock, anonymized
      treated ideas, ranked paginated song search, accessible combobox, stale-request guards.
- [x] Community leaderboard: five metrics, indexes, integration + client tests, Coming Soon replaced.
- [x] Commits `8b027e6` + `4e32022` on `origin/main` (feature complete, pushed). CI / Vercel / Render green.
- [x] Tag `26.3` then `26.4`.

---

## Update 26.5 — Endings, staff playlists & hardening

Shipped on `main` in commit `89c7627`; CI, Vercel, and Render are healthy. Release tags `26.3`, `26.4`, and `26.5` were created at the closure boundary.

See [`docs/game/thematic-playlists.md`](./docs/game/thematic-playlists.md) and [`docs/security/rls-audit.md`](./docs/security/rls-audit.md).

### 1. Catalogue — endings + credits

- AnimeThemes step 2: live AniList top N, exact ids, all-input, unlocked-only; `SONG_TYPES=OP,ED`; dry-run; locked-row backfill without overwrite.
- Client OP/ED filter; Watched rules copy follows selected types.
- Prod: **1185 OP + 1814 ED COMPLETED** (2999 playable) + 2 SKIPPED = **3001** songs. All Franchise/Anime/Song `isLocked`.
- Artist pass: MAL title-match + manual research; **1** Unknown left (Death March ED2, empty title).
- R2 key-level 1:1 with COMPLETED at the 2990 snapshot; two orphans deleted. Full ffmpeg `r2:scan` not run (optional).

### 2. Staff thematic playlists

Unlock Source **Playlists**: hybrid **recipe + frozen snapshot**; Watched combinable in v1.

- Prisma `ThematicPlaylist` + snapshot rows + GIN on `Song.tags` / `Franchise.genres`.
- Shared recipe membership + Zod `playlistId` / `decadePlaylistId` / `playlistWatched`.
- Draw + QCM inside the snapshot; Watched overlay; fallback = rest of pack only; start gates.
- Client picker, pool banner, overlay, rules copy, room chips.
- Admin preview / publish / refresh + seed of staff packs (genres, tags, decades).
- Polish before tag: extra packs, decade overlay, AniList copy, Union/Commun only with 2+ players.

User-created playlists / ladder / library-by-pack stay in **26.x+ backlog**.

### 3. Product-audit hardening

P0/P1/P2 useful from the 10 Sept. 2026 audit (see `PROGRESS.md`): Mix clamp, skip/votes membership, SongHistory RLS, ready/QCM/stale AniList, difficulty toast, Helmet, join IP. HIBP remains disabled by decision because Supabase Pro+ is unavailable; the advisor WARN is accepted.

### 26.5 checklist (closed)

- [x] Targeted AnimeThemes selection + validation + dry-run.
- [x] Locked-anime ending backfill path documented for PowerShell.
- [x] Endings selectable in the game form; Watched rules copy follows selected types.
- [x] Production ED catalogue present; key-level R2 integrity; artist credits imported.
- [x] Staff playlists: schema, draw, client picker, admin, seed, polish.
- [x] Product-audit P0/P1 + useful P2. HIBP explicitly deferred while Pro+ is unavailable.
- [x] Release content: news id 7 (full 26.5) · roadmap Endings + Playlists · Home + app-shell `v26.5`.
- [x] Commit `89c7627` deployed; CI, Vercel, and Render healthy.
- [x] Release tags `26.3`, `26.4`, and `26.5` created and pushed.
- [x] Retired staff playlist `easy-hits` removed from production.

---

## Update 26.6 — Quiz du jour, settings & donations

Player settings, **Artiste** precision, Ko-fi, and **Quiz du jour** shipped as tag
`26.6` (`ed82c96`, public launch 2026-09-15) — see [`PROGRESS.md`](./PROGRESS.md).

### 1. New answer precision — Artiste ✅

Product chose **Artiste**, not song title. `Precision` is `franchise` | `anime` | `artist`.

- Typing accepts any billed `artistNames` unit (full `Song.artist` still as free-type). Title / anime do not count.
- Autocomplete and QCM/Duo use **units only**. QCM correct option = first billed unit (`artistNames[0]`), not a composite `A, B`.
- Medals: `PRECISION_OFFSET.artist = -0.08`. Catalogue field `Song.artistNames`. Doc: [`docs/game/artist-precision.md`](./docs/game/artist-precision.md).
- Lobby rules + config tooltip: one credited artist/group is enough.

**Deferred to 26.x+:** song-title precision, OP/ED sequence as an answer axis.

### 2. Donations ✅

Header outline CTA **Soutenir** → `https://ko-fi.com/aniquizz` (new tab). Left of **Admin** for staff; same slot otherwise. Icon-only on small screens. Pays hosting (Render, R2, list-provider quotas) without changing the product contract: voluntary, one-time, no perks, site stays free and ad-free.

**Not in this version:** Ko-fi embed/script, backend/webhook, donor identity on AniQuizz, public badge or leaderboard, memberships, gameplay advantage.

CGU §5 and the privacy policy cover the external Ko-fi / PayPal flow and the absence of tax-deductible receipts.

### 3. Player settings ✅

Comfort prefs (audio, motion, gameplay, notifications) + privacy + dual AniList/MAL. Volume/mute apply to matches, library, profile previews, admin preview, and notification chimes.

### 4. Quiz du jour ✅

Globally shared five-song QCM (precision **anime**), one official attempt per profile,
midnight `Europe/Paris`. Each round is 15s guess + 15s reveal — not a 15-minute budget.
Leaving, refreshing, or closing the tab **forfeits** remaining rounds as unanswered —
there is no resume. HTTP + Postgres so a Render restart does not lose a live attempt;
the client still forfeits on leave.

Dedicated daily streak (including `0/5`) and XP: participation (`3` × active songs) +
`12` per correct, plus `20` on recap victory (≥ 3 found) and `10` extra for a perfect day.
Does **not** increment ordinary match aggregates (`gamesPlayed`, wins, guesses, win streak).
Heard clips **do** upsert `SongHistory` (pokédex). Ranking: correct desc,
then cumulative time (ties `1-2-2-4`). Launch numbering **#1 = 2026-09-15**.

**Public:** landing, QCM play on `StandardGameLayout`, reveal likes (catalogue song id),
recap, daily leaderboard, profile history merge.

**Admin:** 14-day horizon, replace / franchise-uniform shuffle / clip reshuffle, type-aware
catalogue search (`bleach ED5`), lineup warnings, void a live round, reset a player’s
today (attempt + XP + daily streak + pokédex rows from that run). Doc: [`docs/game/daily-quiz.md`](./docs/game/daily-quiz.md).

### 26.6 checklist (at boundary)

- [x] Player settings (audio, motion, gameplay, notifications, privacy, dual lists).
- [x] Artist precision playable (typing + Mix/QCM/duo) with tests; song title / OP-ED sequence explicitly deferred.
- [x] Ko-fi support, copy FR, no gameplay advantage.
- [x] Quiz du jour (5 QCM anime, one attempt, per-round 15s, forfeit-on-leave, Paris reset, dedicated streak/XP, admin horizon + review tools).
- [x] Release copy: news id 8 · roadmap Quiz du jour + paramètres + Artiste · Home + app-shell `v26.6`.
- [x] `pnpm build` + `pnpm test` green · git tag `26.6`.

---

## Update 26.7 — Pokédex depth (planned)

Goal: make collection progress readable, and let players replay what they already know.

### 1. Profile pokédex — found bar

- Keep the existing discovery bar (unique songs heard / playable catalogue).
- Add a second bar: unique songs **found correctly** at least once (`SongHistory.correctCount > 0`) vs the same catalogue denominator.
- French copy isolated; medals stay on the discovery % unless product revisits thresholds.

### 2. Heard playlist

- New music source in game config: **Déjà entendus** — draw only from the player's `SongHistory` rows (clip started in a match or daily).
- Same pool gates as Watched: block start when the pool is smaller than the requested round count; no silent fill from the global catalogue.

### 3. Found playlist

- Sibling source: **Déjà trouvés** — `correctCount ≥ 1` only.
- Same solo/multi rules as Heard (host list in multi unless a later pass adds union/intersection).

### 4. Liked playlist

- Sibling source: **Titres likés** — draw only from the player's `SongLike` rows (hearts from reveal / library), not from the 5 pinned profile showcase.
- Same pool gates as Heard/Found: block start when the pool is smaller than the requested round count; no silent fill from the global catalogue.
- Solo/multi: host likes in multi unless a later pass adds union/intersection. Distinct from staff thematic packs (26.5) and from player-created playlists (26.x+ backlog).

### 26.7 checklist (at boundary)

- [ ] Profile found bar + tests.
- [ ] Heard + found + liked playlist sources, lobby copy, pool stats.
- [ ] `pnpm build` + `pnpm test` green · `PROGRESS.md` updated.

---

## Backlog (26.x+, timing TBD)

Order within backlog **not fixed**. Shipped 26.6 items are **not** duplicated here.

### Social & retention

| Item                   | Notes                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Leaderboard global** | **Shipped in 26.4** — XP / victoires / parties / Pokédex / précision. Period and friends filters remain backlog. |
| **Le saviez-vous ?**   | Rotating trivia widget; curated `triviaData` or admin entries; carousel + reduced-motion.                        |
| **Achievements**       | Replace profile placeholder; tie to stats/matches/medals.                                                        |

### Game modes (new engines or major variants)

| Item                                        | Notes                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Compétitif + ladder saisonnier**          | Ranked mode; strict anti-cheat; seasons reuse leaderboard infra. Mix honor-system already clamped in 26.5.               |
| **Mode AMQ / speed (Quick Draw)**           | **Shipped in 26.3** as Sprint.                                                                                           |
| **Challenger / Time Trial / Battle Royale** | Removed in Phase 4 refactor — **only if** product revives them.                                                          |
| **Song-title precision**                    | Deferred from 26.6 (Artiste shipped instead). Same plumbing: `validAnswers`, autocomplete, QCM pool, medals, lobby copy. |
| **OP/ED sequence as answer**                | Deferred from 26.6.                                                                                                      |

### Product & UX

| Item                                 | Notes                                                                                                                                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Traduction EN**                    | Wire i18n; UI strings already isolated (French default).                                                                                                                                                         |
| **Light mode**                       | Removed Phase 8 (dark-only); re-add requires token audit + `UserAvatar`/game surfaces.                                                                                                                           |
| **Franchise catalogue cleanup**      | Data pass: DBZ, Naruto, AOT spin-offs → canonical franchises.                                                                                                                                                    |
| **Playlists — player packs**         | Staff packs are **26.5**. Heard / found / liked game sources are **26.7**. User playlists, sharing, fork, per-pack ladder remain here.                                                                           |
| **Graphiques statistiques (profil)** | Visual breakdown on profile · period filter · Recharts lazy on `/profile`. DB snapshots already persist (`Match.responseType`, `Match.precision`, `MatchPlayer.soloMedal`); UI + aggregation API still deferred. |

### Infra & quality (as needed)

- Sentry on `errorReporter.ts` · expanded e2e · spectator mode.
- Supabase HIBP is not planned while the project remains below Pro+; the advisor WARN is accepted.
- Split god-files (`MatchEngine`, admin) when a feature touches them.
- Audit leftovers: friend invites without friendship, public profile `roomId`, admin PATCH role without `guardProtectedTarget`, `claim-admin` outside production.

**Quality gates — wave 1 (done in tree):** playbook committed (`AGENTS.md`, `PLAN.md`, `PROGRESS.md`, `docs/agents/`, `.cursor/rules/`) · client `tsc` in CI · ESLint on server + shared (`eqeqeq`, `no-explicit-any`, `no-floating-promises`) · Zod on mutating socket events (`game:answer`, settings, start, votes).

**Quality gates — wave 2.1 (format, in tree):** one Prettier baseline + `pnpm format:check` in CI (after English-code check).

**Quality gates — wave 2.2 (package boundaries, in tree):** ESLint `no-restricted-imports` — client ↛ server/database; shared ↛ react/express/prisma/socket.io; server ↛ react/client.

**Quality gates — wave 2.3 (shared watch, in tree):** `tsc --watch` on `@aniquizz/shared` in `pnpm dev`; nodemon restarts on `dist/` changes; `dev:server` uses Turbo so the watch is included.

**Quality gates — wave 2.4 (SPA tooling, in tree):** removed `lovable-tagger` from Vite (dev-only Lovable leftover).

**Quality gates — wave 2.5 (jsx-a11y warn, in tree):** `eslint-plugin-jsx-a11y` recommended as warn on the client (14 findings). Flip to error after cleanup.

**Quality gates — wave 2.6 (SPA strict + lint, in tree):** client `tsconfig.app.json` `strict: true` (global — per-folder was unnecessary after measuring 10 errors). ESLint `eqeqeq` + `no-explicit-any` on the SPA. `no-unused-vars` stays off.

**Quality gates — wave 2 remaining:** dedicated `jsx-a11y` cleanup (14 warns) then promote to error. Then Auth + Home feature audits.

---

## v26.0 — Launch scope (shipped)

What **26.0** includes (refactor Phases 0–10, July 2026):

- **Stack:** React/Vite client (Vercel) · Express/Socket.io server (Render) · Supabase Auth/Postgres · Cloudflare R2 videos · Prisma · monorepo pnpm/Turbo.
- **Game:** Standard mode only · solo + multi lobby · fixed scoring (typing/QCM/duo) · solo medals · Watched (AniList) · server-side autocomplete · anti-cheat baseline.
- **Social:** Friends (requests, presence, invites, block) · XP/level · profile + public profile.
- **Admin:** Users, rooms, catalogue, dev bots/scenarios · live mute/ban + sanction sync.
- **Compliance:** RGPD pages, cookie consent, robots/sitemap, JSON-LD, prerender public routes.
- **Perf:** Lazy routes, delayed Suspense fallback, route prefetch, CWV/caching pass, socket throttling, virtualized admin lists.
- **Data:** ETL pipeline (AniList + AnimeThemes → R2), lock/exclusion guards, R2 integrity scan/repair.
- **Placeholders at launch:** Daily (shipped 26.6), Compétitif (still backlog).

Pending **before tag 26.0** (working tree, not yet committed): anime dedup per game · nav flash fix · SEO/favicon/OG cleanup · delete `og-image.jpg`.

---

## Archive — Refactor phases 0–10

Historical execution plan (completed). Kept for context only; **do not extend** unless explicitly reviving an item in backlog.

<details>
<summary>Phase map (collapsed)</summary>

| Phase | Topic                  | Outcome                                                                     |
| ----- | ---------------------- | --------------------------------------------------------------------------- |
| 0     | New repo & foundations | Monorepo, docs, Prisma migrations, English-code rule                        |
| 1     | Infra & R2             | Bucket, pipeline → R2, dev seed, deployments                                |
| 2     | Security & identity    | JWT sockets, login required, rate limits, RLS cleanup                       |
| 3     | Observability          | Pino, socket instrumentation, error reporter, `/health`                     |
| 4     | Code cleanup           | Standard-only; schema enums; drop dead modes/votes                          |
| 5     | Engine rewrite         | `MatchEngine`, `PlaylistBuilder`, typed events, client reducer              |
| 6     | Dev tooling & admin    | Bots, test auth, full admin panel                                           |
| 7     | Features               | XP/level, solo medals, friends + enhancements                               |
| 8     | UI/UX                  | Dark redesign, hub/profile/game polish, lazy routes, dead code purge        |
| 9     | Tests, CI, legal, SEO  | Integration tests, Playwright, GA workflow, RGPD, a11y pass                 |
| 10    | Performance & polish   | Bundle, CWV, sockets, server-side search, admin UX, docs hygiene, R2 repair |

**Original engine problems (why rewrite):** `socket.id` identity · god `GameCore`/`Game.tsx` · answer leak before reveal · biased shuffle · untyped socket strings · memory leaks on finished matches.

</details>

<details>
<summary>Phase boundary protocol (unchanged)</summary>

1. Checklist every item (done / partial / deferred).
2. Verify: `pnpm install` · `pnpm build` · `pnpm test` · smoke test.
3. Git commit when requested (`feat(26.x): …` or `fix(26.x): …`).
4. Update `PROGRESS.md` · pause before next update.

</details>
