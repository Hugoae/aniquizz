# Progress — AniQuizz Refonte

## Current phase: Phase 7 — Features ✅ complete

Order: **(1) XP/Level ✅ → (2) Victory conditions revamp ✅ → (3) Friends ✅.** Leaderboard deferred to **Update 1** (after Phase 9). Next up: **Phase 8 — UI/UX rework**.

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

### Multiplayer room list
- [x] **`RoomList`**: new **"Amis"** filter (next to Tous/Publics/Privés) — keeps only rooms hosting a friend, derived from live friend presence (`FriendSummary.roomId`), no server change.

### Deferred → Update 1 (after Phase 9)
- **Leaderboard:** server `leaderboard:get` (Profile by XP/level/wins, exclude `bot-*`); replace mock data in `Leaderboard.tsx`.

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
- [x] Remaining `pnpm lint` failures are pre-existing debt in `Game.tsx`/`Profile.tsx`/`tailwind.config.ts` (Phase 8).
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

Phase 7 — Features: XP/Level (curve + XP calc in `packages/shared`, persist in match save, profile/header bar + level-up event), Friends (`Friendship` model + server module + UI, presence via `Profile.lastSeenAt`), Leaderboard (server `leaderboard:get` by XP/level/wins, replace mock data in `Leaderboard.tsx`, exclude `bot-*` ids).

### Phase 6 follow-ups / deferred
- **Dev test accounts**: the in-app account-switcher was removed; sign in manually with the seeded `@aniquizz.test` accounts (or `seed:test-accounts`). Roles start at USER (elevate via the panel / `claim-admin`).
- **Bots & leaderboard**: bot matches persist to `Profile` aggregates; exclude `bot-*` ids when Phase 7 wires the real leaderboard.
- **Soak loop** (Dev Tools) is a client-side relauncher of headless scenarios (self-limited to ~1 concurrent); a true server-side auto-restart is deferred.
- **Spectating** a running match from the admin/dev "Rejoindre" is lobby-limited (no dedicated spectator mode) — deferred.
- **Admin UI polish** deferred to Phase 8; pre-existing client lint debt (`Game.tsx`, `Profile.tsx`, `tailwind.config.ts`) also Phase 8.

### Phase 5 follow-ups / deferred
- **Live smoke test** ✅ done (manual solo + 2-player multi playtesting; see post-integration fixes above). Full reconnect/stress pass deferred to Phase 6 test tooling.
- **`get_advisors`** ✅ re-run — clean (see Verification (post-fix)).
- Engine unit coverage today lives in `packages/shared`; server-side engine integration tests land with the test tooling in Phase 6 / e2e in Phase 9.
- **`mix`-mode client trust:** inherent honor-system (choices must reach the client). Revisit only if a stricter competitive mode needs per-answer-type server proof.
- **`updateAggregates` writes** are sequential `SongHistory` upserts (N players × N songs), best-effort; batch if it ever shows up in prod latency.

## Deferred (post–Phase 4)

- **Re-run `get_advisors`** on live Supabase after migration (SongVote RLS policies auto-dropped with table).
- **Regenerate `data_step2.json`** with native `songType`/`sequence` when running full `pipeline:build`.
- **Client bundle ~842 kB** — code-splitting in Phase 8.

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
- **Client bundle** — dead modes removed in Phase 4; code-splitting in Phase 8.
