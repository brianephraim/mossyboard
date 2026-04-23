# Implementation Todo

This checklist is intentionally phase-based.

- [ ] Install only the dependency group needed for the current phase
- [ ] Keep the architecture docs and README aligned as decisions become real

## Phase 1: Package and Tooling Baseline

### Build the baseline

- [ ] Create the root `package.json`
- [ ] Add scripts for `dev`, `build`, `test`, and `format`
- [ ] Add TypeScript and the initial `tsconfig`
- [ ] Add Prettier support if any required config file is still missing
- [ ] Add Vitest as the initial test runner
- [ ] Add `@testing-library/react` and `jsdom` for component testing
- [ ] Add the initial Vitest setup file if needed

### Verify the phase

- [ ] Add one trivial smoke test using Vitest and `node:assert/strict`
- [ ] Confirm `npm install` succeeds
- [ ] Confirm `npm run test` passes

## Phase 2: TanStack Start App Shell

### Build the app shell

- [ ] Install TanStack Start and its required React dependencies
- [ ] Scaffold the TanStack Start application structure
- [ ] Add the root app entrypoints
- [ ] Configure TanStack Router in the app shell
- [ ] Configure TanStack Query in the app shell
- [ ] Add the root route
- [ ] Confirm local development starts successfully

### Verify the phase

- [ ] Confirm the app boots locally without feature code
- [ ] Add or update a smoke test that the root app can render

## Phase 3: Supabase and Server Foundation

### Build the persistence baseline

- [ ] Confirm Supabase Postgres as the application database platform
- [ ] Centralize Supabase environment reads from `.env` using the pooler URL (transaction mode, port 6543)
- [ ] Install `drizzle-orm`, `drizzle-kit`, and `postgres` (the `postgres.js` driver)
- [ ] Do not install `supabase-js` — the project has no PostgREST, Storage, or Realtime needs
- [ ] Create `src/server/db/schema.ts` as the single source of truth for tables and indexes
- [ ] Create `src/server/db/client.ts` exporting a module-level singleton Drizzle instance over `postgres.js`
- [ ] Configure `drizzle-kit` to read `schema.ts` and target the Supabase DB URL
- [ ] Verify `drizzle-kit generate` and `drizzle-kit migrate` run cleanly against the Supabase-backed database
- [ ] Use Drizzle's relational queries API for parent-with-children reads
- [ ] Use Drizzle's query builder with `.for('update')` inside `db.transaction(...)` for reorder and move paths
- [ ] Install tRPC server and client packages, zod, and `@trpc/react-query`
- [ ] Mount a single tRPC router as a TanStack Start server route at `/api/trpc/$`
- [ ] Configure the tRPC React Query client on the frontend
- [ ] Require zod `.input(...)` validation on every procedure
- [ ] Add a tRPC `errorFormatter` that surfaces `zodError.flatten()` in the error `data` field
- [ ] Define the initial `TRPCError` code set and document it alongside the router
- [ ] Install pino, `pino-http`, and `pino-pretty` (dev only)
- [ ] Create a single pino instance at server bootstrap
- [ ] Add `pino-http` at the TanStack Start request boundary
- [ ] Add a tRPC middleware that logs `{ path, type, durationMs, ok, requestId }` per procedure call
- [ ] Keep business logic in services and persistence access in repo/query modules
- [ ] If any new `public` tables are introduced, add RLS enablement and explicit policies in the same migration

### Prepare the first shared data path

- [ ] Add a simple shared counter table for the first persisted feature
- [ ] Add the required RLS enablement and explicit policies for that table
- [ ] Decide whether the counter path uses a server route or server function and keep the database access behind the server boundary

### Verify the phase

- [ ] Confirm the app can connect to the Supabase-backed database locally
- [ ] Add an API test that verifies validation and error shaping on the first database-backed path
- [ ] Add a service-level test for the first persistence-backed path
- [ ] Verify RLS policies exist for any new or altered `public` tables
- [ ] Verify Supabase security lint is clean before merge

## Phase 4: Shared Click Counter Vertical Slice

### Build the first real feature slice

- [ ] Add a typed read endpoint or server function for the shared counter
- [ ] Add a typed increment endpoint or server function for the shared counter
- [ ] Add a simple page that displays the current shared count
- [ ] Add a button that increments the shared count through the real backend path
- [ ] Show loading, success, and error states for the counter interactions
- [ ] Keep the counter intentionally unauthenticated and shared across all visitors

### Verify the phase

- [ ] Add a test for the counter response shape
- [ ] Add a service or repo test that verifies increments persist correctly
- [ ] Add a UI test that verifies the page renders the current count
- [ ] Add a UI test that verifies clicking increments the count
- [ ] Confirm the browser shows the same shared count updating through the real backend path

## Phase 5: Vercel Deployment Setup

### Prepare deployment after the counter slice is ready

- [ ] Add Vercel as the canonical deployment target for the app
- [ ] Add the project to Vercel
- [ ] Configure the required Vercel environment variables for the counter slice
- [ ] Confirm the build and runtime settings match the TanStack Start application needs
- [ ] Add or update deploy scripts as needed so they align with Vercel
- [ ] Keep deployment behavior aligned with Vercel instead of Firebase hosting

### Verify the phase

- [ ] Confirm the shared click counter app deploys successfully to Vercel
- [ ] Confirm the deployed app can reach the Supabase-backed counter path
- [ ] Confirm the deployed environment variables are wired correctly

## Phase 6: Firebase Authentication Foundation

### Build the auth baseline

- [ ] Install the Firebase client SDK
- [ ] Install the server-side Firebase auth dependency needed for privileged auth operations
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
