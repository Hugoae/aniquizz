# Progress — AniQuizz Refonte

## Current phase: Phase 9 — Integration, CI & security audit 🚧 next

Order: **(1) XP/Level ✅ → (2) Victory conditions revamp ✅ → (3) Friends ✅ → (4) Phase 8 UI/UX rework ✅.** Leaderboard deferred to **Update 1** (after Phase 9).

**Phase 8 closed** (2026-07-08): dark-mode-only redesign across client + admin, profile/game/hub rework, friends UX hardening, client audit (ESLint/TS/tokens/dead code/lazy routes), and post-audit polish (news deep-link, header profile affordance, `framer-motion` kept for in-game player-floor layout animation).

## Done (Phase 8 — UI/UX rework) ✅

Dark-mode-only redesign with carte-blanche on colors/rounding/typography. Priority order: **DELETE** unused code → **IMPROVE** existing → **ADD** new.

### Profile page rework

#### Stats
- [x] **`StatsCarousel`** (`features/profile/components/StatsCarousel.tsx`): responsive 4-col grid (down to 2 on mobile) with horizontal scroll-snap + pagination; **16 stats over 2 pages**. Colored numbers matching each tile's icon color.
  - Page 1: Parties jouées · Taux de victoire · Taux de bon guess · Temps de jeu — Meilleur score · Meilleure série · Réponse la plus rapide · Temps de réponse moy.
  - Page 2: XP totale · Score total · Bonnes réponses · Rounds joués · Score moyen/partie · XP moyenne/partie · Parties multi · Parties solo.
- [x] Server aggregations added to `profileService` (`scoreTotal`, `avgAnswerMs`, `fastestAnswerMs`, `roundsPlayed`, `multiCount`, `soloCount`, `playtimeMs`, `avgXpPerGame`).

#### Page unification (self + public)
- [x] **Merged `PublicProfile.tsx` into `Profile.tsx`** — one component keyed off `useParams` (`/profile` = self, `/profile/:userId` = public), conditional rendering via `isOwn` + `relation`. Deleted `pages/PublicProfile.tsx`; both routes point to `Profile`.
- [x] **Shared `ProfileStats`** interface in `game.ts`; `PublicProfile extends ProfileStats`. Server extracts `computeRichStats(userId)` reused by `getProfileStats` + `getPublicProfile` → public profiles now as rich as self.
- [x] **Removed obsolete rank systems**: level-based "Novice" badge (`levelTitle.ts` deleted) and collection-based server `rankLabel`/`rankColor` (+ `COLLECTION_RANKS`).

#### Header
- [x] "Membre depuis…" (small, under username) + presence status line; AniList button beside it (link/relink/unlink); XP bar removed (redundant with avatar ring) — `xp/xp XP` shown small under the avatar. Top-right ⋮ menu (change password / logout). Pseudo edit button always-visible (greyed).

#### AniList linking (audit + hardening)
- [x] **Audit:** linking is server-authoritative (write via `update_profile_data`, RLS-safe) and gameplay reads `anilistUsername` from the DB (`PlaylistBuilder.resolveWatchedIds`), so a client can't spoof another player's watched list. It's an unverified username association (not OAuth) — acceptable (public lists, no sensitive action).
- [x] **Hardening:** `verifyAnilistUser()` (AniList `User(name:)` query) now runs before linking — **404 → refused** with a clear toast, **403 / network → tolerated** (`unverified`, so an AniList outage/IP-block never blocks a legit link). Contextual update error message (username-taken only when a username was in the payload). Client clears the pending-AniList toast flag on error.

#### Avatar upload (storage)
- [x] **Root cause found:** the `avatars` bucket **did not exist** (0 buckets / 0 objects in the project) — client avatar upload was silently broken; displayed avatars were DiceBear fallbacks. Also the filename used `Date.now()` → old files would never be deleted (orphan leak), and `storage.objects` had RLS on with **0 policies**.
- [x] **Migration `avatars_bucket_and_policies`** (applied live): created the public `avatars` bucket (5 MB, `image/jpeg|png|webp`) + 4 Storage policies — public read; INSERT/UPDATE/DELETE restricted to each user's own `"<uid>/"` folder (`(storage.foldername(name))[1] = (select auth.uid())`).
- [x] **Client fix** (`uploadAvatar`): stable path `"<uid>/avatar.jpg"` + `upsert: true` + cache-busting (`?v=<ts>` on the stored URL) → a new photo **overwrites** the previous one (exactly one file per user, no orphans).

#### Friends
- [x] Recent-players list hides users already in a relationship (client-side `visibleRecent` memo in `FriendsContext`). Friend-request privacy confirmed DB-persistent.

#### Game launch & in-game perf/UX
- [x] **Reveal density**: streak badge hidden during reveal (roster keeps it); ranks stay visible but show a neutral `#-` pill (`rankNeutralAccent`) until scores diverge (`hasRankingSpread`) instead of everyone at `#1`.
- [x] **Instant launch feedback**: new `'starting'` `GameStatus`; `Room.startMatch` flips to `starting` + broadcasts *before* the (async) playlist build, killing double-clicks/spam. Client latches `isLaunchPending` on click (spinner + "Préparation de la partie…").
- [x] **Build hidden behind the intro**: `MatchEngine.start` emits `game_started` immediately, builds the playlist during the 5 s intro countdown (`INTRO_DELAY` 3 s→5 s), then `startRound` fires at `max(intro, build)`. Build failure → `abortStart` returns everyone to the lobby.
- [x] **Video preloading**: server emits `game:preload` (round-1 clip during intro, next clip at reveal via `nextVideo`/`nextVideoStartTime`); client warms a hidden `<video>` (`warmVideo`/`preloadRef`) → no cold buffering.
- [x] **`getChoiceCandidates` cached in memory** (per-`precision`, 10 min TTL, promise-cached to collapse concurrent starts); invalidated on anime/franchise catalogue writes (`invalidateChoiceCandidates`). Removes a full `anime` scan from every match start.
- [x] **AniList resolved at the lobby**: `warmWatchedList` runs on create/join and when a room switches to Watched — resolves `anilistUsername` from the profile onto the player and warms `getUserAnimeIds` (cache + `player.watchedIds`) so the build no longer spikes on network at start.
- [x] **R2 `Cache-Control`**: uploads now set `public, max-age=31536000, immutable` (videos are content-addressed); `r2BackfillCacheControl` + `pnpm --filter @aniquizz/database r2:cache-control` backfills existing objects → reliable browser/CDN caching for preloads.
- [x] **Loader polish**: `game:preload` doubles as a "build finished" signal (`firstClipReady`); the countdown shows `GO!` only when the first clip is ready, otherwise keeps the spinner + "Préparation de la partie…" (no premature `GO!` when a build overruns the intro).

### Admin page rework

#### Refactor / audit
- [x] **Profile page decomposition** (`Profile.tsx` orchestrator + `features/profile/components/*`): `ProfileHeader`, `ProfileStatsSection`, `AvatarCropDialog`, `PasswordDialog`, `AniListDialog`, shared `features/profile/types.ts` (`ProfileVM`/`ProfileBasicStats`); removed `no-explicit-any` casts; `PasswordField` eye now keyboard-accessible (press-and-hold Space/Enter, `aria-pressed`).
- [x] **CSS token migration** across the whole Admin module (`UsersPanel`, `RoomsPanel`, `CataloguePanel`, `StatsPanel`, `DevToolsPanel`, `EditDialogs`): all raw Tailwind colors (`bg-white/10`, `text-emerald-400`, `bg-blue-500/20`, …) → semantic design tokens (`bg-secondary`, `text-success`, `bg-info/20 text-info`, `text-primary`, …) for dark-mode consistency.
- [x] Consistency audit also applied to Home (`NewsSection` icon box + keyboard-accessible news item) and removed the duplicate `animate-scale-in` keyframes/utility from `index.css` (Tailwind built-in used).

#### Bots hidden from the Users tab
- [x] **Server** (`adminService.listUsers`): the admin user list now **always excludes bots** (`all` = humans only; the humans-first/bots-last pagination logic removed). Dropped the `bots` filter from `UserListFilter` (service + `adminApi` type + route allow-list + `buildFilterWhere`).
- [x] **Client** (`UsersPanel`): removed the "Bots" filter chip, the `Bot` import, and every `u.isBot` conditional branch (badge / greyed row / "—" cells). The table renders real players only.

#### Database user clear (kept: Kirikou, Test, bots)
- [x] Inspected via Supabase MCP: `Profile` held only **Test** (MODERATOR), **Kirikou** (ADMIN) + 8 bots — nothing else to delete. `auth.users` had **3 orphan accounts** (email/password, no profile/stats): `sinansaygili02@gmail.com`, `a.xiahp@hotmail.com`, `veedygaming@gmail.com` — **deleted** (auth-schema children cascade; no FK `Profile → auth.users`, so Kirikou/Test untouched).

#### Bot roster grown to 16
- [x] `packages/database/src/bots.ts`: added `bot-0009…bot-0016` (Akira, Hinata, Kaito, Miku, Rei, Shin, Tomo, Yuna, DiceBear seeds `player9…16`). 8 rows inserted live (idempotent); DB now **16 bots · 2 humans · 2 auth.users**. Rebuilt the `@aniquizz/database` `dist` (server imports `main` = `dist/index.js`).
- [x] Bot-count caps driven by roster size: `adminRoutes` `.max(BOT_PROFILES.length)` (add/scenario/remove) + `botRosterSize: BOT_PROFILES.length`; `DevToolsPanel` uses a dynamic `botMax` (`devInfo.botRosterSize ?? 16`) and the "Lobby plein" preset → 16. Roster stays **DEV-only** (routes guarded by `isDevEnv()`).

#### Navigation
- [x] Added the shared **"Retour à l'accueil"** button (same `variant="ghost"` + `ArrowLeft` pattern as News/Library/Daily) at the top of `Admin.tsx`.

#### Verification
- [x] Client `tsc --noEmit` OK; server `tsc --noEmit` OK; changed client files ESLint-clean.

### Security & auth hardening (this session)

#### RLS lockdown — `Profile` table (**critical fix**)
- [x] **Migration `harden_profile_rls`** (applied live via Supabase MCP):
  - Dropped the over-permissive `UPDATE` policy on `public."Profile"` (a user could self-assign `role`/inflate `xp`/`level`). **No client UPDATE policy** now — all writes go through the server (Prisma bypasses RLS as owner).
  - `SELECT` restricted to own row (`(select auth.uid())::text = id`) — was `USING (true)` (fully public). Public/leaderboard data still served server-side.
  - `INSERT` (own-id) kept for signup profile creation.
  - `REVOKE ALL ON public._prisma_migrations FROM anon, authenticated` (off the PostgREST surface).
- [x] **Moved the last client write off `Profile`**: AniList link/unlink now goes through the server (`update_profile_data` socket event extended with `anilistUsername`), not `supabase.from('Profile').update(...)`.

#### Password management
- [x] **Change-password modal** (`Profile.tsx`): uses `supabase.auth.updateUser({ password, current_password })` — the project has **"Require current password when changing password"** enabled (root cause of the earlier "Current password required" failure). Legacy weak current passwords still work (login/verify never enforces the strength policy). Fields reset on close/cancel/reopen. Localized error mapping (wrong current / weak / reuse).
- [x] **Forgot-password flow** (secure): `AuthModal` gains a `forgot` mode → `resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`, generic "if an account exists…" message (no account enumeration). New public route **`/reset-password`** (`pages/ResetPassword.tsx`) gated on a recovery session (session-presence detection, flow-agnostic), sets the new password, localized errors.
- [x] **`PasswordField`** shared component (`components/ui/PasswordField.tsx`): white label above the field + **press-and-hold** reveal eye (mouse + touch). Reused in the modal and the reset page.
- [x] Password policy is **8+ chars, upper + lower + digit + special** (set in Supabase dashboard); client validation + hints aligned; `AuthModal` `minLength` 6 → 8 with a signup hint.
- [x] **Upgraded `@supabase/supabase-js`** 2.89 → **2.110.1** (needed for the `current_password` attribute, v2.102+).

#### Config (user-side, done in dashboard)
- [x] Auth **Redirect URLs** allow-list: `http://localhost:8080/**` (Vite dev port) + `https://aniquizz.vercel.app/reset-password`. Recovery flow verified end-to-end on localhost (link → `/reset-password` page → new password; same-password refusal confirmed as expected GoTrue behavior).

#### Skipped / limitation
- **Leaked-password protection** (HIBP): requires Supabase Pro — left disabled (WARN advisor remains, by choice).
- **Auth URL config** (Site URL / Redirect URLs) is not readable via the available Supabase MCP tools (platform config, not in the DB) — verified functionally instead.

#### Verification
- [x] Client `tsc --noEmit` OK; server `tsc --noEmit` OK; shared build OK. `get_advisors` (security) after `harden_profile_rls`: only the intentional `_prisma_migrations` RLS-no-policy INFO + the deferred leaked-password WARN.

## Done (Phase 7 — Features) ✅

### XP / Level ✅ (step 1)

#### Shared (`packages/shared`)
- [x] **`leveling.ts`** (pure, unit-tested): `xpForMatch`, `levelFromXp`, `totalXpForLevel`, `levelProgress` + `GAME_CONFIG.LEVELING` constants. Exported from `index.ts`.
  - **XP formula:** `12 × correct` weighted by song difficulty (`easy ×0.75 · medium ×1.0 · hard ×1.25`) + `3 × roundsPlayed` (participation, anti-farm) + placement (multi: 1st +40 · 2nd +25 · 3rd +12 · else +6 if top-half, all only when `score > 0`; solo: objective reached +25). Solo `×0.8`. Win-streak: flat `+5%` while `currentWinStreak ≥ 3` (solo + multi). Floor 5 XP if ≥1 round played; 0 XP if none.
  - **Level curve:** quadratic, XP to go L→L+1 = `100 × L`; `Profile.xp` = lifetime total, `Profile.level` = derived (`levelFromXp`). **Hard cap at level 100** (`MAX_LEVEL`; XP keeps accruing, level stops, progress shows 100%). `levelFromXp` is fp-drift-safe (boundary correction loop).
- [x] **`leveling.test.ts`**: 15 tests (difficulty weighting, participation/floor, placement incl. top-half, solo multiplier+bonus, win-streak on/off, curve thresholds, `levelFromXp`↔`totalXpForLevel` inverse at boundaries, monotonicity, `levelProgress` bounds). **50/50** shared tests pass.
- [x] Contract: `ServerToClientEvents.level_up` (`{ oldLevel, newLevel, xp }`); `LevelUpPayload` in `game.ts`; `GamePlayer.xpEarned?` (revealed on game-over).

#### Database (`packages/database`)
- [x] **Migration `20260706170000_phase7_win_streak`** (applied live): `Profile.currentWinStreak Int @default(0)`. `xp`/`level`/`MatchPlayer.xpEarned` already existed (Phase 5). Prisma client regenerated.

#### Server
- [x] **`MatchEngine.finish()`** now async: computes per-player XP via `xpForMatch` (excludes bots + guests), tallies correct answers by song difficulty (`correctSongIds` × playlist), reads prior state via `repo.getXpState`, derives old/new level, injects `xpEarned` into the `game_over` payload, and emits `level_up` to each leveled-up player's own socket (never broadcast). Best-effort: any XP failure still ends the match cleanly.
- [x] **`MatchRepository`**: `getXpState(userIds)` (prior `xp` + `currentWinStreak`); `persistMatch` writes `xp += earned`, `level`, `currentWinStreak` (precomputed by the engine) alongside the existing aggregates.

#### Client
- [x] **`AuthContext`**: listens to `level_up` → success toast + profile refresh.
- [x] **Profile page**: Level + XP progress bar (`levelProgress(profile.xp)`) in the identity card; refreshes profile on mount so post-match XP is fresh.
- [x] **Header**: level shown as a small corner badge on the profile avatar bubble.
- [x] **`StandardGameOver`**: `+X XP` shown per player (multi ranking) and on the solo result card (from `victoryData.rankings[].xpEarned`).

#### Verification
- [x] `pnpm --filter @aniquizz/shared test` — **50/50**; server typecheck OK; client `tsc --noEmit` OK; changed files lint-clean.

### Victory conditions revamp ✅ (step 2)

**Metric = mastery ratio, not raw accuracy.** Points are fixed per answer type (Typing 5 · QCM 2 · Duo 1), and Duo is a per-round *choice* in `mix` lobbies. Raw accuracy caps at 100% and is blind to that choice, so acing trivial Duo rounds wrongly earned Platine (a 5/25 game). The medal is now graded on **`score / bestObtainable`** (best = Typing ceiling for `mix`/`typing`, QCM for `qcm`), so choosing the easy option correctly caps the medal low.

#### Shared (`packages/shared`)
- [x] **`grading.ts`** (pure, unit-tested): medals replace letter ranks. `computeMedal(ratio, songDifficulties)` → `bronze | silver | gold | platinum | null`; `effectiveMedalThresholds` (mean of per-difficulty thresholds across the songs actually played); `getMedalMeta` (FR label + color).
  - **Thresholds** = a **% of the best obtainable score**, per song difficulty (`GAME_CONFIG.MEDALS.THRESHOLDS`). Easier songs demand a higher %, harder songs are more lenient; Platinum keeps a small margin (not strict 100%):
    - easy: `bronze 55 · silver 65 · gold 80 · platinum 95`
    - medium: `bronze 50 · silver 58 · gold 70 · platinum 90`
    - hard: `bronze 45 · silver 50 · gold 62 · platinum 80`
  - **Mixed-difficulty matches:** the effective threshold is the **mean of the per-difficulty thresholds across the songs actually played** (10 songs = 5 easy + 5 hard → threshold = mean(easy, hard) per tier). More hard songs → lower bar automatically.
- [x] **`victory.ts` refactor**: `computeVictory` takes per-player `correctCount`/`totalCount` + `songDifficulties`.
  - **Solo:** victory = ≥ Bronze, graded on `score / (bestPerRound × roundsPlayed)` (per-player denominator handles early quits). Returns `soloMedal` + `soloTargetRatio`. Replaces the stale score-% target and drives `gamesWon`/`isWinner`/win-streak/solo XP bonus.
  - **Multi:** podium unchanged (top-1, or top-3 when ≥ `PODIUM_THRESHOLD` players, score > 0). **No per-player medals** — ranking is the story (avoids the "Platine at 2nd place" confusion).
  - Removed `VICTORY_CONDITIONS.SOLO` ratios + `RANKS`/`getRank`/`RANK_COLOR_CLASSES`.
- [x] **`victory.test.ts`** rewritten (mastery-ratio solo win/loss incl. the Duo case, difficulty-scaled thresholds, early-quit denominator, podium sizing, zero-score guard, `soloMedal` null in multi). `VictoryData` gains `soloMedal`/`soloTargetRatio`. **54/54** shared tests pass (thresholds retuned: lowered overall, Platinum given a margin + scaled by difficulty).

#### Server
- [x] **`MatchEngine.finish()`**: passes per-player `matchCorrectCount`/`matchTotalCount` + normalized `songDifficulties` to `computeVictory`; solo `isWinner` now = Bronze+. Injects `soloMedal`/`soloTargetRatio` into the `game_over` payload (medals no longer attached per player).

#### Client
- [x] **`StandardGameOver`**: solo shows the medal badge on the avatar + a mastery progress bar (score vs the required Bronze score), VICTOIRE/DÉFAITE driven by the medal. Multi ranking rows show each player's `X/Y bonnes réponses` (no medals).

#### Verification
- [x] `pnpm --filter @aniquizz/shared test` — **54/54**; server typecheck OK; client `tsc --noEmit` OK.

### Friends ✅ (step 3 — core + enhancements)

Delivered in two passes: **core** (add by exact username, requests, presence dot, Profile panel) then a full **enhancement** pass (play-together, contextual add, recent players, rich presence, header dropdown, blocking + privacy, public-profile modal).

#### Database (`packages/database`)
- [x] **Migration `20260706180000_phase7_friendship`**: `Friendship` (`requesterId`/`addresseeId`/`status`), enum `FriendshipStatus (PENDING|ACCEPTED|BLOCKED)`, `Profile.sentRequests`/`receivedRequests`. `@@unique([requesterId, addresseeId])` + `@@index([addresseeId, status])`.
- [x] **Migration `20260706190000_phase7_friend_privacy`** (applied via `prisma migrate deploy`): `Profile.allowFriendRequests Boolean @default(true)`. Client regenerated (engine DLL rename = benign Windows lock from the running dev server; JS/types written).

#### Shared (`packages/shared`)
- [x] `game.ts`: **`PresenceStatus`** (`offline|online|in_lobby|in_game`); `FriendSummary` now carries `status` + `roomId`/`roomName`/`joinable` (replaces the `online` boolean); `FriendsState` gains `blocked` + `allowFriendRequests`; `FriendPresencePayload` carries rich status + room; new `RecentPlayer`, `LobbyInvitePayload`, `PublicProfile`.
- [x] `events.ts`: `FriendRequestInput` accepts **username OR userId**; `JoinLobbyInput.fromInvite`. New C→S: `friends:block`/`unblock`/`invite`/`recent`/`set_privacy`, `profile:get_public`. New S→C: `friends:recent`/`invite_received`/`info`, `profile:public`.

#### Server
- [x] **`friendsService.ts`**: presence-aware `getState` (injected `ResolvePresence`, partitions accepted/incoming/outgoing/**blocked**, status-ranked sort, returns `allowFriendRequests`); `sendRequest` by username **or** userId (guards self/dup/already-friends/blocked + honors target privacy; mutual auto-accept); `blockUser` (wipes relationship → directional `BLOCKED` row), `unblockUser`, `setPrivacy`, `getRecentPlayers` (non-bot co-players from recent `MatchPlayer`, excludes existing relations), `isBlockedEitherWay`, `getProfileLite`.
- [x] **`friendsPresence.ts`**: `resolvePresence`/`presenceResolver` derive status from `GameManager.getUserPresence` (offline if no socket, else online/in_lobby/in_game + joinable room); `broadcastPresence` emits the rich payload to online friends.
- [x] **`GameManager.getUserPresence`**: user → `{status, roomId, roomName, joinable}` from live rooms.
- [x] **`friendsHandlers.ts`**: adds `block`/`unblock`/`invite`/`recent`/`set_privacy`/`get_public`. Invite validates the caller is in a room + not blocked + target online, then emits `friends:invite_received` (notification/shortcut only). `profile:get_public` → `profileService.getPublicProfile` (stats + `relation`).
- [x] **`profileService.getPublicProfile`**: public card (level/xp/role/games/wins/bestScore/presence) + viewer `relation`.
- [x] **`lobbyHandlers.joinLobby`**: private rooms **always require the password** (invites/"Rejoindre" are shortcuts, not a bypass — `password_required` opens the client prompt).
- [x] **`SocketManager`**: passes `gameManager` to friends handlers + `broadcastPresence`; **re-broadcasts presence** on `lobby:create`/`join`, `leave_room`, `start_game`, `game:return_to_lobby`/`cancel` (next-tick, after room state settles).

#### Client (`features/friends`)
- [x] **`FriendsContext`** (app-wide provider, replaces the old `useFriends` hook): single live state (friends/incoming/outgoing/blocked/privacy/recent + `onlineCount`), all actions (`sendRequest`/`addById`/`accept`/`reject`/`remove`/`block`/`unblock`/`invite`/`setPrivacy`/`refreshRecent`/`openProfile`), `relationOf`, presence patching, invite toast with a **"Rejoindre"** action, and the mounted `PublicProfileDialog`. `presence.ts` holds the shared helpers (`presenceLabel`, `formatLastSeen`).
- [x] **`FriendsPanel`**: rich presence (colored dot + label + current room), "vu il y a X", privacy toggle, **recent-players** section (1-click add), **blocked** section (unblock), **"Rejoindre"** on a friend in a joinable lobby, click a row → profile modal.
- [x] **`FriendsMenu`** (header dropdown): online count + pending-request badge, quick accept/reject, join a friend's lobby, "Gérer mes amis".
- [x] **`AddFriendButton`** (contextual, relation-aware): on **game-over** ranking rows + **lobby** player cards (hidden for self/bots/friends; incoming → mutual-accept).
- [x] **`InviteFriendsButton`**: lobby-side dropdown to invite online friends into the current room.
- [x] **`PublicProfileDialog`**: avatar/level/role badge/presence/stats + relation-driven actions (add/accept/remove/block/unblock).
- [x] **`GameHub`**: joins via invite (`fromInvite`) navigation state.

#### Verification
- [x] Shared build OK; server `tsc --noEmit` OK; client `tsc --noEmit` OK; friends folder lint = 0 errors (1 idiomatic `react-refresh` provider+hook warning). Pre-existing `no-explicit-any` debt in `GameHub`/`Profile`/`StandardGameOver` untouched. Live socket flow to smoke-test in-app.

### Play page (GameHub) rework

#### Decomposition (presentational GameHub)
- [x] **`useLobbyController` hook** (`features/hub/hooks/useLobbyController.ts`): owns the whole Play/lobby state machine — socket lifecycle + listeners (`lobby:joined`, `room_updated`, `game_started`, `rooms_update`, `error`, …), lobby state, view transitions, dialogs and every emit action (`startSolo`, `createOrUpdateRoom`, `joinRoom`, `submitPassword`, `refreshRooms`, `goBack`, …). `GameHub.tsx` is now purely presentational.
- [x] **View components** extracted: `ModeSelectView` (mode roster + `ModeCard` + `DailyQuizCard`) and `RoomListView` (join-by-code + `RoomList`). `MODE_CARDS` moved out of `ModeCard` (fixes `react-refresh/only-export-components`).
- [x] **19 `no-explicit-any` removed** from the old `GameHub` (typed socket payloads, location state, wire room settings).

#### Role badges (replaces role rings)
- [x] Small square **staff badges** next to usernames — `components/ui/RoleBadge.tsx` (ADMIN = red + sword, MODERATOR = blue + gavel, nothing for USER). Shown in friends lists, lobby, invites (right of the name); **not** in the profile header (which uses its own labelled badge). Role rings removed from `UserAvatar`.
- [x] **Server propagation** so badges are live: `role` added to `FriendSummary` (`friendsService`), `GamePlayer` (`toPublicPlayer`), `RoomPlayer` (`Room.addOrReconnect` from `socket.data.role`); `home_stats` payload gained `inMultiplayer`.
- [x] **DiceBear avatars removed** everywhere: `UserAvatar` (+ `ProfileHeader`, `ProfileView`, `Leaderboard`) now show uploaded images only, else initials on a dark background.

#### Teasers
- [x] Multiplayer card shows a live **"N joueur(s) en multijoueur"** teaser (`gameManager.countMultiplayerPlayers()`, polled).

### Home & Play hub — navigation polish ✅

#### Home page CTAs
- [x] **« Quiz du Jour » → « Classement »** on the home hero (`HeroSection`): secondary button now links to `/leaderboard` (Trophy icon).
- [x] **`/leaderboard` → Coming Soon** placeholder (same pattern as Daily: animated icon, back to home). Live REST API kept server-side for Update 1.
- [x] **`/daily`** back link → `/play` (hub is the natural parent).

#### Play hub (`ModeSelectView`)
- [x] **`DailyQuizCard`** added under the mode grid — disabled teaser (greyed, no click, « Bientôt » badge), same treatment as Compétitif.
- [x] **Mode cards aligned:** fixed-height slots (icon / title / description / teaser) so Solo / Multi / Compétitif line up; grid `items-stretch`.
- [x] **Compétitif card:** red `destructive` gradient logo; static `<div>` (no hover-lift, no click) like DailyQuizCard.

#### « Le saviez-vous » removed (deferred → Update 1)
- [x] Deleted `TriviaCard.tsx` + `triviaData.ts`; removed from Play hub and News page. Re-add scope documented in **Update 1** (carousel widget, placement TBD).

### Home — floating widgets (Settings + Amis) ✅

- [x] **Morphing expand panels** (no modal / no detached popover): the trigger stays pinned; content grows fluidly out of the button via `grid-template-rows` + width/border-radius transitions; close via X, toggle, outside click, or Escape.
- [x] **Settings** (`FloatingSettingsButton`): bottom-right square → expands to `w-[26rem]`; gear centered when closed (`w-0` on hidden title/X slots); inline « Bientôt disponible » content (replaces `GlobalSettingsModal` on home — modal still used in-game).
- [x] **Amis** (`FriendsBubble`): bottom-left pill → vertical-only expansion (`w-[280px]` constant, `rounded-3xl`); list capped ~4 friends + « Gérer mes amis »; no circular morph phase.

### Game-over — contextual add friend ✅

- [x] **`AddFriendButton`** on multi **`FinalRanking`** rows: always visible at **`opacity-40`** (full on row hover/focus); repositioned **left of the score** (in flex flow, not under pts).
- [x] **Robustness pass:**
  - **Race fix:** `sendRequest` / `acceptRequest` run in a Prisma transaction with **`pg_advisory_xact_lock`** on the user pair; legacy dual-`PENDING` rows auto-repaired.
  - **Accept path:** incoming requests call **`accept(requestId)`**, not `addById`.
  - **Blocked by other:** `FriendsState.blockedByUserIds` — button hidden when the target blocked you (ids only, no UI detail).
  - **Optimistic UI:** instant « Envoyée » / accept hides button; rollback on `friends:error`, confirm on `friends:state`.
  - **Hide guards:** bots (`bot-*` + `isBot` prop), self, existing friends, blocked (both directions).

### Client audit closure ✅

Full client pass after the Phase 8 UI rework — CI-blocking issues fixed, dead code removed, tokens unified.

#### ESLint / TypeScript (CI)
- [x] **`catch (err: any)`** → `unknown` + `getErrorMessage()` (`lib/errors.ts`) in `AuthModal` + `ResetPassword`.
- [x] **`tailwind.config.ts`**: `require("tailwindcss-animate")` → ESM `import`.
- [x] **`AuthContext`**: `signOut` / `refreshProfile` wrapped in `useCallback`; `useMemo` deps fixed; console noise → `captureClientError`.

#### Design tokens & typing
- [x] Raw Tailwind colors replaced in **`ProfileView`**, avatars (`UserAvatar`, `ProfileHeader`), **`SuspensionBadge`**, **`InviteFriendsButton`**.
- [x] **`StatColorToken`** union (`statColors.ts`) wired through **`StatCard`** + **`StatsCarousel`**.
- [x] **`parseGameNavState()`** (`gameNavState.ts`), **`isStatsData()`** guard on profile socket payload, **`createSoundTypeToggler()`** extracted to `formOptions.ts`.

#### Dead code / dedup / bundle
- [x] **`Daily.tsx`** deleted; `/daily` → redirect `/play`.
- [x] Shared **`ComingSoonPage`** (Leaderboard, Library) + **`SettingsComingSoonContent`** (FAB + in-game modal).
- [x] **`AuthModal`** single mount in `App.tsx` (removed from `Header`).
- [x] **`framer-motion`** kept for **`PlayersFloor`** layout spring (player-card reorder in multi); unused elsewhere.
- [x] **Lazy routes** (`React.lazy` + `Suspense`) on all page imports.

#### Routing / auth / a11y
- [x] **`/profile`** now behind **`ProtectedRoute`** (same as `/profile/:userId`); loading skeleton instead of blank `null`.
- [x] **`NotFound`**: French copy + React Router `<Link>`.
- [x] **News** filter chips: `aria-pressed`; **Header** admin: `aria-label`; **FriendsPanel** join: `aria-label`.

#### Verification
- [x] Client `tsc --noEmit` OK; ESLint **0 errors** (4 pre-existing `react-refresh/only-export-components` warnings on shadcn/context files).

#### Post-audit polish (final session)
- [x] **Library** Coming Soon: **`showHeader`** enabled (was missing vs Leaderboard).
- [x] **Home → News deep-link:** clicking a home news card navigates to `/news#news-<id>`, expands that card, and scrolls it into view (`scroll-mt-28` on `NewsCard`).
- [x] **Header profile chip:** visible pill affordance (border/bg at rest, chevron, hover primary) — **`ProfileButton`** reads as navigable.
- [x] **Friends bubble:** global online count polled every **10 s** (was 20 s); friends online count stays real-time via socket.

#### PLAN.md — Update 1 additions (Phase 8)
- [x] **Leaderboard (global):** expanded spec (criteria tabs, filters, pagination, server API).
- [x] **Le saviez-vous ?:** deferred trivia widget spec.
- [x] **Song start position:** advanced lobby option (`beginning` vs `random` clip offset).
- [x] **Phase 9:** mute/ban verification + **anti-cheat & security audit** checklist.

### Multiplayer room list (polish)
- [x] **`RoomList`**: **"Amis"** filter (Tous/Publics/Privés/Amis) — keeps only rooms hosting a friend (live `FriendSummary.roomId`), no server change.
- [x] **CSS tokens**: all raw colors → semantic tokens (difficulty `success`/`info`/`destructive`, `warning`/`accent`/`aqua`/`primary` chips, playing = `destructive`, players `success`/`destructive`); fixed the invalid `fill-current/20` class; local `RoomSummary` type replaced by shared `RoomListItem`.
- [x] **UX**: Enter-to-join on the code field (clears on wrong/stale code, staying on the list), room count "N salon(s) disponible(s)", discreet **refresh** button (`refreshRooms` → `get_rooms`), room **sorting** (joinable first, friend rooms bumped, playing/full last), filter buttons `aria-pressed`, harmonized full-width alignment.

### Game-config forms rework (Solo & Multi)

#### Decomposition
- [x] **`GameConfigForm` split** into a thin orchestrator + `features/hub/components/config/*`: `formOptions.ts` (data + `estimateMatchMinutes`), `ConfigPrimitives.tsx` (`SectionHeader` with a keyboard-focusable help trigger, reusable a11y `OptionButton`, `FOCUS_RING`), `RoomSettingsSection`, `RulesSection`, `SourceSection`, `FiltersSection`. A single typed `update()` helper removed the repeated `setConfig(prev => …)` + `as string` casts.

#### CSS / a11y / bug fixes
- [x] **Tokens everywhere**: difficulty `success`/`warning`/`destructive`, precision `accent`, AniList box `info`, filters/room boxes on `secondary`/`border`; removed `green/blue/red/cyan/yellow/purple-*` and `white/5`,`white/10`. **Fixed a real bug**: `shadow-[0_0_20px_rgba(var(--primary),0.3)]` (invalid — `--primary` is an HSL triplet) → `hsl(var(--primary)/0.25)`.
- [x] **a11y**: `type="button"` + `aria-pressed` on all toggles, `role="tablist"`/`aria-selected` source tabs, `aria-label` on sliders, gated types labelled "(bientôt disponible)", focus rings.

#### UX additions
- [x] **Estimated duration** "≈ N min de partie"; per-mode/precision descriptions; **Watched** properly gated (needs login **and** a linked AniList, with an explicit reason) — matches the server's watched resolution.
- [x] **Layout**: removed the redundant single-option "Mode de jeu" section; **Filtres & contraintes** moved full-width below the 2-col grid (Types + Difficulté side by side); footer black band removed; "Salon privé" switch moved to the section header (top-right) with the **password field appearing under the room name** (white label). Compacted spacing so the multi form fits **without scroll**, even with the password field shown.
- [x] Generic room-name placeholder ("Nom de votre salon"); dropped the "Donnez un nom au salon" hint (server auto-names instead).

#### Playlists → removed (coming soon), to be redone in Update 1
- [x] The **Playlists** music source (genre/decade/top-50 presets) removed end-to-end — client (`SourceSection` shows a disabled "coming soon" tab; `RulesSection` decade section gone), shared (`GameConfig.playlist`/`decade`, `GAME_CONFIG.PLAYLISTS`/`DECADES`), and server (`settings` schema, `PlaylistBuilder`, `gameService` playlist filter + `getChoiceCandidates` args). Random/Watched selection intact. Display strings cleaned in `RoomList`/`Game`/`MultiplayerLobby`. Re-listed in **Update 1** to rebuild cleanly (data-backed model).
- [x] **OST** sound type removed from the forms + server mapping (`ost → INSERT`) — kept the admin catalogue `SONG_TYPES` (DB may hold INSERT songs). Endings stay as a coming-soon toggle.

#### Behaviour / limits
- [x] Removed the **"Rejouer les derniers paramètres"** shortcut (UI + hook + localStorage).
- [x] **Default room name** = **"Salon N"**, the first free integer among live rooms (`gameManager.nextDefaultRoomName()`, gaps reused); client sends an empty name so the server decides.
- [x] **Player limits**: `maxPlayers` slider **2 → 50** (aligned on `MAX_PLAYERS_PER_LOBBY`), **default 16** (client + server zod default). Server still hard-caps at 50.
- [x] **Sound count**: **5 → 100, step 5, default 20** — client slider **and** server zod (`min(5).max(100).default(20)`), so it's enforced, not just visual.

#### Verification
- [x] Client `tsc --noEmit` OK; server `tsc --noEmit` OK; shared rebuilt (`dist`); changed files ESLint-clean.

### Standard game-over — solo refactor ✅

#### Shared / server contract
- [x] **`RoundHistoryEntry`** + **`GameOverPayload`** moved to `packages/shared/src/game.ts` (`answerType`, `myAnswer`, `ANSWER_TYPE_LABELS`).
- [x] **`MatchSettingsSnapshot`** + **`pickMatchSettings()`** — authoritative lobby config in `game_over` + reconnect **`GameSyncState.matchSettings`** (avoids stale React Router nav state).
- [x] **`MatchEngine.buildRoundHistoryByUser()`** — per-player round recap (incl. unanswered rounds: `answerType: null`, 0 pt); emitted on `game_over` + stored for finished-room sync.
- [x] **`gameManager.getRoomList()`** — solo rooms (`maxPlayers === 1`) hidden from the public join list.

#### Client architecture
- [x] Removed pass-through **`GameOver.tsx`**; **`Game.tsx`** → **`StandardGameOver`** → **`SoloResult`** directly.
- [x] Decomposed **`gameover/solo/`**: `SoloConfigHeader` (STD strip + lobby-style chips via `getDifficultyBadge`), `SoloScoreCard`, `SoloMasteryBar` (`medalMarkerRatios`, `nextMedalGoal`), `SoloGameOverActions`, **`RoundHistoryList`** (shared with multi dialog).
- [x] **`gameReducer`**: `matchSettings` state; `GAME_OVER` / `SYNC` hydrate it; **`ROUND_REVEAL`** always appends a history row when `myUserId` is known (even without an answer).
- [x] **`Game.tsx`**: `gameOverSettings = state.matchSettings ?? settings`; loader when `phase === 'ended'` without `victoryData`; **`handleReplay`** guarded (`roomId` + `victoryData`).

#### UI polish (solo)
- [x] Layout: score column 2/5 + detail panel 3/5 (`max-w-6xl`), fixed **600px** round-detail height, settings bar aligned with lobby/room list.
- [x] **Mastery bar**: medal icons above thresholds, point labels under markers, hint *« Encore X pts pour la Médaille Y »*.
- [x] **Victory**: confetti layer (`ConfettiLayer`, fixed viewport), success glow on card, medal badge on corner (`animate-medal-wiggle`).
- [x] **Defeat**: red vignette + matching confetti density, score **`X / Y pts`**, compact **+XP** pill top-right of score card, avatar ring fix (no double-border artifact).
- [x] **Tailwind**: `packages/shared/src/**` added to `content` paths so `text-medal-bronze` etc. are not purged.

#### PLAN.md (Update 1)
- [x] **Franchise catalogue cleanup** + **statistical charts** (profile/stats by mode, song type, difficulty, medals…) added to deferred scope.

#### Verification
- [x] Client + server `tsc --noEmit` OK; shared rebuilt.

### Standard game-over — multi refactor ✅

#### Architecture
- [x] **`MultiResult.tsx`** orchestrator (confettis, `MatchConfigHeader`, grid podium + ranking, detail dialog) — mirrors solo's `SoloResult`.
- [x] **`StandardGameOver.tsx`** thinned to solo/multi router only.
- [x] Shared **`MatchConfigHeader`** (renamed from solo-only header; `SoloConfigHeader` deprecated alias).
- [x] Shared **`ConfettiLayer`** + **`confettiPresets.ts`** (solo + multi palettes, design-token colors only).
- [x] Shared **`XpEarnedBadge`** (solo score card + multi « Moi » row, top-right pill).

#### Data / logic fixes
- [x] **`buildPodiumLayout()`** + **`getDistinctRanks()`** — podium shows the top 3 **distinct competition ranks** (not raw array indices); badge `#rank` matches server tie rules; `+N` chip when ex-aequo.
- [x] **`isPlayerWinner`** ← `victoryData.winnerIds` (no more index `< multiWinnerCount` heuristic).
- [x] **`frenchOrdinals.ts`** — « à la 1re place », « à la 5e place », etc.

#### UI parity with solo
- [x] Settings strip (`MatchConfigHeader`) above multi layout.
- [x] Full confetti density — gold/warning palette for winners, destructive for non-winners.
- [x] Podium scores → **`X pts`**; `font-display` + `stage-text` on victory title; destructive tint on « Terminé ».
- [x] Round detail dialog — full **`RoundHistoryList`** (answer-type badges, song type).
- [x] Ranking rows — token-only styling (`shadow-card`, semantic rings per podium tier).

#### Verification
- [x] Client `tsc --noEmit` OK.

### Standard game-over — multi polish (post-refactor) ✅

#### UI
- [x] **Podium ex-aequo:** up to **3 overlapping avatars** per podium tier + **`+N`** chip for overflow (`PodiumAvatarStack` in `MultiPodium.tsx`).
- [x] **Titles:** **« Victoire »** / **« Défaite »** (no more « Terminé » / « Victoire ! »); victory title in **`text-success`**, `tracking-normal` + padding so the word is not clipped by gradient text.
- [x] **Final ranking:** green **`Check`** icon + **`X / X bonnes réponses`** under each pseudo.
- [x] **Confetti:** multi victory uses the **same green + gold palette as solo** (`SOLO_VICTORY_CONFETTI`); defeat stays destructive red.

#### Server — tie-aware victory + XP
- [x] **`computeVictory` (multi):** winners = everyone at or above the **competition rank of the Nth sorted player** (Olympic-style cutoff), not raw array indices — ex-aequo on a winning tier all get `winnerIds` / `isWinner` / win-streak / `gamesWon`.
- [x] **`computeCompetitionRanks`** extracted to `packages/shared/src/ranking.ts` (1-2-2-4); client `computeRanks` delegates to it.
- [x] **XP placement bonus** uses competition ranks (ex-aequo at the same tier get the same placement XP); `MatchEngine` no longer uses `index + 1`.
- [x] **`victory.test.ts`** + **`ranking.test.ts`**: tie scenarios covered; **69/69** shared tests pass.

#### Verification
- [x] Client + server `tsc --noEmit` OK; shared tests pass.

### Multiplayer lobby — player levels ✅

- [x] **Level badge** on `LobbyPlayerCard`: **`Nv X`** pill anchored bottom-center on the avatar (primary→accent gradient, same language as profile).
- [x] **Server wiring:** `levelFromXp(profile.xp)` resolved at **socket auth** (`authMiddleware.loadModeration`); stored on `RoomPlayer` → `toPublicPlayer` → lobby payloads. Bots **omit** `level` on the wire.
- [x] Client maps `level` in `useLobbyController` → `LobbyPlayer`.

### Bots — excluded from progression & social ✅

Bots remain **DEV-only in-memory players** for multiplayer testing; their `Profile` rows are empty shells (stable `bot-*` ids).

#### Gameplay / persistence
- [x] **`MatchEngine.persistMatch`**: humans only — bots never written to `MatchPlayer` / `RoundAnswer`.
- [x] **`MatchRepository`**: `getXpState` + `persistMatch` filter `isBotId`; no aggregate stat / XP / `SongHistory` updates for bots.
- [x] **Lobby UI:** no level badge, no « Ajouter en ami » (unchanged).

#### Database hygiene
- [x] **`cleanupBotHistory()`** (`packages/database/src/botCleanup.ts`): deletes bot `MatchPlayer`, `RoundAnswer`, `SongHistory`, `Friendship` rows.
- [x] **`seed:bots`**: resets all bot profile counters to zero on every upsert **and** runs cleanup.
- [x] **`cleanup:bots`** script (`pnpm --filter @aniquizz/database cleanup:bots`, dev-guarded).

#### Social / discovery blocks
- [x] **Friend requests** to bots refused server-side (`resolveTarget` + invite handler).
- [x] **Public profile** blocked for bots (`getPublicProfile`, `profile:get_public`, client redirect on `/profile/bot-*`).
- [x] **Recent players** already skipped bots (unchanged).

#### Verification
- [x] `seed:bots` run confirmed (16 profiles + cleanup); client + server typecheck OK.

### Leaderboard — early wiring ✅ (UI deferred to Update 1)

- [x] **`GET /leaderboard`** (public REST): top 50 humans by XP (level tab) and by `gamesWon` (competitive tab); **`bot-*` excluded**.
- [x] **`lib/serverApi.ts`** client fetch helper wired.
- [x] **`Leaderboard.tsx`:** live API replaced by **Coming Soon** placeholder (Update 1 will ship the full tabbed UI).
- [ ] **Deferred within Update 1:** competitive rank tiers, multiple criteria tabs, pagination, profile links on rows, optional socket API.

### PLAN.md — Phase 9 additions

- [x] **Dev accounts** entry: rotate seeded Test account **email + password**.
- [x] **Moderation (mute / ban):** end-to-end verification checklist.
- [x] **Anti-cheat & security audit:** gameplay leaks, identity/auth, RLS/data exposure, social abuse, admin/dev guards + integration tests.

### Deferred → Update 1 (after Phase 9)
- **Playlists music source:** rebuild the removed genre/decade/top-50 selection properly (data-backed), client + server + shared.
- **Leaderboard (full UI):** tabbed global rankings (level, wins, precision, streaks, medals…), filters, pagination — REST foundation ✅.
- **Le saviez-vous ?:** anime trivia carousel widget (data source + placement TBD).
- **Song start position:** advanced lobby option (`beginning` vs random clip offset).

## Done (Phase 6 — Dev environment, test tooling & Admin) ✅ complete

### Schema (`packages/database`)
- [x] **Migration `20260706160000_phase6_admin_fields`** (applied live): `Profile.bannedUntil`, `Profile.mutedUntil`, `Profile.lastSeenAt?` + `@@index([lastSeenAt])`. `role` (`UserRole`) already existed. Prisma client regenerated.
- [x] **Bot roster** in `src/bots.ts` (`BOT_PROFILES`, `BOT_ID_PREFIX`, `isBotId`) — 8 deterministic `bot-*` profiles, re-exported from `@aniquizz/database`. `bot-` prefix → trivial future leaderboard exclusion.
- [x] **Seed script** `scripts/seed_bots.ts` (`seed:bots`, dev-guarded) — upserts the 8 bot profiles; **run live** (8 profiles seeded).

### Shared (`packages/shared`)
- [x] **`roles.ts`**: `UserRole` union + `hasRole`/`isStaff`/`isAdmin` hierarchy (USER < MODERATOR < ADMIN), dependency-free, used by client + server.
- [x] `SocketData` gained server-resolved `role` + `mutedUntil`; `GamePlayer` gained `isBot?`.

### Server — role infra & moderation
- [x] **`authMiddleware` refactor**: extracted `resolveIdentityFromToken()` (reused by HTTP admin auth); the socket handshake now loads DB `role` + `bannedUntil`/`mutedUntil`, **rejects banned users**, and sets `socket.data.role`/`mutedUntil`.
- [x] **Mute enforcement** in `chatHandlers` (muted sender's message dropped + notified).
- [x] **`core/httpAuth.ts`**: `requireRole(min)` Express middleware — Bearer token → DB role check (server-authoritative), attaches `req.actor`.
- [x] **Presence heartbeat**: `SocketManager` writes `Profile.lastSeenAt` on connect/disconnect (best-effort; ignored for guests) — powers admin presence + "last seen".
- [x] **Single active socket per user**: on each new connection older sockets of the same user are dropped, so a reconnect (auth `disconnect().connect()`) can't leave a ghost socket delivering every emit twice (root cause of duplicate toasts).

### Server — Admin REST (`modules/admin`, mounted at `/admin`)
- [x] **Users** (`adminService` + routes): paginated list/search (50/page) with live filtering; `GET /users/:id/profile` (full profile for the detail modal); change role (ADMIN); **ban/unban (MODERATOR)**; mute/unmute (MODERATOR); reset stats (ADMIN); **disconnect** a user's live sockets (MODERATOR). Configurable durations (1h…permanent). Ban/mute push a live `force_logout`/sanction to the target's sockets so it applies immediately; self-role/self-ban guarded.
- [x] **Live rooms/matches**: `GET /rooms` returns a rich snapshot (settings, `createdAt`, private code/password, `humanCount`/bot split, live `AdminMatchProgress` — round X/Y, current anime/title, `endsAt`); force-end match, close room, kick player (MODERATOR).
- [x] **Catalogue — full manager**: hierarchical `GET /catalogue/tree` (Franchise → Anime → Song, A→Z, franchise-paginated, "Sans franchise" bucket, multi-level search, status/difficulty/lock filters, global counts) + legacy flat list kept. Full CRUD: extended `PATCH` on song/anime/franchise (**all** fields incl. `videoKey`, `sourceUrl`, `songType`/`sequence`, tags, move via `animeId`/`franchiseId`), create/delete (ADMIN), bulk song update (MODERATOR). Prisma write errors mapped to 409/404/400.
- [x] **Stats — overview**: `GET /stats/overview?period=` aggregates live metrics (`gameManager.getLiveRoomStats`: uptime, sockets, unique online, rooms public/private/waiting/playing/paused, humans vs bots, RSS, Node) + DB metrics (players total/new/active, sanctions, role split, AniList adoption, matches total/period/per-day, avg duration, correct rate, catalogue health, discovered songs, top animes/songs, top difficulty/mode). `POST /stats/reset-activity` (ADMIN) wipes match history + song discovery.
- [x] **`GameManager`** admin ops: `getRoomDetails` (enriched), `getLiveRoomStats`, `forceEndMatch`, `closeRoom`, `kickPlayer`, `addBotsToRoom`, `removeBotsFromRoom`, `createBotScenario` (headless **or** hosted-by-caller); `Room` gained `addBot`/`kickPlayer`/`forceCancel`/`humanCount`/`createdAt`/`getAdminProgress`; solo mid-match quit now resets the room to `waiting`.

### Server — Dev tooling (DEV ONLY, env-guarded)
- [x] **Simulated players (bots)**: in-process virtual players (no socket). `Room.addBot` pulls from the roster; `MatchEngine.scheduleBotAnswers` makes each bot answer once per round with configurable accuracy + delay (correct → a valid answer, wrong → a decoy choice). Bots return to the lobby ready after a match. Bot timers cleared on round/end/cancel.
- [x] **Lifecycle hardened for bots**: `hasConnectedPlayers`/`settleLifecycle`/`promoteNextHost`/vote-quorum all **ignore bots**; a bot-only room is torn down (no human ⇒ empty).
- [x] **Dev endpoints** (ADMIN + dev): `POST /dev/rooms/:id/bots` (add N bots w/ behavior config), `POST /dev/rooms/:id/remove-bots` (−N / clear), `POST /dev/scenario` (bots room, `join` = hosted-by-caller so the admin lands in the lobby, or headless auto-start; rich settings), `GET /dev/info`; `POST /dev/claim-admin` (first-admin self-bootstrap when no admin exists yet). The Dev Tools tab is ADMIN-only (hidden from moderators even in dev).

### Client (`apps/client`)
- [x] **`lib/adminApi.ts`**: typed admin REST client (Supabase Bearer token, French error surfacing) — users, rooms, catalogue tree + CRUD, stats overview, dev tooling.
- [x] **`/admin` route** (session-gated in `App.tsx`, role verified server-side on every call): `pages/Admin.tsx` with tabs — Users / Rooms / Catalogue / Stats / (Dev Tools in dev). `onGoToRoom` cross-links Users/Dev → Rooms with highlight. Non-staff see an access-denied card with a dev-only "Devenir admin" button.
- [x] **UsersPanel**: bots after humans then A→Z, live search, filter chips (role/muted/banned/online/in-game), clickable column sort (XP/games/created/seen), header counters, presence badges (online/in-game/offline), "current lobby" link, last-seen, pagination (50/page), full-row click → real profile modal (`ProfileView`), bots non-clickable & read-only. Confirmations on ban/mute/reset; mute+**ban** available to mods, disconnect/reset admin-only.
- [x] **RoomsPanel**: colored/translated status badges (waiting/playing-pulse/paused/finished), player avatars + connection dots, enriched header (lock, game mode, bot vs human), config badges, live match progress (round X/Y, anime/title, progress bar, countdown), "open since", ghost-room badge, search/filter/sort, player→profile modal, copy code/password, confirmations, header counters, skeleton + smooth transitions.
- [x] **StatsPanel**: 3 sections (Temps réel / Communauté / Activité de jeu) with rich `StatCard`s, `SegmentBar`s, `TopList`s and a `recharts` matches-per-day chart; period selector (24h/7d/30d/all), 60 s auto-refresh toggle, admin-only "reset activity".
- [x] **CataloguePanel — full manager**: accordion tree Franchise → Anime → Song, debounced search, status/difficulty/lock filters, counters + coverage, franchise-level pagination (smooth scroll-to-top), inline quick edits (difficulty/status/lock, optimistic), bulk-edit bar, video preview dialog (R2), Save/Cancel edit dialogs for song/anime/franchise (create + edit, all fields, move), delete with cascade-aware confirmations (create/delete ADMIN-gated via `canManage`).
- [x] **Suspension surfacing**: `features/auth/components/SuspensionBadge` shows ban/mute + remaining time in the header (`lib/suspension.ts`).
- [x] **Toasts**: repositioned bottom-right, `richColors`; critical/victim events (ban, mute, disconnect, admin-terminated game/lobby) shown as red `toast.error`.
- [x] **Header**: "Admin" shield link shown to staff (`hasRole(role,'MODERATOR')`).

### Verification
- [x] Server typecheck OK; client `tsc --noEmit` OK; changed files ESLint-clean.
- [x] `pnpm --filter @aniquizz/shared test` — **35/35** pass (no regressions).
- [x] Client lint CI blockers resolved in the **client audit closure** (`Game.tsx`, `Profile.tsx`, `tailwind.config.ts`, `AuthModal`, `ResetPassword`).
- [x] **`get_advisors` re-run** (post `phase6_admin_fields`): no new issues — only `_prisma_migrations` RLS-no-policy (intentional deny-all), leaked-password protection (Auth dashboard, deferred), and `unused_index` INFO (incl. new `Profile_lastSeenAt_idx`, expected on empty dev DB).

### Phase 6 notes / decisions
- **Bots = in-process virtual players** (user-approved) with seeded `bot-*` profiles so matches persist realistically; excluded from lobby quorum/host logic. Fully DEV-only (env guard on every dev endpoint).
- **Admin auth is fully server-authoritative**: role read from DB on each request; the client UI gating (`canManage`) is convenience only.
- **Permission split**: MODERATOR = day-to-day moderation (view users/rooms, mute, **ban**, disconnect, end/close/kick, edit catalogue metadata). ADMIN adds high-impact/irreversible actions (change roles, reset stats, catalogue create/delete, reset activity, **dev tools**).
- **First-admin bootstrap** via dev-only `claim-admin` (allowed only when no admin exists yet) so the panel is reachable without manual DB edits.
- **Ban/mute** stored as `*Until` timestamps; ban enforced at socket handshake, mute at chat send; both pushed live to the target's sockets.
- **Catalogue edits are direct-to-DB** via the admin API; the `manual_edits.json` pipeline import is untouched. `altNames` partial search unsupported (Postgres array), so search covers anime name + song title/artist.
- **Removed the dev account-switcher** (`features/dev/DevBar`): confusing and low-value; seed scripts for the `@aniquizz.test` accounts remain.

## Done (Phase 5 — Game engine rewrite, Standard mode)

### Shared foundation (`packages/shared`)
- [x] **Typed socket contract** `events.ts`: `ClientToServerEvents` / `ServerToClientEvents` / `SocketData` (canonical `userId`), input payloads (`CreateLobbyInput`, `JoinLobbyInput`, `AnswerInput`, …), `AnimeListEntry`. Consumed by both sides.
- [x] **Domain types** `game.ts`: `GameStatus`/`RoundPhase`/`AnswerType`/`ResponseType`, `RoomSettings`, `RevealSong`, `PhaseTiming` (server-clock sync), all wire payloads (`RoundStartPayload`, `RoundRevealPayload`, `AnsweredPayload`, `GameSyncState`, `VictoryData`, …).
- [x] **Pure, testable logic:** `scoring.ts` (`scoreForAnswer`, `maxPointsPerRound`), `victory.ts` (`computeVictory` solo/multi), `selection.ts` (`buildChoices`/`buildDuo`, Fisher-Yates via `shuffleArray`).
- [x] `types.ts`: `GamePlayer` gained anti-cheat fields `hasAnswered` + `answerType`.

### Persistence (`packages/database`)
- [x] **Migration `20260706130000_phase5_match_models`** (applied live): enums `GameMode`/`MatchStatus`/`AnswerType`; models `Match`/`MatchPlayer`/`MatchRound`/`RoundAnswer` (full per-round detail); dropped `GameSession`/`GameParticipant`.

### Server engine (`apps/server/src/modules/game/engine`)
- [x] **Decoupled components (no god object):** `Room` (lobby + players by `userId`, reconnect via `getSyncState`), `MatchEngine` (round loop, anti-cheat, host votes), `RoundClock` (authoritative single-shot timer), `PlaylistBuilder` (pre-generates all round choices at match start, truly random QCM pool, watched-mode resolution, merged cascade queries), `ScoringStrategy` (isolated fixed points), `MatchRepository` (atomic Prisma persistence + best-effort aggregate stats/`SongHistory`).
- [x] **Anti-cheat:** during guess only a `game:answered { userId }` boolean is broadcast; answers/correctness/points revealed only at `round_reveal`.
- [x] **`gameService.ts`:** unbiased selection (`shuffleArray`), `getChoiceCandidates` random pool; removed old `generateChoices`/`generateDuo`/`saveGameHistory`.
- [x] **`gameManager.ts`** now manages `Room` instances with grace-period cleanup; no longer a global singleton — injected into `SocketManager` and handlers.
- [x] **Handlers** (`game`/`lobby`/`chat`/`profile`/`general`) rewired to `TypedServer`/`TypedSocket` + `socket.data.userId`; deleted old `classes/GameCore.ts` + `classes/StandardGame.ts`.

### Client (`apps/client`)
- [x] **Typed socket** `lib/socket.ts` (`Socket<ServerToClientEvents, ClientToServerEvents>`).
- [x] **`useGameSocket`** (single subscription, translates the contract into actions, owns resume countdown, exposes action emitters) + **`gameReducer`** (`useReducer`, server-clock timing via `localEndsAt = now + (endsAt - serverNow)`).
- [x] **Thin `Game.tsx`:** UI-only concerns (video, input, dialogs, points animation); presentation-only `StandardGameLayout` unchanged in contract.
- [x] **Identity by `userId`** everywhere: `GameHub` lobby adapted to the new events (dropped `player_joined`/`player_left`/`room_created`/`room_joined`; player changes flow through `update_players`); `GameSidebar` + `StandardPlayerCard` compare against `userId` (added "answered" anti-cheat badge). Removed dead `components/ui/use-toast.ts` stub.

### Tests & verification
- [x] **Vitest** added to `packages/shared`; **35 colocated tests** pass: scoring, victory (solo/multi/podium/zero-score), selection (`buildChoices`/`buildDuo`), Fisher-Yates (permutation, no mutation, deterministic trace, no positional bias), fuzzy (`getFuzzySuggestions`, Levenshtein, `isAnswerCorrect`). Test files excluded from the `tsc` build.
- [x] Verified: `pnpm --filter @aniquizz/shared test` (35/35), shared build, **server typecheck OK**, **client typecheck OK**, **client `vite build` OK**.

### Post-integration fixes (manual playtesting)
- [x] **Reveal video continuity:** `RevealSong` carries `videoKey`; client keeps the same video element playing from where the guess left off (no restart) via `loadedVideoKeyRef` — reload only when `videoKey` actually changes.
- [x] **Random guess start preserved:** confirmed `PlaylistBuilder.pickStartTime` still picks a random offset leaving room for guess + reveal + margin.
- [x] **Game-over round detail:** `gameReducer` accumulates `roundHistory` (incl. the player's own wrong answer as `myAnswer`); `StandardGameOver` renders per-round detail with a strikethrough "Votre réponse" (or "Aucune réponse" when empty), fallback message when history is empty.
- [x] **Response-mode UI:** QCM/Duo switch buttons only render in `mix`; `Game.tsx` blocks the switch actions unless `responseType === 'mix'`.
- [x] **Points animation:** shows once per round (`pointsShownForRoundRef`), auto-hidden on the next `guessing` phase (no more lingering across rounds).
- [x] **Lobby lifecycle hardening:** `isInGame = status !== 'waiting' && !returned` (a player on the game-over screen shows "EN JEU"; badge clears on return); `settleLifecycle()` resolves the room to `waiting` once all **connected** players have returned (disconnected players no longer block); `markInLobby()` on join (refresh/re-entry) frees a stuck badge; `canStartMatch()` enforces host-only + 2-player minimum for multiplayer; removed the "en jeu" emoji.
- [x] **"Salon introuvable" on `/play` refresh:** `GameHub` clears `history.state` after consuming a `returnToLobby` navigation (and on `goBack`), and `onError` recovers to the modes view on a dead-room error — a refresh no longer retries a stale rejoin.
- [x] **Anti-cheat — answer type is never trusted:** server clamps the client-claimed `answerType` to what the room's `responseType` allows (`MatchEngine.effectiveAnswerType`) so points can't be inflated (QCM pick claimed as `typing`); `PlaylistBuilder` no longer builds/sends `choices`/`duo` for `typing` rooms (no QCM data on the wire).

### Verification (post-fix)
- [x] Manual playtesting (solo + 2-player multi) by the user: reveal video, game-over detail, response modes, lobby status transitions, refresh recovery — all confirmed fixed.
- [x] Server + client typecheck OK; 35/35 shared Vitest tests pass.
- [x] **`get_advisors` re-run** (post `phase5_match_models`): no new issues — old `GameSession`/`GameParticipant` policies gone. Remaining: `_prisma_migrations` RLS-no-policy (intentional deny-all) + leaked-password protection (Auth dashboard toggle, deferred); performance advisors are only `unused_index` INFO (empty dev DB).

### Phase 5 notes / decisions
- Timing is fully server-authoritative (`PhaseTiming`); the client only maps to its local clock — no client-driven round ends.
- `game_state_sync` (`getSyncState`) drives reconnection: a player rejoining mid-match is restored to the correct phase.
- Scoring strategy is isolated so a future AMQ-style speed mode plugs in without touching the engine.
- **`mix` response mode is honor-system by design:** its QCM choices must reach the client (the player may switch to QCM mid-round), so a tampered client could claim `typing` while peeking. `typing`/`qcm` pure rooms are fully server-enforced; only `mix` trades strictness for flexibility.

## Done (Phase 4 — Code cleanup, Standard mode only)

- [x] **Removed dead game modes (server):** deleted `ChallengerGame.ts`, `TimeTrialGame.ts`; `GameManager` always instantiates `StandardGame`.
- [x] **Removed dead game modes (client):** deleted `modes/challenger/` and `modes/time-trial/`; `Game.tsx` renders `StandardGameLayout` only; simplified `GameConfigForm`, `MultiplayerLobby`, `RoomList`, `PlayerCard`, `GameOver`.
- [x] **`packages/shared` cleanup:**
  - `constants.ts`: removed `CHALLENGER`, `TIME_TRIAL`, `BATTLE_ROYALE` blocks.
  - `types.ts`: `gameType` → `'standard'` only; removed `livesCount`/`startingTime`/BattleRoyale types and mode-specific `GamePlayer` fields.
  - `utils.ts`: `getRank` now driven by `GAME_CONFIG.RANKS`; added `formatSongTypeLabel`; typed `getFuzzySuggestions` with `FuzzyAnimeCandidate`.
- [x] **Prisma schema + migration `20260706120000_phase4_schema_cleanup`** (applied on live Supabase):
  - Enums `SongType` (OP/ED/INSERT) + `Difficulty` (EASY/MEDIUM/HARD); `Song.type` split → `songType` + `sequence`.
  - Timestamps on `Song`/`Anime`/`Franchise`/`PlayerAnimeList`; `onDelete: Cascade` on `Song → Anime`.
  - Dropped `SongVote` + `VoteType`; `SongHistory` reworked to aggregate (`playCount`/`correctCount`/`lastPlayedAt`).
  - FK + hot-column indexes (advisor-confirmed); `Profile` leaderboard indexes.
  - Anglicized schema comments.
- [x] **Pipeline scripts:** `2_fetch_animethemes.ts` outputs `songType` + `sequence`; `3_load_initial_data.ts`, `seed_db.ts`, `seed_dev_catalogue.ts`, `import_edits_to_db.ts` updated; `lib/song-helpers.ts` normalizes legacy `type: "OP1"` from `data_step2.json` / `manual_edits.json`.
- [x] **`gameService.ts`:** song filters use `songType` enum; difficulty cascade uses `Difficulty` enum; `saveGameHistory` upserts aggregate `SongHistory`.
- [x] **`GameCore`:** playlist items expose `formatSongTypeLabel(songType, sequence)` for UI compatibility.
- [x] Verified: `pnpm build` OK (4/4); `prisma migrate deploy` OK on live DB.

### Phase 4 notes
- `GameSession`/`GameParticipant` kept until Phase 5 (`Match`/`MatchPlayer`/`MatchRound`/`RoundAnswer`).
- Daily/Library/Competitive placeholder pages unchanged.
- `data_step2.json` still has legacy `type` fields — scripts normalize at load time; regenerate catalogue (`pipeline:build`) when ready for fresh JSON with `songType`/`sequence`.
- Dev catalogue (10 R2 openings) survives migration via SQL type parsing (`OP1` → `songType=OP`, `sequence=1`).

## Done (Phase 3 — Observability, logs & debug)

- [x] **Migrated to pino:** `apps/server/src/utils/logger.ts` — structured JSON in prod (Render stdout), `pino-pretty` in dev. No file writes. Backward-compatible wrapper keeps existing `logger.info(msg, context, meta)` call sites. Child loggers via `logger.child({ context, userId, roomId, matchId, socketId })`.
- [x] **Redaction:** `utils/redact.ts` — `sanitizePayload()` strips passwords, tokens, JWT fields before any socket payload hits logs.
- [x] **Error taxonomy:** `utils/errors.ts` — `LobbyError`, `GameError`, `ValidationError` (+ `AppError` base) with stable `code` fields.
- [x] **Error reporter:** `utils/errorReporter.ts` — `captureError(err, context)` centralizes structured error logging (Sentry hook point for later).
- [x] **Global crash handlers:** `core/crashHandlers.ts` — `uncaughtException`, `unhandledRejection`; Socket.io `connection_error` + per-socket `error` routed through `captureError`.
- [x] **Socket instrumentation:** `core/socketInstrumentation.ts` — auto-logs every inbound event (actor `userId`, sanitized payload) + critical outbound `socket.emit` responses. Wired in `SocketManager` before handler registration.
- [x] **Lifecycle logs:** structured connect/disconnect in `SocketManager`; existing lobby/match logs in handlers unchanged (now flow through pino).
- [x] **Enriched `/health`:** `routes/health.ts` — `uptimeSeconds`, `activeRooms`, `activeMatches`, `connectedSockets`, `playersInRooms` via `GameManager.getStats()`.
- [x] **Client observability:** `ErrorBoundary` + `lib/errorReporter.ts` — React boundary, `window.error` / `unhandledrejection`, `socket connect_error`; gated by dev mode or `VITE_DEBUG_REPORTING=true`.
- [x] **Graceful shutdown:** `core/shutdown.ts` — `SIGINT`/`SIGTERM` handlers close Socket.io + HTTP server + Prisma with an 8s force-exit fallback (clean local Ctrl+C and Render restarts).
- [x] **Log noise tuning:** `summarizeSocketPayload()` collapses large blobs (anime catalogue → `count`, arrays > 5 → `{ length }`, `game_state_sync` → summary); read-only/high-volume events (`get_anime_list`, `get_rooms`, `get_game_state`, `get_my_watched`, `player_watched_ids`) forced to debug; `game_state_sync` demoted from info.
- [x] **Deps:** removed `winston` + `winston-daily-rotate-file`; added `pino` + `pino-pretty`. `LOG_LEVEL` env (optional) on server.
- [x] Verified: `pnpm build` OK (4/4), no lint errors; manual smoke test (create room → play rounds → return to lobby → Ctrl+C) with `LOG_LEVEL=info`.

### Dev environment note (Windows)
- Git Bash set as Cursor's default terminal + `~/.bashrc`/`~/.bash_profile` init `fnm` so `node`/`pnpm` resolve there.
- Root `.npmrc` sets `script-shell` to Git Bash so pnpm lifecycle scripts skip `cmd.exe` (fixes the "Terminer le programme de commandes (O/N)" Ctrl+C trap).
- Fallback if Turbo still hangs: run `pnpm dev:server` and `pnpm dev:client` in **two separate** Git Bash tabs (single process per tab → clean Ctrl+C).

## Done (Phase 2 — Security & identity)

- [x] **Boot-time env validation (zod):**
  - Server: `apps/server/src/config/env.ts` (fail-fast, typed `env`); requires `DATABASE_URL` + `SUPABASE_JWT_SECRET`. Wired into `index.ts` (imported before anything reading `process.env`) and `config/security.ts` (CORS now reads validated `CLIENT_URL`, comma-separated list supported).
  - Client: `apps/client/src/lib/env.ts` (throws on invalid config); `supabase.ts`, `socket.ts`, `video.ts` now read the validated `env` — all URLs centralized.
- [x] **Supabase JWT validation on Socket.io:** `apps/server/src/core/authMiddleware.ts` verifies `handshake.auth.token` (HS256 via `SUPABASE_JWT_SECRET`). Sets canonical `socket.data = { userId (=JWT sub), username, isAuthenticated }`. `SocketManager` registers it via `io.use(...)`; raw client `userId` is no longer trusted. Present-but-invalid token → connection rejected; no token → guest (read-only).
- [x] **Login required to play (server):** `apps/server/src/core/guards.ts` — `requireAuth()` wraps all game/lobby/chat mutation events; read-only events (`get_rooms`, `get_anime_list`, `get_game_state`, `get_my_watched`) stay open.
- [x] **Login required to play (client):** `ProtectedRoute` in `App.tsx` gates `/play` and `/game` (redirect home + open login modal). Client stops sending raw `userId` in `socket.auth` (only the token).
- [x] **Rate limiting** (per-socket, in-memory sliding window) on `game:answer` (10/5s), `chat:sendMessage` (5/3s), `lobby:create` (3/10s) via `guard()`.
- [x] **Identity schema:** removed `Profile.id @default(uuid())` (Prisma now `id String @id`). Verified live DB column already has **no default** → schema aligned with the `handle_new_user()` trigger, no DB migration needed.
- [x] **RLS cleanup** (Supabase migration `phase2_rls_cleanup`, advisor-verified):
  - Consolidated duplicate permissive `SELECT` policies on `Profile` and `SongVote`.
  - Wrapped `auth.uid()` in `(select auth.uid())` on `Profile`/`SongHistory`/`PlayerAnimeList`/`SongVote` policies (kills per-row re-eval).
  - Revoked `EXECUTE` on `handle_new_user()` from `anon`/`authenticated`/`public`.
  - Enabled RLS on `_prisma_migrations` (deny-all; Prisma bypasses as owner).
  - Advisors after: security `handle_new_user` warnings gone; performance `auth_rls_initplan` + duplicate-policy warnings gone.
- [x] **Removed dead dep:** `@tanstack/react-query` (0 usages) from client.
- [x] Verified: `pnpm build` OK (4/4), no lint errors.

## Done (Phase 1)

- [x] Pipeline storage migrated from Supabase Storage → Cloudflare R2 (`@aws-sdk/client-s3`)
- [x] Shared R2 client helper: `packages/database/scripts/lib/r2-client.ts` (HeadObject, PutObject, List/Delete)
- [x] `4_sync_storage.ts` rewritten: R2 upload, parallel workers (`p-limit`, `WORKER_CONCURRENCY`), env-driven `RESET_ERRORS_ON_START`
- [x] `reset_all.ts` rewritten: empty R2 bucket via `ListObjectsV2` + `DeleteObjects`
- [x] Pipeline clarity fix: `sourceUrl` = AnimeThemes download URL, `videoKey` = R2 object key (generated in step 3)
- [x] Zod validation on `data_step2.json` load (`pipeline-schemas.ts`)
- [x] Client: hardcoded Supabase URL removed → `VITE_R2_PUBLIC_URL` via `apps/client/src/lib/video.ts`
- [x] Server CORS: reads `CLIENT_URL` env (dev + prod), keeps `https://aniquizz.vercel.app`
- [x] Env examples updated with R2 + worker tuning vars
- [x] Removed `@supabase/supabase-js` from `@aniquizz/database` (no longer used by pipeline)
- [x] R2 env vars filled in `packages/database/.env` + `apps/client/.env`
- [x] Verified: `pnpm install` OK, `pnpm build` OK (4/4 packages)
- [x] Live DB explored via Supabase MCP; advisors reviewed
- [x] Target schema agreed and documented in `SCHEMA-TARGET.md`; `PLAN.md` updated (Phases 2/4/5)
- [x] Baseline resolved on live DB: `prisma migrate resolve --applied 20260705000000_init`
- [x] Fixed `.env` load path in pipeline scripts (`../../.env` → `../.env`)
- [x] Extracted media helpers → `scripts/lib/media.ts` (shared by worker + dev seed)
- [x] Dev seed script `seed_dev_catalogue.ts` (`seed:dev-catalogue`, `DEV_SEED_LIMIT`)
- [x] **Dev catalogue live**: 10 openings on R2; DB: 10 `COMPLETED` (all r2.dev), 1450 `PENDING`
- [x] **Deployments reconnected:**
  - Vercel: `VITE_R2_PUBLIC_URL` set; prod redeploy triggered
  - Render: build fixed and successful (monorepo root; see `render.yaml`)
- [x] `render.yaml` added — Render Blueprint with validated build/start commands

## Live DB findings (Supabase MCP)

- Game tables held **1460 `Song` rows** from the old pipeline run (not empty). `_prisma_migrations` was empty → baseline safely resolved.
- Media was dead: 1234 Supabase (deleted bucket) / 221 AnimeThemes / 5 R2. Server only serves `downloadStatus='COMPLETED'`.
- **Dev decision (user-approved):** non-R2 songs set to `PENDING` → only 10 R2 openings playable during dev. Reversible; `manual_edits.json` untouched.
- Identity **already wired**: `handle_new_user()` trigger; Prisma `Profile.id @default(uuid())` is drift → fixed in Phase 2.
- RLS partially set up; advisors flag unindexed FKs, duplicate policies, etc. → fixed in Phase 4 migration.

## Schema decisions (full design in SCHEMA-TARGET.md)

| # | Decision |
|---|----------|
| MatchRound / RoundAnswer | **Yes** — full per-round detail |
| SongHistory | **Aggregate**; event detail in `RoundAnswer` |
| SongVote + VoteType | **Removed** (re-addable later) |
| Anime.format/status, PlayerAnimeList.status | **Keep String** |
| onDelete Song → Anime | **Cascade** |
| Match models | Replace `GameSession`/`GameParticipant` in Phase 5 |

## Key decisions (infra)

| Topic | Decision |
|-------|----------|
| Repo | `Hugoae/aniquizz` on GitHub; old → `old-aniquizz` |
| Stack | Vercel (client) · Render Starter (server) · Supabase · R2 (media) |
| Media | Dev: 10 openings on R2; full regen deferred |
| Render build | Root = repo root; `pnpm --filter aniquizz-server... build`; start `node apps/server/dist/index.js` |
| Pipeline worker | 3 concurrent workers; `RESET_ERRORS_ON_START=true`; timeout 60s |

## Deferred (post–Phase 1)

- **Full catalogue regeneration** (`pipeline:build`): 1450 songs `PENDING`; ~1229 need AnimeThemes relink from `animethemes_cache.json` before worker can fetch them.
- **Grow dev set:** bump `DEV_SEED_LIMIT` and re-run `seed:dev-catalogue` (idempotent).

## Next step

**Phase 9** — integration tests, CI hardening, SEO/compliance, Test account rotation, **mute/ban verification**, and **anti-cheat / security audit** (see `PLAN.md`). Leaderboard UI/API lands in **Update 1** after Phase 9.

### Phase 6 follow-ups / deferred
- **Dev test accounts**: the in-app account-switcher was removed; sign in manually with the seeded `@aniquizz.test` accounts (or `seed:test-accounts`). Roles start at USER (elevate via the panel / `claim-admin`). **Phase 9:** rotate Test account email/password (see PLAN.md).
- **Bots & leaderboard**: bots excluded from persistence, stats, XP, social, and leaderboard queries; `seed:bots` / `cleanup:bots` keep DB clean in dev.
- **Soak loop** (Dev Tools) is a client-side relauncher of headless scenarios (self-limited to ~1 concurrent); a true server-side auto-restart is deferred.
- **Spectating** a running match from the admin/dev "Rejoindre" is lobby-limited (no dedicated spectator mode) — deferred.
- **Admin UI polish** deferred to Phase 8 (largely done); client lint debt from `Game.tsx`/`Profile.tsx`/`tailwind.config.ts` **resolved** in the client audit closure.

### Phase 5 follow-ups / deferred
- **Live smoke test** ✅ done (manual solo + 2-player multi playtesting; see post-integration fixes above). Full reconnect/stress pass deferred to Phase 6 test tooling.
- **`get_advisors`** ✅ re-run — clean (see Verification (post-fix)).
- Engine unit coverage today lives in `packages/shared`; server-side engine integration tests land with the test tooling in Phase 6 / e2e in Phase 9.
- **`mix`-mode client trust:** inherent honor-system (choices must reach the client). Revisit only if a stricter competitive mode needs per-answer-type server proof.
- **`updateAggregates` writes** are sequential `SongHistory` upserts (N players × N songs), best-effort; batch if it ever shows up in prod latency.

## Deferred (post–Phase 4)

- **Re-run `get_advisors`** on live Supabase after migration (SongVote RLS policies auto-dropped with table).
- **Regenerate `data_step2.json`** with native `songType`/`sequence` when running full `pipeline:build`.
- **Client bundle** — dead modes removed in Phase 4; **lazy route code-splitting** added in Phase 8 (`React.lazy` on all pages).

## Deferred (post–Phase 3)

- **Sentry / external APM:** `captureError` / `captureClientError` are logger-only for now; wire when a project is chosen.
- **Room broadcast emit logging:** `io.to(room).emit` not auto-instrumented (handler lifecycle logs cover critical paths); revisit if needed during Phase 5 engine rewrite.
- **Socket connect churn (observed via new logs):** at boot the client connects, then `AuthContext` reconnects (`disconnect().connect()`) once the profile/session resolves → connect/disconnect/connect sequence (amplified by React `StrictMode` in dev). Benign; clean up with identity-by-`userId` + reliable reconnect in **Phase 5**.
- **Client double-subscription / double-emit (observed via new logs):** duplicate `get_home_stats` / `get_anime_list` / `game_state_sync` from double mount → also a minor race in `generalHandlers.getGlobalStats` (two calls compute before cache fills). Fix with single-subscription `useGameSocket` in **Phase 5** (+ optional in-flight guard on `getGlobalStats`).
- **AniList 403** on `getUserAnimeIds` (server blocked by AniList API): surfaced clearly now via error logs; investigate separately (not Phase 3 scope).

### Phase 2 follow-ups / deferred
- **Leaked-password protection**: still disabled — this is a Supabase **Auth** setting with no SQL/MCP toggle. Enable manually in the dashboard (Auth → Providers → Password / `password_hibp_enabled`).
- **`GameSession`/`GameParticipant`** RLS-enabled-no-policy (deny-all, harmless): tables replaced in **Phase 5**.
- **Profile email exposure**: `Profile` SELECT is public (all columns incl. `email`). RLS can't do column-level filtering; revisit with a view or column grants if needed (not in Phase 2 scope).
- Engine still keys players by `socket.id`; canonical `socket.data.userId` is now available and required — the socket.id → userId migration in the game engine lands in **Phase 5**.

## Notes

- **`manual_edits.json` still authoritative** — `isLocked` preserves curated metadata on regeneration.
- **Render MCP skipped** — dashboard used; build validated manually.
- **Vercel MCP** reads projects/deployments but cannot write env vars (dashboard used).
- **Client bundle** — lazy routes in Phase 8; further chunk tuning deferred if Lighthouse flags regressions.
