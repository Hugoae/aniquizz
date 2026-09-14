# Context — `aniquizz-server`

**Role:** Express 5 + Socket.io authority for all realtime gameplay, plus a small
admin REST surface. Prisma → Supabase Postgres; media on Cloudflare R2. Deployed on
Render. The server is **authoritative**: scoring, playlist draw, and identity are never
trusted from the client.

See [`README.md`](./README.md) for structure, endpoints, env, and deploy details.

## Glossary

| Term                   | Definition                                                                                                                                                        | Where                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **GameManager**        | Top-level orchestrator of rooms and matches; injected into every socket handler.                                                                                  | `modules/game/gameManager.ts`                                  |
| **Room**               | Live lobby/match state: roster, settings, active `MatchEngine`, `priorMatchSongIds`.                                                                              | `modules/game/.../Room.ts`                                     |
| **MatchEngine**        | Round loop for one match: song → guess → reveal → score; emits `round_start` (carries `videoMode`, `peekWindow`, `videoStartTime`).                               | `modules/game/engine/MatchEngine.ts`                           |
| **PlaylistBuilder**    | Draws songs + QCM distractors; applies Watched `watchedIds`, thematic playlist membership, precision, and cross-match exclusion.                                  | `modules/game/engine/PlaylistBuilder.ts`                       |
| **gameService**        | Catalogue access + choice-candidate caching (`getChoiceCandidates`, `getArtistChoiceCandidates`).                                                                 | `modules/game/gameService.ts`                                  |
| **SocketManager**      | Registers every handler module and wires shared deps (e.g. passes `gameManager` to profile handlers).                                                             | `core/SocketManager.ts`                                        |
| **authMiddleware**     | Verifies the Supabase JWT on handshake → `socket.data` (`userId`, `role`, `mutedUntil`).                                                                          | `core/authMiddleware.ts`                                       |
| **guards**             | Per-action rate limits (chat, answers, anime search, `deleteAccount`, …). Returned promises are settled (Socket.io does not await).                               | `core/guards.ts`                                               |
| **parseSocketPayload** | Zod parse at the socket boundary for mutating events.                                                                                                             | `core/parseSocketPayload.ts`                                   |
| **Watched pool**       | AniList-list resolution + playable-song counting for a room.                                                                                                      | `modules/anilist/`, `watchedPoolService`                       |
| **Daily challenge**    | Globally shared five-song QCM for one Paris calendar day. Frozen round snapshots; HTTP play loop (no Socket.io room). Heard clips upsert `SongHistory` (pokédex). | `modules/daily/`, `routes/daily.ts`, `docs/game/daily-quiz.md` |

## Known pitfalls

- **Do not import `apps/client` or React.** The SPA consumes this process over
  the socket/HTTP contract in `@aniquizz/shared`. ESLint `no-restricted-imports`
  enforces this.
- **Mutating socket events are Zod-parsed.** `game:answer`, `update_room_settings`,
  `start_game`, `vote_pause`, and `vote_skip` go through `socketPayloads.ts`.
  Invalid JSON still yields a generic `Requête invalide.` — do not leak Zod paths.
  Room settings patches are then re-validated by `normalizeRoomSettings`.
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
- **Watched vs Random distractors differ.** In Watched / playlist mode QCM candidates must use the
  same restricted anime ids as the songs, or players deduce answers they never saw. Playlist fallback never leaves the snapshot.
- **Zod `.strip()` drops unknown settings keys.** `playlistId` / `decadePlaylistId` / `playlistWatched` must stay in `settings.ts`.
- **Persist both playlist ids.** `matchPlaylistPersistence` writes `playlistId` and `decadePlaylistId` independently — do not coalesce with `??` or decade-only matches vanish from stats.
- **Prisma migrations are manual on Supabase.** `prisma migrate dev` fails (no shadow
  DB, P1001). Author SQL by hand, `db execute`, then `migrate resolve --applied`
  (see database `CONTEXT.md`).
- **Never log secrets** (JWTs, room passwords). Use Pino structured logs.
- Bind to `0.0.0.0:$PORT` — Render requirement; filesystem is ephemeral.
