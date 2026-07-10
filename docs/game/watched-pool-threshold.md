# Watched pool threshold (opt-in random fallback)

## Behaviour

- **Watched mode** draws songs only from resolved AniList ids (union or intersection).
- When `playableSongs < soundCount`, the host must **explicitly opt in** via `watchedAllowFallback` (« Compléter avec l'aléatoire »).
- **No silent fallback** to the global catalogue.
- When `playableSongs === 0`, launch is always blocked.

## Server

- `validateWatchedStart()` runs before `startMatch`.
- `fetchWithFallback()` only completes from the global pool when `allowWatchedFallback === true`.
- `watched:get_pool_stats` socket returns `WatchedPoolStats` for lobby or solo preview.

## Client

- Pool stats shown in `SourceSection` (config) and launch gates in `SoloReady` / `MultiplayerLobby`.
- Opt-in toggle visible only when the pool is insufficient but non-empty.

## Client — multi lobby live updates

- `watchedPlayersKey` (sorted human player ids, bots excluded) is derived from `lobbyPlayers` on every `update_players`.
- Passed as `refreshKey` to `useWatchedPoolStats` in `MultiplayerLobby`, `GameConfigForm`, and `SourceSection`.
- Host banner under lobby header: playable count + fusion mode + suffisant/insuffisant.
- On insufficient → sufficient: success toast + silent `patchRoomSettings({ watchedAllowFallback: false })` via `useLobbyController`.
