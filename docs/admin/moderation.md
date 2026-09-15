# Admin moderation — mute & ban

Reference for moderators and developers. Server enforcement is authoritative; the admin UI is a thin client over `/admin` REST routes.

## Roles

| Action                         | MODERATOR | ADMIN |
| ------------------------------ | :-------: | :---: |
| View users / rooms / stats     |    ✅     |  ✅   |
| Mute / unmute                  |    ✅     |  ✅   |
| Ban / unban                    |    ✅     |  ✅   |
| Disconnect (kick, no sanction) |    ✅     |  ✅   |
| End / close / kick from room   |    ✅     |  ✅   |
| Staff audit journal            |    ✅     |  ✅   |
| Change user role               |    ❌     |  ✅   |
| Reset user stats               |    ❌     |  ✅   |
| Catalogue writes               |    ❌     |  ✅   |
| Dev tools                      |    ❌     |  ✅   |

Owner-protected accounts (`kirikou` and emails in `PROTECTED_ACCOUNT_EMAILS`) cannot be muted, banned, kicked, disconnected, **or have their role changed**. The server returns 403; the UI still asks for confirmation before any role PATCH. Self-role changes and self mute/ban/disconnect are rejected with 400. Stats/daily resets may still target the caller (`allowSelf`).

Mute, unmute, ban, unban, role change, and disconnect each insert a `StaffAuditLog` row (actor, target, action, duration). The Journal tab lists them newest-first. Catalogue PATCH/bulk/create/delete and playlist/daily tools are ADMIN-only; the moderator UI hides those writes.

## Sanctions

### Mute

- **Effect:** the player cannot send chat messages while `Profile.mutedUntil > now`.
- **Live apply:** `POST /admin/users/:id/mute` updates DB and pushes `profile:sanction_updated` to the target's sockets; `socket.data.mutedUntil` is updated — **no reconnect required**.
- **Lift:** `POST /admin/users/:id/mute` with `{ "minutes": null }`.

### Ban

- **Effect:** the player cannot open a socket handshake while `Profile.bannedUntil > now`; HTTP admin routes also reject banned tokens.
- **Live apply:** `ejectUserFromAllRooms` removes the player from any lobby or in-progress match (solo engine cancelled, empty room torn down), then active sockets receive `room_closed` + an error and are disconnected.
- **Client:** `/play` and `/game` navigate to `/` when the close reason mentions a ban; mode select is blocked while banned. Ban ejection toast is deduped (`notifyModerationBan`) across `room_closed`, `error`, and disconnect handlers.
- **Lift:** `POST /admin/users/:id/ban` with `{ "minutes": null }`. The player can reconnect on the next attempt.

### Durations

Presets in the admin UI map to minutes (`1h`, `12h`, `24h`, `1 week`, `1 month`, `permanent`). Permanent is stored as ~100 years server-side.

## Client sync

- **`profile:sanction_updated`** — emitted to the sanctioned user's live sockets with `{ bannedUntil, mutedUntil }` ISO strings (or `null`). The client patches `AuthContext.profile` so the header badge updates instantly.
- **`SuspensionBadge`** — countdown ticks every second; no periodic profile poll.
- **Admin list** — filters **Mutés** / **Bannis**, live remaining time on rows, counters in the panel header.

## Integration tests

- `apps/server/src/integration/ban.integration.test.ts` — ban at socket handshake.
- `apps/server/src/integration/mute.integration.test.ts` — chat block + admin API apply/lift on a second player (self-mute is 400).
- `apps/server/src/integration/adminRole.integration.test.ts` — self-role 400, owner-protected 403, ordinary target 200.

## Related code

| Layer           | Path                                                                               |
| --------------- | ---------------------------------------------------------------------------------- |
| Shared event    | `packages/shared/src/events.ts` → `profile:sanction_updated`                       |
| Admin routes    | `apps/server/src/modules/admin/adminRoutes.ts` (+ user/room/catalogue/dev modules) |
| Owner lock      | `apps/server/src/config/protectedAccounts.ts` (`PROTECTED_ACCOUNT_EMAILS` env)     |
| Chat guard      | `apps/server/src/modules/chat/chatHandlers.ts`                                     |
| Handshake guard | `apps/server/src/core/authMiddleware.ts`                                           |
| Admin UI        | `apps/client/src/features/admin/components/UsersPanel.tsx`, `AdminUserRow.tsx`     |
| Player badge    | `apps/client/src/features/auth/components/SuspensionBadge.tsx`                     |
