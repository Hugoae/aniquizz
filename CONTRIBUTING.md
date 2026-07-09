# Contributing

Thanks for your interest in AniQuizz.

## Local setup

```bash
corepack enable
pnpm install
# Create apps/client/.env, apps/server/.env, packages/database/.env from the examples
pnpm db:generate
pnpm dev
```

Integration and e2e tests need Supabase test accounts:

```bash
pnpm rotate-test-credentials   # once — writes TEST_ACCOUNTS_PASSWORD to apps/server/.env
pnpm test:setup                # sync env + ensure @aniquizz.test users exist
```

## Conventions

### Language

- **English** for code, comments, logs, docs, and commit messages.
- **French** for user-facing UI strings only (kept isolated for future i18n).

### Commits

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <summary>
```

Types: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `perf`.

Do **not** add `Co-authored-by` trailers for automated tools — commits should
list a single human author.

### Code style

- TypeScript `strict` mode; avoid `any`.
- Prettier: `pnpm format` before committing.
- Business logic that can be pure → `packages/shared` with unit tests.

### Security

- Player identity = JWT `userId`, never `socket.id`.
- Never log secrets (JWT tokens, room passwords).
- Never commit `.env` files.

## Testing

```bash
pnpm test           # unit + component + server integration (needs DATABASE_URL)
pnpm test:e2e       # Playwright (needs E2E_EMAIL / E2E_PASSWORD)
pnpm check:english  # no French accents in server/shared comments
```

## Project layout

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the package-by-package overview.
