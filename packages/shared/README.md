# @aniquizz/shared

Framework-agnostic code shared by the client and server.

## Contents

| Module | Purpose |
| ------ | ------- |
| `events.ts` | Typed Socket.io contract (client ↔ server) |
| `game.ts` | Game config, room settings, payloads, public profile types |
| `types.ts` | Core domain types (`GamePlayer`, etc.) |
| `constants.ts` | Shared constants |
| `roles.ts` | `UserRole`, `hasRole()` |
| `utils.ts` | Fuzzy anime matching (`getFuzzySuggestions`) |
| `scoring.ts` | Round scoring |
| `grading.ts` | Solo medals (Bronze → Platinum) |
| `victory.ts` | Victory / game-over computation |
| `ranking.ts` | Multiplayer ranking |
| `leveling.ts` | XP → level |
| `selection.ts` | Fisher–Yates shuffle |

## Usage

```typescript
import { getFuzzySuggestions, type ServerToClientEvents } from '@aniquizz/shared';
```

Both apps depend on this package via the pnpm workspace (`workspace:*`).

## Tests

Pure functions are unit-tested here (Vitest):

```bash
pnpm --filter @aniquizz/shared test
```

## Build

TypeScript compilation only — no runtime dependencies beyond dev/build tooling.

```bash
pnpm --filter @aniquizz/shared build
```

Server and client import from `@aniquizz/shared` after the package is built (`turbo` handles `^build` ordering).
