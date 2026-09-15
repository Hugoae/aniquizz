# Context — `aniquizz-server`

**Role:** Express 5 + Socket.io authority for all realtime gameplay, plus a small
admin REST surface. Prisma → Supabase Postgres; media on Cloudflare R2. Deployed on
Render. The server is **authoritative**: scoring, playlist draw, and identity are never
trusted from the client.

See [`README.md`](./README.md) for structure, endpoints, env, and deploy details.

## Glossary

| Term                   | Definition                                                                                                                                                                                                                                                 | Where                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **GameManager**        | Top-level orchestrator of rooms and matches; injected into every socket handler.                                                                                                                                                                           | `modules/game/gameManager.ts`                                      |
| **Room**               | Live lobby/match state: roster, settings, active `MatchEngine`, `priorMatchSongIds`.                                                                                                                                                                       | `modules/game/.../Room.ts`                                         |
| **MatchEngine**        | Round loop for one match: song → guess → reveal → score; emits `round_start` (carries `videoMode`, `peekWindow`, `videoStartTime`). Helpers: `matchEngineStart` / `matchEngineRound` / `matchEngineFinish` / `matchEngineSync` plus bots / reveal / votes. | `modules/game/engine/MatchEngine.ts`                               |
| **PlaylistBuilder**    | Draws songs + QCM distractors; applies Watched `watchedIds`, thematic playlist membership, precision, and cross-match exclusion.                                                                                                                           | `modules/game/engine/PlaylistBuilder.ts`                           |
| **gameService**        | Catalogue access + choice-candidate caching (`getChoiceCandidates`, `getArtistChoiceCandidates`).                                                                                                                                                          | `modules/game/gameService.ts`                                      |
| **SocketManager**      | Registers every handler module and wires shared deps (e.g. passes `gameManager` to profile handlers).                                                                                                                                                      | `core/SocketManager.ts`                                            |
| **authMiddleware**     | Verifies the Supabase JWT on handshake → `socket.data` (`userId`, `role`, `mutedUntil`).                                                                                                                                                                   | `core/authMiddleware.ts`                                           |
| **guards**             | Per-action rate limits (chat, answers, anime search, `deleteAccount`, …). Returned promises are settled (Socket.io does not await).                                                                                                                        | `core/guards.ts`                                                   |
| **parseSocketPayload** | Zod parse at the socket boundary for mutating events.                                                                                                                                                                                                      | `core/parseSocketPayload.ts`                                       |
| **Watched pool**       | AniList/MAL list resolution + playable-song counting. Includes Completed, Watching, On-Hold, Rewatching, and Dropped; Planning stays out. Lobby preview sockets live in `poolStatsHandlers`.                                                               | `watchedPoolService`, `poolStatsHandlers.ts`, `watchedStatuses.ts` |
| **Daily challenge**    | Globally shared five-song QCM for one Paris calendar day. Frozen round snapshots; HTTP play loop (no Socket.io room). Heard clips upsert `SongHistory` (pokédex).                                                                                          | `modules/daily/`, `routes/daily.ts`, `docs/game/daily-quiz.md`     |
| **Playback URL**       | Player-facing MP4 locator. `toPlaybackUrl` wraps the R2 key in a signed Worker URL when `MEDIA_PLAYBACK_URL` is set. Library/admin keep raw keys.                                                                                                          | `lib/mediaPlaybackUrl.ts`, `workers/media-playback/`               |

## Known pitfalls

- **Do not import `apps/client` or React.** The SPA consumes this process over
  the socket/HTTP contract in `@aniquizz/shared`. ESLint `no-restricted-imports`
  enforces this.
- **Mutating socket events are Zod-parsed.** `game:answer`, `update_room_settings`,
  `start_game`, `vote_pause`, `vote_skip`, `game:skip_round`, `game:return_to_lobby`,
  `game:cancel`, `get_game_state`, `chat:sendMessage`, `update_profile_data`,
  `profile:update_prefs`, `profile:update_privacy`, `profile:delete_account`,
  `friends:set_privacy` (legacy alias of `allowFriendRequests`; UI uses privacy), plus lobby
  `create` / `join` / `kick` / `transfer_host` / `leave_room` / `toggle_ready`. Invalid JSON
  still yields a generic `Requête invalide.` — do not leak Zod paths.
  Room settings patches are then re-validated by `normalizeRoomSettings`.
  `password`, `roomName`, and `avatar` (preset key or uploaded public URL) are
  length-capped (`GAME_CONFIG.LIMITS`). Do not cap `avatar` as if it were a
  filename — custom avatars are Supabase object URLs (~140 chars).
  The public room list (`get_rooms` / `lobby:subscribe_list`) requires auth; guests
  can still connect without a token for other read-only events.
- **`pnpm dev` keeps `@aniquizz/shared` `dist/` fresh.** The server resolves
  shared from `dist/` (the client aliases `src/`). Nodemon watches
  `packages/shared/dist` and restarts. If you start the server without Turbo,
  rebuild shared first or you get stale-type errors (e.g. `TS2353` on a new field).
- **Import cycle:** `PlaylistBuilder` ↔ `watchedPoolService` ↔ `Room`. Touch Watched
  mode carefully; prefer adding pure helpers in `packages/shared` (`playlist.ts`, `selection.ts`).
  Daily admin tools import `dailyResults`, never `dailyService`.
  Daily lineup edits are locked for past days and for today once an attempt exists
  (void a broken live round instead of replacing it).
  `GET /daily/today` settles with `allowAdvance: false`: it may complete a fully
  answered run, never start the next song or time out the current guess, and never
  returns a playable round. Reopening `/daily` forfeits `IN_PROGRESS`.
- **`round_start` must stay reconnect-safe.** `videoMode` / `peekWindow` / `videoStartTime`
  are echoed on the payload so a reconnecting client re-renders identically.
  `videoKey` (and `nextVideo` / `game:preload`) is a playback locator, not a
  readable R2 filename, when the media Worker is configured.
- **Watched vs Random distractors differ.** In Watched / playlist mode QCM candidates must use the
  same restricted anime ids as the songs, or players deduce answers they never saw. Playlist fallback never leaves the snapshot.
- **List mutators are Zod-parsed.** `lists:link` / `set_active` / `refresh` / `unlink` go through
  `socketPayloads.ts`. Link only persists when AniList/MAL verify returns `exists` (`unverified` is a retry, not a ghost link). `lists:get_status` may attach cached anime counts; it does not fetch the remote list. `set_active` and `unlink` emit `watched:list_changed` so the Hub pool refetches.
- **Zod `.strip()` drops unknown settings keys.** `playlistId` / `decadePlaylistId` / `playlistWatched` must stay in `settings.ts`.
- **Persist both playlist ids.** `matchPlaylistPersistence` writes `playlistId` and `decadePlaylistId` independently — do not coalesce with `??` or decade-only matches vanish from stats.
- **Prisma migrations are manual on Supabase.** `prisma migrate dev` fails (no shadow
  DB, P1001). Author SQL by hand, `db execute`, then `migrate resolve --applied`
  (see database `CONTEXT.md`).
- **Account deletion is Prisma-first then Auth.** Inverting that order can lock
  the user out while PII remains. If Auth delete fails, the French support
  message is intentional. Profile stats use SQL aggregates for career daily /
  match counts — do not `findMany` every finished match into Node.
- **`/admin` is REST + JWT `requireRole`.** Mute/ban/disconnect cannot target the caller (400). Owner lock: username `kirikou` plus `PROTECTED_ACCOUNT_EMAILS`. `POST /admin/dev/claim-admin` needs `ALLOW_DEV_CLAIM_ADMIN=true` and is ignored in production. Staff routes are rate-limited (`adminStaff`, 90/min); claim-admin is not. Mute/ban/role/disconnect persist to `StaffAuditLog`. Catalogue writes, playlists, and daily admin are ADMIN-only.
- **Public boards omit bots, active bans, and `LEADERBOARD_HIDDEN_USERNAMES` (`admin_dev`).** Filter in `leaderboardQuery` / daily ranking so ranks compact. Do not hide Kirikou. In-match scoreboards stay unfiltered.
- Bind to `0.0.0.0:$PORT` — Render requirement; filesystem is ephemeral.
- **Guessing payloads must not contain the R2 filename.** `toPlaybackUrl` is identity
  without `MEDIA_PLAYBACK_URL` (local public R2). Production requires the Worker
  env pair. Do not sign Library / admin catalogue keys.
