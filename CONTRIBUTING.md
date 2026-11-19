# Contributing

Thanks for your interest in AniQuizz.

## Local setup

```bash
corepack enable
pnpm install
# Create apps/client/.env, apps/server/.env, packages/database/.env from the examples
pnpm db:generate
pnpm dev                 # client + server + shared tsc --watch
```

Integration and e2e tests need Supabase test accounts:

```bash
pnpm rotate-test-credentials   # once — writes TEST_ACCOUNTS_PASSWORD to apps/server/.env
pnpm test:setup                # sync env + ensure @aniquizz.test users exist
```

## Conventions

### Language

- **English** for code, comments, logs, docs, and commit messages.
- **French and English** for player-facing UI. French is the source and uses vouvoiement. Add the English in the same change (`tx()` or `pick()`, read when the screen renders). A missing English string falls back to French. Do not spread a copy object that uses getters.
- The site follows the browser (`en` or `fr`) until the player chooses. An account choice wins over the device. Details: [`AGENTS.md`](./AGENTS.md) § Languages.
- **French** stays for the admin console, server error sentences, anime titles, song names, usernames, and room names.

### Commits

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <summary>
```

Types: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `perf`.

Do **not** add `Co-authored-by` trailers for automated tools — commits should
list a single human author.

### Code style

- TypeScript `strict` mode on shared, server, and client; avoid `any`. Client `tsc` runs in CI.
- Prettier: `pnpm format` before committing. CI runs `pnpm format:check` (fail-fast, after the English-code check).
- Business logic that can be pure → `packages/shared` with unit tests.
- Mutating Socket.io payloads are Zod-parsed (`socketPayloads.ts`); do not trust the typed event signature at runtime.
- Package imports: client ↛ server/database; shared ↛ react/express/prisma; server ↛ react/client. ESLint enforces this.
- Client `jsx-a11y` is warn until a cleanup pass.

### Security

- Player identity = JWT `userId`, never `socket.id`.
- Never log secrets (JWT tokens, room passwords).
- Never commit `.env` files.

## Testing

```bash
pnpm test           # unit + component + server integration (needs DATABASE_URL)
pnpm test:e2e       # Playwright (needs E2E_EMAIL / E2E_PASSWORD)
pnpm typecheck      # tsc across packages (client included)
pnpm format:check   # Prettier; run `pnpm format` to fix
pnpm check:english  # no French accents in server/shared comments
```

## Project layout

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the package-by-package overview.
