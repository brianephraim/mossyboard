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
- [ ] Centralize Supabase environment reads from `.env`
- [ ] Confirm the migration workflow to use with the existing database setup
- [ ] Reconcile the existing `drizzle/pg` migrations with the Supabase-backed schema workflow
- [ ] Wire the runtime database connection into the app
- [ ] Add any required Supabase database tooling or server-side dependencies for the chosen access path
- [ ] Add request validation at server entry points
- [ ] Add a consistent error response shape
- [ ] Add structured logging at server entry points
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

## Phase 5: Firebase Authentication Foundation

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

### Verify the phase

- [ ] Add tests for auth module behavior with mocked Firebase calls
- [ ] Confirm a user can sign up, sign in, and sign out locally with the existing `.env` values

## Phase 6: Resend-Backed Auth Emails

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

## Phase 7: Shared Client State

### Add Redux only when it becomes necessary

- [ ] Install Redux Toolkit and React Redux only when a real shared client-state need appears
- [ ] Add the Redux store bootstrap
- [ ] Add the first slice for a real cross-feature concern such as filters, grouping mode, active selection, or workflow state
- [ ] Keep remote data in TanStack Query rather than Redux
- [ ] Keep local interaction state in React component state where possible

### Verify the phase

- [ ] Add unit tests for the first slice and selectors
- [ ] Confirm Redux is solving a real shared-state problem rather than duplicating server data

## Phase 8: Tamagui UI Foundation

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

## Phase 9: Kanban Product Buildout

### Build the product features

- [ ] Add the board, column, and card data model
- [ ] Add APIs for card CRUD
- [ ] Add card movement between columns
- [ ] Add card reordering within a column
- [ ] Add column creation
- [ ] Add column reordering
- [ ] Add soft delete for cards
- [ ] Add listing with filters and pagination
- [ ] Add basic concurrency safety for reorder operations
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

## Phase 10: End-to-End Coverage

### Add browser-level coverage

- [ ] Install Playwright with Chromium
- [ ] Add the shared login helper that reads from `AGENT_LOGIN_EMAIL` and `AGENT_LOGIN_PASSWORD`
- [ ] Add a happy-path flow for the shared click counter
- [ ] Expand end-to-end coverage later to sign-in and basic board usage

### Verify the phase

- [ ] Confirm the happy-path Playwright test passes locally

## Phase 11: Documentation Completion

### Finish the project docs

- [ ] Keep the architecture overview aligned with the implemented setup order
- [ ] Document that TanStack Start bootstraps Router and Query together
- [ ] Document that the first database-backed slice is an unauthenticated all-visitor-shared click counter
- [ ] Document that Firebase is auth-only in this project
- [ ] Document that auth emails are delivered through Resend-backed server flows
- [ ] Document that Supabase Postgres is the application database platform
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
- [ ] Phase 5: Firebase Authentication Foundation
- [ ] Phase 6: Resend-Backed Auth Emails
- [ ] Phase 7: Shared Client State
- [ ] Phase 8: Tamagui UI Foundation
- [ ] Phase 9: Kanban Product Buildout
- [ ] Phase 10: End-to-End Coverage
- [ ] Phase 11: Documentation Completion
