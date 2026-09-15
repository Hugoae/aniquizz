# Account deletion (RGPD)

Self-service **right to erasure** for authenticated users. Available from the own profile menu (⋮ → **Supprimer mon compte**).

## Flow

1. **Client** — `DeleteAccountDialog`: user must re-enter password (`signInWithPassword`) and type their **exact username**.
2. **Socket** — `profile:delete_account` `{ confirmUsername }` (rate-limited: 3/hour per socket).
3. **Server** — `deleteUserAccount()` in order:
   - Validate username confirmation (case-sensitive, trimmed)
   - Require a fresh Supabase sign-in (`last_sign_in_at` within 10 minutes)
   - `gameManager.ejectUserFromAllRooms()` — leave every live lobby/match
   - `prisma.profile.delete` — cascades `Friendship`, `MatchPlayer` → `RoundAnswer`, `SongHistory`
   - Supabase Storage — remove `{userId}/avatar.jpg` if custom upload (best-effort)
   - `supabaseAdmin.auth.admin.deleteUser(userId)`
   - Emit `profile:account_deleted` + `force_logout` on all user sockets, then disconnect

## Why Prisma before Auth

Deleting Auth first can lock the user out while Profile (and PII) still exists — they
cannot sign in to retry. Prisma-first is the recoverable order: if Auth delete fails,
the profile row is already gone and the client shows `AUTH_DELETE_FAILED_MESSAGE`
(contact support to remove the orphan Auth user). Do not invert this sequence.

## Security

| Control      | Implementation                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Identity     | JWT `userId` from socket auth only — never accept a target id from client                             |
| Re-auth      | Client `signInWithPassword`, then server checks `last_sign_in_at` within 10 minutes (`isFreshReauth`) |
| Confirmation | `confirmUsername` must match DB `Profile.username` exactly                                            |
| Rate limit   | `RATE_LIMITS.deleteAccount` (3 attempts / hour / socket)                                              |
| Bots         | `isBotId()` rejected                                                                                  |

## What is NOT deleted

- **`Match` / `MatchRound` rows** — historical match shells remain; the user's `MatchPlayer` rows are removed by cascade.
- **Catalogue data** (`Anime`, `Song`, …) — unchanged.

## Files

| Layer          | Path                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| Server logic   | `apps/server/src/modules/profile/deleteAccount.ts`                        |
| Socket handler | `apps/server/src/modules/profile/profileHandlers.ts`                      |
| Room eject     | `apps/server/src/modules/game/gameManager.ts` — `ejectUserFromAllRooms()` |
| Events         | `packages/shared/src/events.ts`                                           |
| UI             | `DeleteAccountDialog.tsx`, `ProfileHeader.tsx`, `Profile.tsx`             |
| Legal          | `PrivacyPolicyPage.tsx` §6                                                |

## Tests

- `apps/server/src/integration/deleteAccount.integration.test.ts` — wrong `confirmUsername` rejected; test account preserved.
- `apps/server/src/integration/profileCascade.integration.test.ts` — Prisma `Profile` delete cascades friendships.

Manual smoke: profile ⋮ → delete → confirm → redirected home, cannot sign in again.
