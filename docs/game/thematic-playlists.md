# Thematic playlists (v26.5)

Staff-curated **music sources** (not a new game mode). A pack is a frozen snapshot of playable songs. Lobby OP/ED and difficulty still filter **inside** the pack. An optional Watched overlay intersects the pack with AniList/MAL lists.

## Hybrid recipe + snapshot

| Layer | Role |
|-------|------|
| **Recipe** | JSON: `genres[]` (franchise `hasSome`), `tags[]` (song `hasSome`), `yearMin`/`yearMax` (`Anime.seasonYear` of **that song's entry**), `formats[]`, optional `songTypes` / `difficulties`, `includeSongIds` / `excludeSongIds`. |
| **Publish / refresh** | Admin job resolves the recipe on `downloadStatus = COMPLETED`, writes `ThematicPlaylistSong`. Players see a frozen count. |
| **Draw** | Membership `ThematicPlaylistSong` (AND across combined packs) plus lobby filters. Recipe is **not** re-run at match start. |

Membership: `(matches every non-empty dimension OR includeSongIds) AND NOT excludeSongIds AND COMPLETED`. Empty arrays = no constraint. **Exclude always wins.** Include still requires COMPLETED.

**Year:** an OP of *Naruto Shippuden* (2007) does **not** enter « Années 90 » even if Naruto Classic would. Admin preview shows a year histogram so this is visible.

**Shonen** is an AniList **tag** (`Song.tags`), not a franchise genre.

## Combining a decade with another pack

Décennie is an overlay, not a mutually exclusive source. The lobby stores:

| Field | Role |
|-------|------|
| `playlistId` | Optional genre / tag / theme pack |
| `decadePlaylistId` | Optional decade pack |

Valid playlist sources: decade-only, genre-only, or **both**. Draw and pool stats **intersect frozen snapshots** (Shonen ∩ Années 2010). Watched overlay, if on, still applies on that intersection. An empty intersection blocks start (`playlist_empty` / `filteredEmpty`) — no fill from the global catalogue.

The picker keeps both selections independently: choosing Shonen does not clear Décennie, and the decade slider does not clear the genre. Clicking the active Décennie header or the same genre pack again turns that slot off.

## Watched overlay

`soundSelection: 'playlist'` + `playlistId` and/or `decadePlaylistId` + optional `playlistWatched`.

When overlay is on, `watchedMode` (union / commun) applies **inside the pack**. If the overlay is too small:

- Host may opt in to `watchedAllowFallback`.
- Fallback fills from the **rest of the snapshot**, never the global catalogue.
- If the pack itself has fewer playable songs than `soundCount` → **block start** (no fill outside the pack).

## QCM / Duo

Distractors must come from the same restricted universe as the draw (same leak as Watched: *« this anime is not in the pack »*).

| Source | Choice pool |
|--------|-------------|
| Playlist | Snapshot anime ids (after COMPLETED + lobby filters) |
| Playlist + Watched, no fallback | Pack ∩ watched ids |
| Playlist + Watched + fallback | Full filtered pack (pack fills can appear) |

Typing-only rooms skip this. QCM / mix require **≥ 4 distinct names**; otherwise start is blocked (no `???` padding as the intended UX).

Autocomplete stays **global catalogue** (same as Watched). Restricting it is a later chantier.

## Same draw QoL as random / Watched

Thematic packs reuse `PlaylistBuilder` → `getRandomSongs`. Relanching in the same lobby still excludes prior-match song ids, keeps franchise diversity, and applies the difficulty cascade **inside the snapshot** (never outside the pack). If the remaining pack is too small, exclusion relaxes and may reuse earlier lobby songs — still pack-only. Host-only settings, start gates, and QCM universe restriction match the other sources.

## Stale snapshot

If a snapshot song becomes `SKIPPED` / missing, pool resolution ignores it. A dropped count can show as a warning banner. Refresh the snapshot from admin to pick up new catalogue endings.

## Socket / settings

- Zod `.strip()` — `playlistId`, `decadePlaylistId`, and `playlistWatched` **must** be in `settingsSchema` or they disappear. Send `null` (not omit) to clear a slot: Socket.IO JSON drops `undefined`.
- `playlist:get_pool_stats` / `playlist:pool_stats` for the live banner (snapshot intersection → filters → Watched). Echo `requestId`; drop stale replies.
- `Match.playlistId` is the genre/theme pack; `Match.decadePlaylistId` is the decade overlay (both nullable). Decade-only matches store `playlistId = null`.
- Lobby create/update reject unpublished or empty-snapshot UUIDs (`PLAYLIST_UNAVAILABLE_REASON`). Start still re-checks live pool stats.
- `GET /playlists` is public (no optional auth), IP-rate-limited, `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
- Admin recipe Zod requires a positive constraint, `yearMin <= yearMax`, and array/string caps (`PLAYLIST_RECIPE_LIMITS`). Empty `{}` is rejected.

## Out of v1

Player-created playlists, sharing, fork, per-pack ladder, library browse-by-pack, INSERT songs, private packs.

## Release state

Shipped in v26.5 (`89c7627`, tag `26.5`). Staff slugs `movies` and `easy-hits` are retired by every seed; `easy-hits` was removed from production on 2026-09-12.
