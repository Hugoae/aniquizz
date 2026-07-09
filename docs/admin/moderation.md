# Admin moderation — mute & ban

Reference for moderators and developers. Server enforcement is authoritative; the admin UI is a thin client over `/admin` REST routes.

## Roles

| Action | MODERATOR | ADMIN |
|--------|:---------:|:-----:|
| View users / rooms / stats | ✅ | ✅ |
| Mute / unmute | ✅ | ✅ |
| Ban / unban | ✅ | ✅ |
| Disconnect (kick, no sanction) | ✅ | ✅ |
| End / close / kick from room | ✅ | ✅ |
| Change user role | ❌ | ✅ |
| Reset user stats | ❌ | ✅ |
| Catalogue create/delete | ❌ | ✅ |
| Dev tools | ❌ | ✅ |

## Sanctions

### Mute

- **Effect:** the player cannot send chat messages while `Profile.mutedUntil > now`.
- **Live apply:** `POST /admin/users/:id/mute` updates DB and pushes `profile:sanction_updated` to the target's sockets; `socket.data.mutedUntil` is updated — **no reconnect required**.
- **Lift:** `POST /admin/users/:id/mute` with `{ "minutes": null }`.

### Ban

- **Effect:** the player cannot open a socket handshake while `Profile.bannedUntil > now`; HTTP admin routes also reject banned tokens.
- **Live apply:** active sockets receive an error message and are disconnected immediately.
- **Lift:** `POST /admin/users/:id/ban` with `{ "minutes": null }`. The player can reconnect on the next attempt.

### Durations

Presets in the admin UI map to minutes (`1h`, `12h`, `24h`, `1 week`, `1 month`, `permanent`). Permanent is stored as ~100 years server-side.

## Client sync

- **`profile:sanction_updated`** — emitted to the sanctioned user's live sockets with `{ bannedUntil, mutedUntil }` ISO strings (or `null`). The client patches `AuthContext.profile` so the header badge updates instantly.
- **`SuspensionBadge`** — countdown ticks every second; no periodic profile poll.
- **Admin list** — filters **Mutés** / **Bannis**, live remaining time on rows, counters in the panel header.

## Integration tests

- `apps/server/src/integration/ban.integration.test.ts` — ban at socket handshake.
- `apps/server/src/integration/mute.integration.test.ts` — chat block + admin API apply/lift without reconnect.

## Related code

| Layer | Path |
|-------|------|
| Shared event | `packages/shared/src/events.ts` → `profile:sanction_updated` |
| Admin routes | `apps/server/src/modules/admin/adminRoutes.ts` |
| Chat guard | `apps/server/src/modules/chat/chatHandlers.ts` |
| Handshake guard | `apps/server/src/core/authMiddleware.ts` |
| Admin UI | `apps/client/src/features/admin/components/UsersPanel.tsx`, `AdminUserRow.tsx` |
| Player badge | `apps/client/src/features/auth/components/SuspensionBadge.tsx` |
