# Watched mode — QCM / Duo choice pool

In **Watched** (`soundSelection: 'watched'`), songs are drawn from players' resolved AniList ids (union or intersection). QCM (**Carré**, 4 choices) and **Duo** (2 choices) wrong answers must come from the **same pool**, or the mode becomes trivially easy.

## Symptom (pre-fix)

- Playlist songs: filtered by `watchedIds` ✅
- QCM distractors: full catalogue via `getChoiceCandidates(precision)` ❌

A player could eliminate wrong answers without listening: *« I haven't seen this anime on my list → it's not the answer. »* The round tested list meta-knowledge, not audio recognition.

Affected modes: `responseType: 'qcm'` and `'mix'` (when the player uses Carré or Duo). Typing-only rooms are unaffected (`needsChoices = false`).

## Design decision (fix 26.1-prep, 2026-07-10)

**When `soundSelection === 'watched'`, restrict the choice candidate pool to the same `watchedIds` used for song selection.**

| Mode | Song pool | Distractor pool |
|------|-----------|-----------------|
| Random | Global catalogue | Global catalogue (unchanged) |
| Watched | Resolved AniList ids | **Same resolved AniList ids** |

Multiplayer uses the lobby's resolved ids:

- **Union** — distractors from any human's watched anime in the lobby
- **Intersection** — distractors only from anime every linked human has seen

Precision (`anime` vs `franchise`, legacy wire value `exact` → `anime`) applies the same way as before: franchise mode uses franchise display names from watched rows only; anime mode requires the specific catalogue anime/season entry.

## Source of truth

| Layer | Module | Role |
|-------|--------|------|
| Pure pool builder | `packages/shared/src/selection.ts` — `buildChoiceCandidatePool()` | Filter rows by `watchedIds`, dedupe display names |
| Choice assembly | `packages/shared/src/selection.ts` — `buildChoices()`, `buildDuo()` | Pick wrong answers + shuffle (unchanged API) |
| Catalogue cache | `apps/server/.../gameService.ts` — `getAllAnimeNames()` | Anime rows now include `id` for filtering |
| Candidate API | `apps/server/.../gameService.ts` — `getChoiceCandidates(precision, watchedIds?)` | Global pool cached per precision; watched pool filtered in memory (not cached per user) |
| Match start | `apps/server/.../PlaylistBuilder.ts` | Passes `watchedIds` to `getChoiceCandidates` when `isWatchedMode` |

Choices are pre-generated at playlist build time (one set per round) and sent on `round_start` — the client never builds distractors.

## Caching behaviour

- **Random mode:** `getChoiceCandidates(precision)` — cached per precision (10 min TTL), same as before.
- **Watched mode:** `getChoiceCandidates(precision, watchedIds)` — skips the precision cache; filters the shared anime-name cache in memory. Cheap because the heavy DB scan is already cached.

## Edge cases & follow-up

| Case | Current behaviour | Future (chantier 26.1 #2) |
|------|-------------------|---------------------------|
| List has &lt; 4 distinct names (QCM) | `buildChoices` pads with `???` | Lobby should block start or warn (min intersection threshold) |
| List has &lt; 2 distinct names (Duo) | `buildDuo` may use `???` | Same guard |
| Anime on AniList but no song in catalogue | Excluded from both song and choice pools (no row in cache) | — |
| Typing-only room | No choices built or sent | — |

## Tests

`packages/shared/src/selection.test.ts`:

- `buildChoiceCandidatePool` — global vs watched filter, franchise precision
- `buildChoices` — wrong answers only from watched-filtered pool

Manual smoke (2026-07-10): Watched + Mix/QCM — distractors confirmed on-list only.

## Related

- AniList lobby guards: `apps/client/.../watchedSource.ts`
- Playlist Watched resolution: `PlaylistBuilder.resolveWatchedIds()`
- Planned min-list UX: `PLAN.md` § 26.1 chantier #2
