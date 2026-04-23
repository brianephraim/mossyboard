# Implementation Todo

This checklist is intentionally phase-based.

- [ ] Install only the dependency group needed for the current phase
- [ ] Keep the architecture docs and README aligned as decisions become real

## Unattended Execution Rules

These rules apply to any agent executing this checklist without human supervision.

### Progress reporting

- Maintain a top-level `PROGRESS.md` file from the very first action
- Append a new dated entry every time a phase starts, a phase completes, or the agent gets stuck
- Each entry records: phase, step, outcome (`done` / `skipped` / `blocked`), short reason, and any follow-ups
- Never rewrite history in `PROGRESS.md`; only append
- End every session with a final `PROGRESS.md` entry summarizing the current state

### Keep-moving-forward policy

- Prefer completing work sequentially within a phase
- If a single step blocks for more than a reasonable attempt, log the block in `PROGRESS.md` with a `BLOCKED:` prefix, then continue with the next step that is not strictly dependent on the blocked one
- If an entire phase's verification steps fail after a real attempt, record the failure and move to the next phase only if later phases do not strictly require the broken capability
- Never skip a phase's verification steps silently — either they pass, or the failure is recorded before moving on
- Do not invent credentials, fake API responses, or stub away missing infrastructure; record the block and move forward

### Scope

- Execute phases 1 through 9 only
- Do not begin phase 10 (Kanban Product Buildout) or later without explicit human approval
- Do not open pull requests, push to `main`, or deploy to Vercel production without explicit human approval

### Commit discipline

- Make one commit at the end of each phase, after that phase's verification steps pass
- Commit message format:
  - Subject: `phase N: <phase title>` (for example `phase 3: Supabase and Server Foundation`)
  - Body: short bullet list of what landed, plus any `BLOCKED:` carryovers for that phase
- If a phase ends with unresolved blocks, still commit the completed work; append `(partial — see PROGRESS.md)` to the subject
- Sub-commits inside a phase are allowed when a large phase has natural seams (for example schema before services); every sub-commit must leave the tree building and passing typecheck
- Never commit: `.env`, `.vercel/`, generated artifacts already covered by `.gitignore`, credentials in any form, or a tree where typecheck or existing tests are red
- Do not amend, force-push, rebase, or squash — per-phase history must be preserved for human review

### Safety boundaries

- Do not run destructive database operations against any environment other than the dedicated local or test database
- Do not overwrite or delete existing `.env` values; if a required value is missing, record the block and continue
- Do not install a global package without recording the install in `PROGRESS.md`
- Do not modify `AGENTS.md`, `CLAUDE.md`, or files under `docs/` without recording the reason in `PROGRESS.md`

## Pre-Flight Checklist

Complete these before starting Phase 1. If any step fails, record the failure in `PROGRESS.md` and continue past the failure only where possible.

### Required CLIs

- [ ] Confirm `node --version` is 20 or newer
- [ ] Confirm `npm --version` is present
- [ ] Confirm `git --version` is present
- [ ] Confirm `gh` is installed and `gh auth status` reports a logged-in account
- [ ] Confirm `firebase --version` is present and `firebase projects:list` succeeds
- [ ] Confirm `vercel --version` is present and `vercel whoami` succeeds (run `vercel login` if needed)
- [ ] Confirm `supabase --version` is present (install with `brew install supabase/tap/supabase` if missing)
- [ ] Confirm `jq --version` is present

### Environment values

- [ ] Confirm `.env` contains a value for `DATABASE_URL` and that it is the Supabase **pooler** URL on port 6543 in transaction mode
- [ ] Confirm `.env` contains a value for `SUPABASE_DB_PASSWORD`
- [ ] Confirm `.env` contains a value for `FIREBASE_WEB_API_KEY` and `FIREBASE_AUTH_USERNAME_DOMAIN`
- [ ] Record in `PROGRESS.md` any of these additional values that are still missing and will be needed by later phases:
  - [ ] Firebase client bundle for the browser (`VITE_PUBLIC_FIREBASE_PROJECT_ID`, `VITE_PUBLIC_FIREBASE_AUTH_DOMAIN`, `VITE_PUBLIC_FIREBASE_APP_ID`, `VITE_PUBLIC_FIREBASE_API_KEY`, and messaging sender id if used)
  - [ ] Firebase service account JSON as `FIREBASE_SERVICE_ACCOUNT_JSON` (one-line stringified JSON) for `firebase-admin`
  - [ ] `RESEND_FROM_EMAIL` for the Resend sender address
  - [ ] `DATABASE_URL_TEST` pointing at a dedicated test database or local `supabase start` instance

### Repo state

- [ ] Confirm the working tree is clean (`git status`) before starting
- [x] Create and check out a feature branch (e.g. `feat/phases-1-to-9`) for all work
- [x] Create the initial `PROGRESS.md` with a `Started phase 1 at <timestamp>` entry

## Phase 1: Package and Tooling Baseline

### Build the baseline

- [x] Create the root `package.json`
- [x] Add scripts for `dev`, `build`, `test`, and `format`
- [x] Add TypeScript and the initial `tsconfig`
- [x] Add Prettier support if any required config file is still missing
- [x] Add Vitest as the initial test runner
- [x] Add `@testing-library/react` and `jsdom` for component testing
- [x] Add the initial Vitest setup file if needed

### Verify the phase

- [x] Add one trivial smoke test using Vitest and `node:assert/strict`
- [x] Confirm `npm install` succeeds
- [x] Confirm `npm run test` passes

## Phase 2: TanStack Start App Shell

### Build the app shell

- [x] Install TanStack Start and its required React dependencies
- [x] Scaffold the TanStack Start application structure
- [x] Add the root app entrypoints
- [x] Configure TanStack Router in the app shell
- [x] Configure TanStack Query in the app shell
- [x] Add the root route
- [x] Confirm local development starts successfully

### Verify the phase

- [x] Confirm the app boots locally without feature code
- [x] Add or update a smoke test that the root app can render

## Phase 3: Supabase and Server Foundation

### Build the persistence baseline

- [x] Confirm Supabase Postgres as the application database platform
- [x] Centralize Supabase environment reads from `.env` using the pooler URL (transaction mode, port 6543)
- [x] Use the `supabase` CLI for local DB lifecycle: `supabase start` for a local dev DB, `supabase db reset` to reapply migrations, `supabase db lint` before merge
- [x] Link the repo to a remote project with `supabase link --project-ref <ref>` once the remote project is chosen (record the ref in `PROGRESS.md`)
- [x] Install `drizzle-orm`, `drizzle-kit`, and `postgres` (the `postgres.js` driver)
- [x] Do not install `supabase-js` — the project has no PostgREST, Storage, or Realtime needs
- [x] Create `src/server/db/schema.ts` as the single source of truth for tables and indexes
- [x] Create `src/server/db/client.ts` exporting a module-level singleton Drizzle instance over `postgres.js`
- [x] Configure `drizzle-kit` to read `schema.ts` and target the Supabase DB URL
- [x] Verify `drizzle-kit generate` and `drizzle-kit migrate` run cleanly against the Supabase-backed database
- [x] Use Drizzle's relational queries API for parent-with-children reads
- [x] Use Drizzle's query builder with `.for('update')` inside `db.transaction(...)` for reorder and move paths
- [x] Install tRPC server and client packages, zod, and `@trpc/react-query`
- [x] Mount a single tRPC router as a TanStack Start server route at `/api/trpc/$`
- [x] Configure the tRPC React Query client on the frontend
- [x] Require zod `.input(...)` validation on every procedure
- [x] Add a tRPC `errorFormatter` that surfaces `zodError.flatten()` in the error `data` field
- [x] Define the initial `TRPCError` code set and document it alongside the router
- [x] Install pino, `pino-http`, and `pino-pretty` (dev only)
- [x] Create a single pino instance at server bootstrap
- [x] Add `pino-http` at the TanStack Start request boundary
- [x] Add a tRPC middleware that logs `{ path, type, durationMs, ok, requestId }` per procedure call
- [x] Keep business logic in services and persistence access in repo/query modules
- [x] If any new `public` tables are introduced, add RLS enablement and explicit policies in the same migration

### Prepare the first shared data path

- [x] Add a simple shared counter table for the first persisted feature
- [x] Add the required RLS enablement and explicit policies for that table
- [x] Decide whether the counter path uses a server route or server function and keep the database access behind the server boundary

### Verify the phase

- [x] Confirm the app can connect to the Supabase-backed database locally
- [x] Decide on the DB-test pattern once and document it in `PROGRESS.md`: a dedicated test database (`DATABASE_URL_TEST`, either a separate Supabase project or a local `supabase start` instance) running the same Drizzle migrations, with transaction-per-test rollback
- [x] Add an API test that verifies validation and error shaping on the first database-backed path
- [x] Add a service-level test for the first persistence-backed path against `DATABASE_URL_TEST`
- [x] Verify RLS policies exist for any new or altered `public` tables
- [x] Run `supabase db lint` and confirm it is clean before merge

## Phase 4: Shared Click Counter Vertical Slice

### Build the first real feature slice

- [x] Add a typed read endpoint or server function for the shared counter
- [x] Add a typed increment endpoint or server function for the shared counter
- [x] Add a simple page that displays the current shared count
- [x] Add a button that increments the shared count through the real backend path
- [x] Show loading, success, and error states for the counter interactions
- [x] Keep the counter intentionally unauthenticated and shared across all visitors

### Verify the phase

- [x] Add a test for the counter response shape
- [x] Add a service or repo test that verifies increments persist correctly
- [x] Add a UI test that verifies the page renders the current count
- [x] Add a UI test that verifies clicking increments the count
- [x] Confirm the browser shows the same shared count updating through the real backend path

## Phase 5: Vercel Deployment Setup

### Prepare deployment after the counter slice is ready

- [x] Add Vercel as the canonical deployment target for the app
- [x] Use `vercel link` from the repo root to associate it with a Vercel project (create the project through `vercel link` if it does not yet exist; record the project name in `PROGRESS.md`)
- [x] Use `vercel env add <NAME> production` and `vercel env add <NAME> preview` for each required environment variable rather than setting them through the dashboard
- [x] Use `vercel pull` to sync environment variables into `.vercel/.env.*.local` for local verification
- [x] Confirm the build and runtime settings match the TanStack Start application needs
- [ ] Add or update deploy scripts as needed so they align with Vercel
- [ ] Trigger the first deploy with `vercel --prod` only after human approval is recorded in `PROGRESS.md`
- [ ] If human approval for production deploy is not available, deploy a preview with `vercel` (no `--prod`) and record the preview URL in `PROGRESS.md` as the closest verifiable artifact
- [ ] Keep deployment behavior aligned with Vercel instead of Firebase hosting

### Verify the phase

- [ ] Confirm the shared click counter app deploys successfully to Vercel
- [ ] Confirm the deployed app can reach the Supabase-backed counter path
- [ ] Confirm the deployed environment variables are wired correctly

## Phase 6: Firebase Authentication Foundation

### Build the auth baseline

- [ ] Install the Firebase client SDK (`firebase`)
- [ ] Install the server-side Firebase auth dependency (`firebase-admin`) needed for privileged auth operations
- [ ] Use the `firebase` CLI (`firebase projects:list`, `firebase apps:sdkconfig web`) to retrieve client-bundle values when populating `VITE_PUBLIC_FIREBASE_*` env vars
- [ ] If `FIREBASE_SERVICE_ACCOUNT_JSON` is missing from `.env`, record the block in `PROGRESS.md` and skip to the next non-dependent step rather than generating or embedding credentials
- [ ] Centralize Firebase environment reads from `.env`
- [ ] Add a focused auth client module
- [ ] Add a focused server auth module
- [ ] Implement email/password sign-up
- [ ] Implement email/password sign-in
- [ ] Implement sign-out
- [ ] Add auth session observation for the frontend
- [ ] Add a simple auth status surface or protected test route
- [ ] Keep Firebase usage inside auth-focused modules rather than scattering SDK calls through feature UI
- [ ] Forward the Firebase ID token from the frontend on every tRPC request via the `Authorization` header
- [ ] Add a tRPC `protectedProcedure` middleware that verifies the Firebase ID token with `firebase-admin`
- [ ] Place the verified Firebase UID on the tRPC `ctx` as `ctx.userId`
- [ ] Reject unauthenticated calls to protected procedures with a consistent `TRPCError` code

### Verify the phase

- [ ] Add tests for auth module behavior with mocked Firebase calls
- [ ] Add a tRPC middleware test covering missing, invalid, and valid ID tokens
- [ ] Confirm a user can sign up, sign in, and sign out locally with the existing `.env` values

## Phase 7: Resend-Backed Auth Emails

### Build the mail flow

- [ ] Install the Resend SDK
- [ ] Add a dedicated server-side mail delivery module
- [ ] Implement server-side generation of Firebase auth action links
- [ ] Send verification emails through Resend instead of provider-managed default templates
- [ ] Send password reset emails through Resend instead of provider-managed default templates
- [ ] Keep provider-specific email code isolated behind the mail delivery boundary

### Verify the phase

- [ ] Add tests that verify auth email payloads and action links are passed to the mail module correctly
- [ ] Confirm a local auth email flow can be triggered with the existing `.env` values

## Phase 8: Shared Client State

### Add Redux only when it becomes necessary

- [ ] Install Redux Toolkit and React Redux only when a real shared client-state need appears
- [ ] Add the Redux store bootstrap
- [ ] Add the first slice for a real cross-feature concern such as filters, grouping mode, active selection, or workflow state
- [ ] Keep remote data in TanStack Query rather than Redux
- [ ] Keep local interaction state in React component state where possible

### Verify the phase

- [ ] Add unit tests for the first slice and selectors
- [ ] Confirm Redux is solving a real shared-state problem rather than duplicating server data

## Phase 9: Tamagui UI Foundation

### Add the design system before broader product UI work

- [ ] Install `@tamagui/core`
- [ ] Install the minimum additional Tamagui packages actually needed
- [ ] Keep all `@tamagui/*` packages on the same version
- [ ] Add Tamagui configuration, tokens, and theme setup
- [ ] Add the Tamagui provider at the app root
- [ ] Convert the click counter and auth surfaces to Tamagui primitives
- [ ] Avoid raw HTML JSX where Tamagui primitives can be used instead

### Verify the phase

- [ ] Add a component test that renders a Tamagui-based screen successfully
- [ ] Confirm the app shell and auth screens still work after the provider is introduced

## Phase 10: Kanban Product Buildout

### Build the product features

- [ ] Add the board, column, and card data model
- [ ] Add an `owner_id TEXT NOT NULL` column on `boards` holding the Firebase UID
- [ ] Add a `deleted_at TIMESTAMPTZ` column on `boards` and `cards` for soft delete
- [ ] Add RLS enablement on `boards`, `columns`, and `cards` with default-deny policies for `anon` and `authenticated` roles
- [ ] Add a fractional string `position` key column to cards and columns
- [ ] Add a `version` integer column to cards and columns for optimistic concurrency
- [ ] Add a `keyBetween(prev, next)` helper for generating fractional keys
- [ ] Make every service method accept `ownerId` as an explicit argument sourced from `ctx.userId`
- [ ] Make every read filter by `owner_id` through the board join and by `deleted_at IS NULL`
- [ ] Validate on every write that every referenced board, source column, and target column belongs to `ownerId`
- [ ] Add APIs for card CRUD
- [ ] Add card movement between columns
- [ ] Add card reordering within a column
- [ ] Add column creation
- [ ] Add column reordering
- [ ] Add soft delete for cards
- [ ] Add listing with filters and pagination ordered by `position ASC`
- [ ] Wrap each move and reorder in a transaction with `SELECT ... FOR UPDATE` on the moved row
- [ ] Require clients to pass the last-known `version` on reorder and move mutations
- [ ] Reject mismatched-version writes with a consistent conflict error shape
- [ ] Add a lazy per-column rebalance path triggered when `position` keys exceed a length threshold
- [ ] Add at least one card detail surface such as comments, tags, or subtasks
- [ ] Add filtering by at least one attribute
- [ ] Add grouping by at least one attribute
- [ ] Make the board usable on mobile screen sizes
- [ ] Add keyboard-friendly modal and form flows
- [ ] Add reasonable accessibility defaults

### Verify the phase

- [ ] Add unit tests for create, move, filter, and group logic
- [ ] Add component tests for key board interactions
- [ ] Add API and service tests for core backend paths
- [ ] Add ownership-boundary tests asserting user A cannot read, move, reorder, or delete user B's boards, columns, or cards

## Phase 11: End-to-End Coverage

### Add browser-level coverage

- [ ] Install Playwright with Chromium
- [ ] Add the shared login helper that reads from `AGENT_LOGIN_EMAIL` and `AGENT_LOGIN_PASSWORD`
- [ ] Add a happy-path flow for the shared click counter
- [ ] Expand end-to-end coverage later to sign-in and basic board usage

### Verify the phase

- [ ] Confirm the happy-path Playwright test passes locally

## Phase 12: Documentation Completion

### Finish the project docs

- [ ] Keep the architecture overview aligned with the implemented setup order
- [ ] Document that TanStack Start bootstraps Router and Query together
- [ ] Document that the first database-backed slice is an unauthenticated all-visitor-shared click counter
- [ ] Document that Firebase is auth-only in this project
- [ ] Document that auth emails are delivered through Resend-backed server flows
- [ ] Document that Supabase Postgres is the application database platform
- [ ] Document that Vercel is the canonical deployment target
- [ ] Document the final state management approach in the README
- [ ] Add setup and run instructions
- [ ] Add database and schema overview
- [ ] Add API overview
- [ ] Add key UX decisions, trade-offs, and future improvements

## Working Order Summary

- [ ] Phase 1: Package and Tooling Baseline
- [ ] Phase 2: TanStack Start App Shell
- [ ] Phase 3: Supabase and Server Foundation
- [ ] Phase 4: Shared Click Counter Vertical Slice
- [ ] Phase 5: Vercel Deployment Setup
- [ ] Phase 6: Firebase Authentication Foundation
- [ ] Phase 7: Resend-Backed Auth Emails
- [ ] Phase 8: Shared Client State
- [ ] Phase 9: Tamagui UI Foundation
- [ ] Phase 10: Kanban Product Buildout
- [ ] Phase 11: End-to-End Coverage
- [ ] Phase 12: Documentation Completion
