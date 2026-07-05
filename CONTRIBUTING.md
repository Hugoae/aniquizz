# Contributing

Thanks for your interest in AniQuizz. This document covers the local setup and
the conventions the project follows.

## Local setup

```bash
corepack enable          # ensure pnpm is available
pnpm install
# create the three .env files from the .env.example references
pnpm db:generate
pnpm dev
```

## Conventions

### Language

- **All code is written in English**: identifiers, comments, logs, docs, and
  commit messages.
- **User-facing UI text stays French** and is kept isolated so it can move to an
  i18n layer later. Do not scatter French strings through logic or logs.

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <summary>
```

Common types: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`.
This project also uses phase commits during the refactor: `phase(N): <summary>`.

### Code style

- TypeScript in `strict` mode. Avoid `any`; no new `@ts-ignore`.
- Formatting is handled by Prettier: run `pnpm format` before committing.
- Prefer pure, testable functions in `packages/shared` for business logic.

### Security

- Player identity is always the `userId` from the JWT, never `socket.id`.
- Never log secrets (JWT tokens, room passwords).
- Never commit `.env` files.

## Branching & phases

The refactor advances one phase at a time (see [`PLAN.md`](./PLAN.md) and
[`WORKFLOW.md`](./WORKFLOW.md)). Each phase ends with a review: checklist,
build/smoke verification, a progress update, and a single commit.

## Project layout

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the package-by-package overview.
