# Kanban

A small Kanban app for experimenting with offline-first dev workflows and a minimal stack.
See `docs/kanban-app-requirements.md` for the broader product requirements.

## Local development setup

Prerequisites:

- Node 20+ and npm
- One of:
  - Supabase CLI
  - Docker Desktop
  - Host-installed Postgres 14+
- Java runtime (required by the Firebase Auth Emulator)

`firebase-tools` is a project devDependency; `npm install` brings it in and the
wizard invokes it from `node_modules/.bin/firebase`. No global Firebase CLI
install is needed.

First-time setup:

```bash
npm install
npm run dev
```

The first time you run `npm run dev`, an interactive wizard walks you through:

1. Picking a local Postgres flavor (auto-detected when possible).
2. Starting the database service.
3. Creating the `kanban_dev` and `kanban_test` databases plus required roles.
4. Starting the Firebase Auth Emulator and creating a default test user.
5. Running migrations.
6. Optionally seeding sample data.

To re-pick the database flavor:

```bash
npm run dev:setup -- --reset
```

## Running tests

```bash
npm run test
```

Tests run against `kanban_test` on the same local Postgres instance. Migrations are applied
automatically by the test setup.

## Deploying to production

```bash
vercel --prod
```

Migrations run automatically as part of the prod build (`vercel-build` is gated on
`VERCEL_ENV === "production"`, so preview deploys never migrate).

Manual migration hatch:

```bash
CONFIRM_PROD_MIGRATE=1 npm run db:migrate:prod
```

## Docs

See `docs/` for design notes and architecture docs.
