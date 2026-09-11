# Context — `aniquizz-server`

**Role:** Express 5 + Socket.io authority for all realtime gameplay, plus a small
admin REST surface. Prisma → Supabase Postgres; media on Cloudflare R2. Deployed on
Render. The server is **authoritative**: scoring, playlist draw, and identity are never
trusted from the client.

See [`README.md`](./README.md) for structure, endpoints, env, and deploy details.

## Glossary

| Term | Definition | Where |
|------|------------|-------|
| **GameManager** | Top-level orchestrator of rooms and matches; injected into every socket handler. | `modules/game/gameManager.ts` |
| **Room** | Live lobby/match state: roster, settings, active `MatchEngine`, `priorMatchSongIds`. | `modules/game/.../Room.ts` |
| **MatchEngine** | Round loop for one match: song → guess → reveal → score; emits `round_start` (carries `videoMode`, `peekWindow`, `videoStartTime`). | `modules/game/engine/MatchEngine.ts` |
| **PlaylistBuilder** | Draws songs + QCM distractors; applies Watched `watchedIds`, thematic playlist membership, precision, and cross-match exclusion. | `modules/game/engine/PlaylistBuilder.ts` |
| **gameService** | Catalogue access + choice-candidate caching (`getChoiceCandidates(precision, allowedAnimeIds?)`). | `modules/game/gameService.ts` |
| **SocketManager** | Registers every handler module and wires shared deps (e.g. passes `gameManager` to profile handlers). | `core/SocketManager.ts` |
| **authMiddleware** | Verifies the Supabase JWT on handshake → `socket.data` (`userId`, `role`, `mutedUntil`). | `core/authMiddleware.ts` |
| **guards** | Per-action rate limits (chat, answers, anime search, `deleteAccount`, …). | `core/guards.ts` |
| **Watched pool** | AniList-list resolution + playable-song counting for a room. | `modules/anilist/`, `watchedPoolService` |
| **Eject** | `gameManager.ejectUserFromAllRooms(userId)` — force-leave every room (used by ban + account deletion). | `modules/game/gameManager.ts` |

## Known pitfalls

- **Player identity = `socket.data.userId` (JWT).** Never `socket.id`, never a
  client-supplied id — especially in destructive flows (delete account, moderation).
- **Rebuild `@aniquizz/shared` after editing it.** The server resolves shared types
  from `packages/shared/dist/`; a stale `dist` crashes `ts-node` on startup.
- **Import cycle:** `PlaylistBuilder` ↔ `watchedPoolService` ↔ `Room`. Touch Watched
  mode carefully; prefer adding pure helpers in `packages/shared` (`playlist.ts`, `selection.ts`).
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
