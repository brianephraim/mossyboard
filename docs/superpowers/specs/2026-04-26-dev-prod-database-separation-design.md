# Dev/Prod Database Separation + Local Auth Emulator

**Status:** Design (not yet implemented)
**Owner:** Brian
**Date:** 2026-04-26
**Related:** AGENTS.md (database, accessibility, formatting rules)

## Problem

The repo currently shares a single Supabase Postgres project between local dev and production.
A misconfigured `.env`, a stray `predev` migration, or a careless query during development can
mutate prod data. Tests also point at a separate Supabase project, so even the test loop pays
network latency and depends on a remote shared resource.

We want:

1. A local Postgres database for dev work — no remote Supabase reachable from `npm run dev`.
2. The existing Supabase project used for prod only.
3. `npm run dev` migrates the local DB automatically (today's behavior, retargeted).
4. Prod deploys migrate the remote DB automatically.
5. A top-level `README.md` with a local-dev setup section.
6. `npm run dev` prefixed by an interactive setup wizard that detects missing pieces, prompts
   `[Y/n]` for each fix, and only hands off to vite once everything is green.
7. (Folded into this design) Replace real Firebase Auth in dev with the Firebase Auth Emulator,
   so local development needs zero real Firebase secrets.

## Non-goals

- Setting up CI (GitHub Actions). Out of scope; called out in "Future work" so the design
  doesn't preclude it.
- Migrating any existing prod data; the prod Supabase keeps its current contents.
- Building a custom JWT / auth abstraction. We use Firebase's official emulator instead.

## Decisions log

The following choices are settled. Any future change should be a deliberate revisit, not a
silent rewrite.

| #   | Decision                                                                                                                                                                                                 | Rationale                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Support **all three** local Postgres flavors: Supabase CLI, Docker, host-installed.                                                                                                                      | Devs already have one of these installed; forcing a specific flavor adds onboarding friction. The app is flavor-agnostic — only the wizard's detection/setup branches differ.                                          |
| 2   | Auto-detect flavor on first run, persist as `KANBAN_LOCAL_DB_FLAVOR` in `.env`. Re-pick via `npm run dev:setup --reset`.                                                                                 | Avoids re-detecting on every `npm run dev` and stops the wizard from being confused when multiple flavors are installed simultaneously.                                                                                |
| 3   | **Tests move to local Postgres** (separate database `kanban_test` on the same instance).                                                                                                                 | CI/CD is not yet built; nothing to break. Local test loop becomes offline + fast. CI, when added later, can spin up Postgres as a service container against the same migrations.                                       |
| 4   | **Auto-migrate on prod deploy** via `vercel-build`, gated on `VERCEL_ENV === "production"`. Manual hatch: `CONFIRM_PROD_MIGRATE=1 npm run db:migrate:prod`.                                              | One-developer project; convenience outweighs the manual-gate caution. Forward-compatible migrations (no destructive change in the same deploy that needs the old column gone) are a discipline, not a tooling concern. |
| 5   | Env layout option **(b)**: prod creds live only in Vercel env config; `.env` is dev-only.                                                                                                                | Removes prod creds from disk — the sharpest single improvement to safer dev/prod separation.                                                                                                                           |
| 6   | Auth in dev via **Firebase Auth Emulator** (not custom JWT).                                                                                                                                             | Same SDK and code path as prod; Google maintains the emulator. Avoids carrying a second auth implementation forever.                                                                                                   |
| 7   | Email in dev: **stub** by writing `RESEND_API_KEY=disabled-in-dev`; the email service detects the `disabled-` prefix and logs the email instead of sending. Devs who want real email override the value. | Most dev work doesn't touch email; this lets the wizard land a working `.env` with zero manual entry.                                                                                                                  |
| 8   | Wizard **never clobbers existing `.env` keys**. It only fills in missing keys (generic constants) and writes derived values (DB URL) after flavor selection.                                             | Respects developer overrides. Re-running the wizard after manual edits doesn't undo them.                                                                                                                              |

## Target architecture

### Three databases, three contexts

| Context | DB location                                          | URL source                       | Migration trigger                                                                       |
| ------- | ---------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| Dev     | Local Postgres (chosen flavor) on `localhost`        | `.env` `DATABASE_URL`            | `predev` runs the wizard, which runs `db:migrate` after setup                           |
| Test    | Same local Postgres, separate database `kanban_test` | `.env` `DATABASE_URL_TEST`       | `migrateTestDb()` (already wired; just needs the URL retargeted)                        |
| Prod    | Existing Supabase project                            | Vercel env config `DATABASE_URL` | `vercel-build` runs migration gated on `VERCEL_ENV === "production"`, then `vite build` |

### Auth, two contexts

| Context | Auth implementation                                               | Token verification                                                                           |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Dev     | Firebase Auth Emulator on `localhost:9099`, started by the wizard | `firebase-admin` auto-detects `FIREBASE_AUTH_EMULATOR_HOST` and skips signature verification |
| Prod    | Real Firebase Authentication (existing project)                   | `firebase-admin` with `FIREBASE_SERVICE_ACCOUNT_JSON` from Vercel env config                 |

Same code path in both. The only client-side change is a `connectAuthEmulator(...)` call gated
on `import.meta.env.MODE !== "production"`. The only server-side change is making sure the
admin SDK is initialized with `{ projectId }` so it can route emulator traffic.

## Env file layout

### `.env` after this change (gitignored, dev-only)

```
# --- Local database (written by the wizard) ---
KANBAN_LOCAL_DB_FLAVOR=docker            # one of: supabase | docker | host
DATABASE_URL=postgres://postgres:postgres@localhost:5432/kanban_dev
DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5432/kanban_test

# --- Firebase Auth Emulator (placeholders, not real creds) ---
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
VITE_PUBLIC_FIREBASE_API_KEY=fake-api-key
VITE_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-kanban.firebaseapp.com
VITE_PUBLIC_FIREBASE_PROJECT_ID=demo-kanban
VITE_PUBLIC_FIREBASE_APP_ID=demo-app-id

# --- Email stub ---
RESEND_API_KEY=disabled-in-dev
RESEND_FROM_EMAIL=dev@example.com

# --- Default seed/test user (written after the emulator user is created) ---
KANBAN_DEV_OWNER_ID=<emulator-user-uid>
```

Notable removals vs today:

- `FIREBASE_SERVICE_ACCOUNT_JSON` — not needed; emulator tokens are unsigned.
- `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_PASSWORD_TEST`, `DATABASE_URL_TEST_POOLER` — not needed; everything Supabase-related moves to Vercel env config.

The five `VITE_PUBLIC_FIREBASE_*` values are public placeholders, identical for every dev. The
`demo-` prefix on the project ID is a Firebase SDK signal: "this is a demo project, do not
contact Google's servers."

### `.env.example` (committed)

A template file matching `.env` shape with all generic constants pre-filled. New contributors
copy it to `.env` (the wizard does this automatically) and the wizard fills in derived values.

### Vercel env config (production scope)

Holds the prod `DATABASE_URL` (Supabase), `FIREBASE_SERVICE_ACCOUNT_JSON`, the real
`VITE_PUBLIC_FIREBASE_*` values for the prod Firebase project, real Resend keys, etc. Set via
`vercel env add` or the Vercel dashboard. **Never written to local disk.**

## Safety guard for migration

A single wrapper, `scripts/db-migrate.mjs`, guards every migration call:

- Reads `DATABASE_URL` from env.
- If the URL host is not `localhost` / `127.0.0.1` **and** `KANBAN_ALLOW_REMOTE_MIGRATE` is not
  set → exit with a loud error: "refusing to migrate non-local database. Set
  `KANBAN_ALLOW_REMOTE_MIGRATE=1` to override."
- Otherwise invokes `drizzle-kit migrate`.

`predev` invokes the wizard, which invokes `db:migrate`, which invokes this wrapper. So a stale
`.env` pointing at Supabase cannot accidentally migrate prod via `npm run dev`.

The prod migration paths (`db:migrate:prod`, `vercel-build`) explicitly set the override flag.

## Wizard behavior — `scripts/dev-setup.mjs`

Replaces the current `predev: drizzle-kit migrate` script. Steps in order. Each step: detect →
if green, skip silently; if amiss, prompt with a 1-2 line explanation and `[Y/n]`. The wizard
exits non-zero on user "n" so vite never starts in a half-configured state.

1. **Prod-creds bleed check.** If `.env` `DATABASE_URL` host matches `*.supabase.co` or any
   non-localhost host, refuse to continue. Print: "Your `.env` `DATABASE_URL` looks like prod.
   Move these values to Vercel env config first. Walk through it now? [Y/n]" — on yes, print
   the `vercel env add` commands for each prod-shaped key currently in `.env`, then exit.
2. **Ensure `.env` exists.** Create with header comment if missing.
3. **Write generic constants.** Add any of the `VITE_PUBLIC_FIREBASE_*` placeholders,
   `FIREBASE_AUTH_EMULATOR_HOST`, `RESEND_API_KEY=disabled-in-dev`, `RESEND_FROM_EMAIL` that are
   not already present. Never overwrite existing values.
4. **DB flavor selection.** Auto-detect:
   - `supabase --version` → Supabase CLI candidate
   - `docker info` → Docker candidate
   - `pg_isready -h localhost` → host Postgres candidate
   - If exactly one detected → use it.
   - If multiple or none → prompt: "Pick: (a) Supabase CLI (b) Docker (c) host Postgres."
   - Persist `KANBAN_LOCAL_DB_FLAVOR=...` to `.env`.
5. **DB tool installed.** Verify the chosen flavor's binary is on PATH. If missing, print the
   install command for the OS (`brew install supabase/tap/supabase` / "install Docker Desktop"
   / `brew install postgresql@16`) and exit.
6. **DB service running.** Verify reachable; if not, prompt to start:
   - Supabase: `supabase start`
   - Docker: `docker compose up -d` (compose file committed at repo root)
   - Host: `brew services start postgresql@16` on macOS, instruction-only on Linux
7. **`anon` and `authenticated` roles exist.** Skip for Supabase CLI flavor (already exist).
   For Docker / host: query `pg_roles`; if missing, prompt and run
   `CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;`
8. **`kanban_dev` and `kanban_test` databases exist.** If missing, prompt and `createdb`.
9. **Write `DATABASE_URL` and `DATABASE_URL_TEST`** based on flavor's port. Only writes if
   missing — respects manual overrides.
10. **Firebase CLI installed.** `firebase --version`. If missing, print
    `npm install -g firebase-tools` and exit.
11. **Java runtime installed.** `java -version`. If missing, print install instructions for the
    OS (Java is required by the auth emulator) and exit.
12. **`firebase.json` committed at repo root.** This file is committed; if missing, the wizard
    creates it (one-time bootstrap). Contents: auth emulator on port 9099, UI disabled.
13. **Auth emulator running.** Check `localhost:9099`. If not running, prompt to start
    `firebase emulators:start --only auth` as a background process. The wizard owns the
    process handle and kills it on `SIGINT` so `Ctrl+C` doesn't leave an orphan.
14. **Default emulator user exists.** Query the emulator's REST API
    (`http://localhost:9099/identitytoolkit.googleapis.com/v1/projects/demo-kanban/accounts`).
    If absent, create `dev@example.com` / `password` and write the resulting UID to `.env` as
    `KANBAN_DEV_OWNER_ID`.
15. **Run migrations.** `node scripts/db-migrate.mjs` against `DATABASE_URL`. Drizzle is
    idempotent — always safe to run.
16. **Seed data.** If the `boards` table is empty, prompt to seed.
17. **Hand off to vite.** All checks green → exec `vite`.

When everything is green on a re-run, the wizard exits in ~200ms.

## Migration scripts

### `scripts/db-migrate.mjs`

```ts
// Pseudocode shape. Real implementation in TypeScript or .mjs.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");
const host = new URL(url).hostname;
const isLocal = host === "localhost" || host === "127.0.0.1";
if (!isLocal) {
  const allowRemote = process.env.KANBAN_ALLOW_REMOTE_MIGRATE === "1";
  const confirmProd = process.env.CONFIRM_PROD_MIGRATE === "1";
  if (!allowRemote || !confirmProd) {
    console.error(`Refusing to migrate non-local database (host=${host}).`);
    console.error("Set BOTH KANBAN_ALLOW_REMOTE_MIGRATE=1 and CONFIRM_PROD_MIGRATE=1 to override.");
    process.exit(1);
  }
  console.error(`About to migrate REMOTE database: ${host}`);
}
spawnSync("npx", ["drizzle-kit", "migrate"], { stdio: "inherit" });
```

### `scripts/vercel-build.mjs`

```ts
const env = process.env.VERCEL_ENV;
if (env === "production") {
  process.env.KANBAN_ALLOW_REMOTE_MIGRATE = "1";
  process.env.CONFIRM_PROD_MIGRATE = "1";
  // Run db migration first; abort the deploy if it fails.
  spawnSync("node", ["scripts/db-migrate.mjs"], { stdio: "inherit" });
}
spawnSync("npx", ["vite", "build"], { stdio: "inherit" });
```

Failed migration aborts the deploy. Preview deploys never migrate.

### `package.json` script changes

```jsonc
{
  "scripts": {
    "predev": "node scripts/dev-setup.mjs",
    "dev": "vite",
    "build": "vite build",
    "vercel-build": "node scripts/vercel-build.mjs",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "node scripts/db-migrate.mjs",
    "db:migrate:prod": "KANBAN_ALLOW_REMOTE_MIGRATE=1 CONFIRM_PROD_MIGRATE=1 node scripts/db-migrate.mjs",
    "db:seed": "node scripts/db-seed.mjs",
    "db:reset": "node scripts/db-reset.mjs",
    "dev:setup": "node scripts/dev-setup.mjs",
  },
}
```

Note: `db:migrate:prod` reads `CONFIRM_PROD_MIGRATE` and refuses to run unless it is set, even
with `KANBAN_ALLOW_REMOTE_MIGRATE=1` already set. Two flags = two deliberate keystrokes for an
irreversible action.

## Code changes

### Client-side Firebase init

Wherever the SDK is initialized (search for `initializeApp(`):

```ts
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

if (import.meta.env.MODE !== "production") {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
}
```

### Server-side Firebase admin init

`firebase-admin` auto-detects `FIREBASE_AUTH_EMULATOR_HOST`. Confirm the existing init call
provides `{ projectId }` (already does via `serverEnv.VITE_PUBLIC_FIREBASE_PROJECT_ID` —
verify when implementing). When `FIREBASE_AUTH_EMULATOR_HOST` is set:

- ID-token verification skips signature checks (emulator tokens are unsigned).
- No `FIREBASE_SERVICE_ACCOUNT_JSON` is required.

### Email service stub

Wherever the Resend client sends mail (search for `resend.emails.send`):

```ts
const apiKey = serverEnv.RESEND_API_KEY;
if (apiKey.startsWith("disabled-")) {
  logger.info({ to, subject, body }, "[email stub] would send email");
  return { id: "stub-" + Date.now(), success: true };
}
// existing real send
```

### Test database setup

`src/server/testing/database.ts` already reads `DATABASE_URL_TEST_POOLER ?? DATABASE_URL_TEST`.
After this change there is no pooler — drop the `_POOLER` fallback and just read
`DATABASE_URL_TEST`. `requireSsl()` should also skip URL rewriting when the host is localhost
(local Postgres won't accept `sslmode=require`).

`src/server/counter/repo.test.ts` has the same `_POOLER` fallback — update it the same way.

### `firebase.json` (new, committed)

```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "ui": {
      "enabled": false
    }
  }
}
```

### `.firebaserc` (new, committed)

```json
{
  "projects": {
    "default": "demo-kanban"
  }
}
```

The `demo-` prefix means the Firebase CLI never tries to authenticate against a real project.

### Docker compose file (new, committed) — only if Docker flavor is supported

`docker-compose.dev.yml` at repo root:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: kanban_dev_pg
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - kanban_dev_pg_data:/var/lib/postgresql/data
volumes:
  kanban_dev_pg_data:
```

### Drizzle config

`drizzle.config.ts` already throws when `DATABASE_URL` is missing — keep that behavior. The
wizard ensures `DATABASE_URL` is set before drizzle-kit runs, so no change needed.

## Seed data — `scripts/db-seed.mjs`

- Owner: `KANBAN_DEV_OWNER_ID` (set by wizard step 14).
- Creates one board "My First Board" with three columns: "Todo", "In progress", "Done".
- Three cards in "Todo" ("Set up local dev", "Read the README", "Try drag-and-drop"), one in
  each of the other columns.
- Idempotent: skip if the user already owns boards. The wizard's "seed?" prompt only fires when
  the table is empty, but the script itself should also be safe to re-run.

## Top-level `README.md` (new file)

````markdown
# Kanban

[One-paragraph project overview — see docs/kanban-app-requirements.md for the full product spec.]

## Local development setup

Prerequisites:

- Node 20+ and npm
- One of: Supabase CLI, Docker Desktop, or host-installed Postgres 14+
- Firebase CLI (`npm install -g firebase-tools`)
- Java runtime (required by the Firebase Auth Emulator)

First-time setup:

```bash
npm install
npm run dev
```
````

The first time you run `npm run dev`, an interactive wizard walks you through:

1. Picking a local Postgres flavor (auto-detected if you only have one).
2. Starting the database service.
3. Creating the `kanban_dev` and `kanban_test` databases plus required roles.
4. Starting the Firebase Auth Emulator and creating a default test user.
5. Running migrations.
6. Optionally seeding sample data.

Once everything is green it hands off to vite. On subsequent runs the wizard exits in ~200ms
when nothing has changed.

To re-pick the database flavor: `npm run dev:setup --reset`.

## Running tests

```bash
npm run test
```

Tests run against `kanban_test` on the same local Postgres instance. Migrations are applied
automatically by the test setup.

## Deploying to production

Production deploy:

```bash
vercel --prod
```

Migrations run automatically as part of the prod build (`vercel-build` is gated on
`VERCEL_ENV === "production"` so preview deploys never migrate).

Manual migration hatch (debugging, one-offs):

```bash
CONFIRM_PROD_MIGRATE=1 npm run db:migrate:prod
```

## Project structure

See [`docs/README.md`](./docs/README.md) for the full docs index.

````

## File-by-file change list

**New files:**

- `README.md` (top-level)
- `.env.example`
- `firebase.json`
- `.firebaserc`
- `docker-compose.dev.yml`
- `scripts/dev-setup.mjs`
- `scripts/db-migrate.mjs`
- `scripts/vercel-build.mjs`
- `scripts/db-seed.mjs`
- `scripts/db-reset.mjs`

**Modified:**

- `package.json` — script changes per "Migration scripts" section
- `src/server/testing/database.ts` — drop `_POOLER` fallback, conditional `requireSsl`
- `src/server/counter/repo.test.ts` — drop `_POOLER` fallback
- `src/firebase/*` (or wherever client init lives) — add `connectAuthEmulator` call
- Email service module — add `disabled-` prefix stub
- `.gitignore` — ensure `.env` is gitignored (verify it already is); also ignore
  `firebase-debug.log` and `.firebase/`

**Deleted / migrated to Vercel:**

- All Supabase-related env values move out of `.env` into Vercel env config:
  - `DATABASE_URL` (production)
  - `FIREBASE_SERVICE_ACCOUNT_JSON`
  - Real `VITE_PUBLIC_FIREBASE_*` values
  - Real `RESEND_API_KEY`, `RESEND_API_KEY_SENDING_ACCESS`, `RESEND_FROM_EMAIL`
- `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_PASSWORD_TEST`, `DATABASE_URL_TEST_POOLER` removed
  entirely (no longer used).

## Acceptance criteria

A fresh checkout on a developer machine that already has *one* of {Supabase CLI, Docker,
host Postgres} + Firebase CLI + Java should be runnable end-to-end with:

```bash
git clone <repo>
cd kanban
npm install
npm run dev
# answer [Y] to wizard prompts
# wizard finishes, vite starts, app loads in browser, login works against emulator,
# seeded board is visible, drag-and-drop works
````

Specific gates:

- [ ] `npm run dev` cannot migrate prod, even with a stale `.env`. Verified by setting
      `DATABASE_URL` to a Supabase URL and confirming the migration step refuses.
- [ ] `vercel-build` migrates only when `VERCEL_ENV === "production"`. Verified by inspecting
      a preview build's logs and confirming no migration ran.
- [ ] `npm run test` runs fully against local Postgres. Verified by killing network access and
      confirming tests pass.
- [ ] Local app login uses the auth emulator. Verified by inspecting network calls (no traffic
      to `*.googleapis.com` for auth) and by confirming the user can sign in with
      `dev@example.com` / `password`.
- [ ] No `FIREBASE_SERVICE_ACCOUNT_JSON`, real Firebase API key, real Resend key, or Supabase
      `DATABASE_URL` is present in `.env` after the wizard runs on a fresh checkout.
- [ ] Re-running `npm run dev` when everything is set up exits the wizard in <300ms before
      handing to vite.

## Future work (out of scope for this design)

- **CI pipeline.** When GitHub Actions is added, the CI job should `services: postgres` (or
  spin up the same docker-compose), set `KANBAN_ALLOW_REMOTE_MIGRATE` only for the deploy job,
  and call `npm run db:migrate:prod` after tests pass on `main`.
- **Real-email dev mode.** Devs who actually want to test email flows can override
  `RESEND_API_KEY` to a real key in their own `.env`. No tooling change needed today.
- **Schema reset / nuke command.** `db:reset` is listed as a script but its body is out of
  scope — leave as a stub the implementing agent fills in.
- **Multi-developer Firebase project.** If we ever want a shared dev Firebase project (vs the
  emulator), it would replace step 13 of the wizard with a real project login flow. Today the
  emulator is sufficient.

## Open questions for the implementing agent

1. **Where is the client-side Firebase init?** Search for `initializeApp(` in `src/`. The
   design assumes a single init point; verify before adding `connectAuthEmulator`.
2. **Where is the email send call?** Search for `resend.emails.send` or imports of `resend`.
   The design assumes a single service module; verify and add the `disabled-` prefix guard
   there.
3. **Does the existing app code create owner-rows lazily on first login, or expect them to
   already exist?** Schema has no `users` table — `ownerId` is a free-form `text` column. So
   "create user row on first login" is not a concern; any Firebase UID just becomes a valid
   owner. Verify this by reading the auth-aware tRPC procedures and confirming no JOIN against
   a users table.
4. **Are there other Supabase-shaped assumptions in code?** Search for `supabase` (case
   insensitive) across `src/` and confirm nothing else (e.g., a Supabase JS client) needs to
   be retired.
5. **Linux instructions for `brew services`.** The wizard's "start Postgres service" step is
   macOS-shaped. Linux equivalent is `systemctl start postgresql`. Decide whether to detect
   the platform and branch, or print platform-specific instructions and let the user run them.

## Implementation order suggested

1. Land the safety guard first (`scripts/db-migrate.mjs` + wire `db:migrate` to it). Verify the
   guard catches a Supabase URL. Commit.
2. Land Vercel build wrapper (`scripts/vercel-build.mjs`). Test against a preview deploy,
   confirm it skips migration. Commit.
3. Move prod creds to Vercel env config (manual, with you walking through `vercel env add`).
4. Add the auth emulator code paths (client + server) and `firebase.json` / `.firebaserc`. Run
   the emulator manually to verify login works locally before automating it.
5. Add the email-stub guard.
6. Retarget tests at local Postgres (delete `_POOLER` fallbacks, point `DATABASE_URL_TEST` at
   `kanban_test`). Run the test suite to verify.
7. Build the wizard (`scripts/dev-setup.mjs`) — start with detection-only (no prompts), wire
   prompts last. Run end-to-end on a fresh checkout in a worktree.
8. Add seed script.
9. Add top-level `README.md` and `.env.example`.

Each step is independently shippable. Keeping them as separate commits gives a clean rollback
point per concern.
