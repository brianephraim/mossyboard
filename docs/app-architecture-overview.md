# App Architecture Overview

## Frontend App

### Framework

- TanStack Start (SPA mode)
- TanStack Start provides the application shell and is the initial framework bootstrap point
- TanStack Router and TanStack Query are configured as part of the TanStack Start app setup rather than as separate adoption phases

### Routing

- TanStack Router
- Route-level loaders for page entry orchestration

### Server State

- TanStack Query
- Request caching
- Invalidation and refetch behavior
- Per-resource query keys

### App State

- Redux Toolkit
- Shared client state across features

### Local UI State

- React component state for short-lived concerns
  - open/closed UI
  - hover state
  - temporary form values
  - drag interactions

### UI Layer

- Presentational components
- Feature-level components
- Shared design system components

### Styling

- Tamagui
- Theme tokens and design system configuration
- Style-as-props approach for UI composition

---

## State Management Model

### Server State (TanStack Query)

- Owns fetched data lifecycle
- Handles caching, background refetching, and errors

### App State (Redux Toolkit)

- Owns shared client-side state
- Coordinates cross-feature behavior
- Persists session-level interaction state

### Local State (React)

- Owns temporary, component-scoped concerns

### Guiding Rule

- Avoid duplicating the same data across Query and Redux

---

## Redux Toolkit Layer

### Store

- Centralized Redux store
- Configured at app bootstrap

### Slices

- Organized by domain or capability
- Encapsulate related state and reducers

### Selectors

- Encapsulate state reads
- Provide stable access patterns

### Reducers / Actions

- Handle synchronous state transitions

### Middleware

- Optional for logging, analytics, workflows, side effects

### Typical Use Cases

- UI preferences
- active selections
- multi-step workflows
- client-side filters and sorting
- cross-component coordination

---

## Data Access Layer

### Router Modules as Domain API

- tRPC router modules under `server/trpc/routers/` are the domain API
- Examples: `card.create`, `card.move`, `card.reorder`, `board.get`
- Feature UI does not go through a separate domain wrapper layer

### Generated Query and Mutation Hooks

- `@trpc/react-query` generates typed query and mutation hooks directly from the router
- Feature code calls generated hooks directly (for example `trpc.card.list.useQuery(...)`)
- TanStack Query owns caching, stale time, retries, invalidation, and background refetching
- Query keys are derived from procedure paths; no hand-authored key constants

### Hand-Written Wrapper Hooks

- Hand-written wrappers exist only for narrowly defined cases:
  - optimistic update coordination for moves and reorders
  - Redux side effects that must fire on mutation success
- Wrappers live in `features/<feature>/hooks/` and internally call the generated tRPC hooks

---

## Transport Layer

### Request Transport

- Transport is tRPC over HTTP, using `httpBatchLink` for automatic request batching
- The client never issues ad hoc `fetch` calls to the backend

### Page-Entry Composition

- Route loaders call a single procedure that returns the joined payload for the page
- Example: `board.getWithColumnsAndCards` for the board route
- Avoids N parallel small calls at route entry while keeping individual procedures available for on-demand reads

### Mutation Transport

- One explicit procedure per operation (`card.create`, `card.move`, `card.reorder`, `card.softDelete`)
- No generic mutation endpoint
- Bulk operations are modeled as their own named procedures when genuinely needed

### Deduping and Batching

- TanStack Query dedupes identical in-flight queries on the client
- `httpBatchLink` coalesces distinct concurrent procedure calls into a single HTTP request
- No hand-written client-side batchers

---

## API Contract, Validation, and Logging

### Contract Layer

- tRPC is the API contract between the frontend and backend
- A single tRPC router is mounted as a TanStack Start server route at `/api/trpc/$`
- The tRPC router is the domain API — feature code does not call transport primitives directly
- Procedure types are shared end-to-end through TypeScript inference rather than a generated schema
- External OpenAPI generation is deferred; if ever needed, it can be produced from the same router via `trpc-openapi`

### Input Validation

- zod schemas validate every procedure input via `.input(...)`
- Input schemas are co-located with their procedures
- Inferred zod types are the single source of truth for request shapes
- No separate DTO or hand-written type layer sits alongside the schema

### Error Shape

- Server errors are thrown as `TRPCError` with a documented code set
- A server-side `errorFormatter` produces the consistent response envelope
- zod validation failures surface `zodError.flatten()` inside the error `data` field so the client receives field-level errors in one pass
- The client relies on tRPC's envelope rather than a hand-rolled error shape

### Structured Logging

- pino is the structured logger
- A single pino instance is created at server bootstrap and imported where needed
- `pino-http` logs HTTP-level request and response events at the TanStack Start boundary
- A tRPC middleware logs each procedure call with `{ path, type, durationMs, ok, requestId, userId? }`
- `pino-pretty` is used in development only; production logs remain JSON

### Client Integration

- `@trpc/react-query` exposes typed query and mutation hooks directly from the router
- TanStack Query continues to own caching, invalidation, and background refetching
- Query and mutation hook wrappers remain thin; most feature code uses generated hooks directly
- Optimistic updates and Redux coordination still live at the mutation-hook layer when needed

---

## Backend Layer

Entry points are defined in the API Contract section. This section covers what sits behind them.

### Application Services

- Contain business logic
- Coordinate reads and writes

### Persistence Layer

- Supabase Postgres is the system of record for application data
- Drizzle is the single database client for both migrations and runtime queries
- `postgres.js` (via `drizzle-orm/postgres-js`) is the underlying driver
- `supabase-js` is intentionally not installed; the project has no use for PostgREST, Storage, or Realtime
- The server connects to Supabase via the **pooler** URL (transaction mode, port 6543) as the project's DB role
- The Drizzle schema in `src/server/db/schema.ts` is the single source of truth for tables and indexes
- The `postgres.js` client and Drizzle instance live as a module-level singleton in `src/server/db/client.ts`
- Repositories import the shared `db` instance and do not open their own connections
- Reads that compose parent + children use Drizzle's relational queries API (`db.query.boards.findFirst({ with: { columns: { with: { cards: true } } } })`)
- Writes and locking reads use Drizzle's query builder, including `.for('update')` for row-level locks
- Transactions use `db.transaction(async (tx) => ...)`; the reorder path selects `.for('update')` and updates inside the same transaction
- Schema changes are managed through committed migrations generated with `drizzle-kit generate` and applied with `drizzle-kit migrate`
- Any new or altered tables in schema `public` require RLS enablement and explicit policies in the same migration
- The first persistence-backed proof of wiring is an unauthenticated all-visitor-shared click counter

---

## Ordering and Concurrency Safety

### Ordering Model

- Cards carry a fixed-width numeric string `position` key
- A move computes a key strictly between the target neighbors via a `keyBetween(prev, next)` helper
- New keys are generated in O(1) without renumbering sibling rows
- Listing a column is `ORDER BY position ASC`
- The same model applies to column ordering within a board

### Conflict Detection

- Cards and columns carry a monotonically increasing `version` integer
- Reorder and move mutations require the client to pass the last-known `version`
- The server rejects the write if `version` does not match current state
- On rejection the client refetches and retries against the latest order

### Transactional Boundary

- Each move or reorder runs inside a single database transaction
- The transaction performs `SELECT ... FOR UPDATE` on the affected card row
- The transaction writes the new `column_id`, `position`, and bumped `version` together
- No sibling rows are updated on the common path

### Rebalancing

- Key length grows under adversarial reordering patterns
- A lazy per-column rebalance rewrites sibling `position` values when keys exceed a threshold
- Rebalance runs inside its own transaction and bumps the affected rows' `version` values
- Rebalance is not required for correctness, only for long-term key length

### Why This Approach

- Fractional indexing is the idiomatic approach used by Jira, Trello, and Linear
- Version-based optimistic locking earns the "basic concurrency safety" requirement without pessimistic column-wide locks
- Transactional single-row writes keep the hot path O(1) for the common move operation

---

## Authentication and Email Delivery

### Authentication Provider

- Firebase is used for authentication only
- Email/password is the initial sign-in method
- Authentication concerns stay separate from hosting and application persistence

### Auth Client Boundary

- The frontend owns session observation and auth UI flows
- Shared authenticated session state may be exposed to the rest of the app through focused auth modules
- Feature code should depend on auth state abstractions rather than Firebase SDK calls spread across the UI

### Email Delivery

- Resend is the transactional email provider for auth-related emails
- Email delivery should be triggered through explicit server-side flows rather than directly from UI components
- Provider-specific email logic should stay isolated behind a mail delivery module
- When the application owns Firebase auth email delivery, a server-side auth module generates the required action links and delegates delivery to Resend

---

## Data Ownership

### Ownership Column

- `boards` carries an `owner_id TEXT NOT NULL` column holding the Firebase UID
- `columns` and `cards` do not carry their own `owner_id`; ownership is transitive through the parent board
- Denormalizing `owner_id` onto `cards` is a future optimization, not a day-one schema choice

### Identity Propagation

- A tRPC `protectedProcedure` middleware verifies the incoming Firebase ID token using `firebase-admin`
- The verified Firebase UID is placed on the tRPC `ctx` as `ctx.userId`
- Services accept `ownerId` as an explicit argument rather than reading it from a global
- Repositories accept `ownerId` and include it in every query predicate

### Enforcement Boundary

- Ownership is enforced in the application services layer, not in the database
- Every read filters by `owner_id` through the board join
- Every write verifies that every referenced row (board, source column, target column) belongs to the caller
- Cross-owner identifier smuggling is prevented by validating every incoming ID against the caller's ownership before acting on it

### Supabase Access Pattern

- The server is the only client of Supabase and connects via `postgres.js` (through Drizzle) as the project's DB role
- PostgREST and `supabase-js` are not used
- The frontend never talks to Supabase directly; all reads and writes go through tRPC
- Row Level Security remains enabled on all `public` tables as defense-in-depth
- Default-deny policies apply to the `anon` and `authenticated` PostgREST roles
- The server's DB role bypasses RLS because Postgres superuser-equivalent roles are not subject to policies; ownership is therefore enforced in the services layer, not by RLS
- The shared click counter remains publicly readable and incrementable through its own explicit RLS policies for any future PostgREST-based client path

### Soft Delete Composition

- Cards and boards carry `deleted_at TIMESTAMPTZ` for soft delete
- Soft-deleting a board soft-deletes its columns and cards through the service layer
- Every read filters `deleted_at IS NULL AND owner_id = ctx.userId`

### Test Coverage Implication

- Because RLS is not the primary gate, service-level tests must cover the ownership boundary directly
- Tests assert that user A cannot read, move, reorder, or delete user B's boards, columns, or cards

---

## Hosting and Deployment

### Deployment Platform

- Vercel is the canonical hosting and deployment platform for production
- Deployment setup happens after the shared click counter slice is working end to end
- Firebase is not used as the hosting platform in this project

### Deployment Configuration

- Runtime environment variables are managed through Vercel environment configuration for deployed environments
- Deployment scripts, workflows, and README instructions should stay aligned with Vercel as the source of truth

---

## Bootstrap Sequence

### Initial Setup Order

- Start with `package.json` and base scripts so install, dev, build, and test workflows exist from the beginning
- Set up TanStack Start as the first framework milestone, including routing and query bootstrapping in the app shell
- Set up Supabase-backed persistence before authentication work begins
- Add the first persistence-backed vertical slice as an unauthenticated all-visitor-shared click counter
- Set up Vercel deployment after the counter slice is working end to end
- Layer in Firebase authentication after the database-backed request path is working
- Add Resend-backed auth email flows after the Firebase auth baseline is working
- Add shared client state only when a concrete cross-feature need appears
- Introduce Tamagui after the app shell, Supabase baseline, and auth baseline are working, and before broader product UI buildout
- Add broader product flows after the supporting platform layers are proven

### First Vertical Slice

- A single route should render a simple shared click counter page backed by one database-backed endpoint or server action
- The counter is intentionally unauthenticated so the first proof focuses on framework wiring, request handling, and Supabase-backed persistence
- The first slice should verify that multiple visitors see the same shared value update through the real backend path

---

## Configuration

### Environment Variables

- Local development reads from `.env`
- Deployment environments provide the same required variables through platform configuration
- Firebase, Resend, and Supabase configuration should be centralized in dedicated setup modules rather than read ad hoc throughout the codebase

---

## Caching Strategy

### Query Keys

- Keys are derived from tRPC procedure paths
  - `trpc.card.list.queryKey({ boardId })`
  - `trpc.card.byId.queryKey({ id })`
- No hand-authored key constants

### Page-Entry Caching

- Route loaders populate the cache via the page-entry composition procedure
- Subsequent reads within the route reuse the hydrated cache entries

### Invalidation

- Invalidation goes through `utils` helpers (`utils.card.list.invalidate({ boardId })`)
- Invalidation is scoped to the procedure and args that actually changed
- Mutations never invalidate unrelated procedure keys

### Deduping and Batching

- TanStack Query dedupes identical in-flight queries on the client
- `httpBatchLink` coalesces distinct concurrent procedure calls into a single HTTP request

### Redux Boundary

- Redux is not used as a backend cache
- Query remains the source of truth for remote data

---

## Application Flow

### Initial Route Entry

- Loader or initial query fetches required data
- Query cache is populated

### Ongoing Reads

- Components use query hooks
- Batchers may group repeated lookups

### Client State Changes

- Redux actions update shared client state

### Writes

- Mutations call domain API
- Backend processes logic
- Client updates Query cache and optionally Redux state

---

## Separation of Concerns

- UI Layer → rendering and interaction
- Styling → Tamagui-based design system and theming
- Local State → temporary component concerns
- Redux Toolkit → shared client state
- TanStack Query → server data lifecycle
- Transport → request shaping and batching
- Business Logic → application rules
- Persistence → data storage and retrieval

---

## Recommended Folder Structure

```
src/
  routes/                   # TanStack Router route files and loaders
  features/
    <feature>/
      components/
      hooks/                # hand-written wrapper hooks (optimistic, Redux coord)
      state/                # Redux slices and selectors (only when needed)
  app/
    store/                  # Redux store setup
    trpc.ts                 # client-side tRPC + React Query setup
  lib/
    query/                  # query client config
    ordering/               # keyBetween helper, rebalance utilities
  server/
    trpc/
      appRouter.ts          # root router
      routers/              # per-domain sub-routers (card, column, board, counter)
      context.ts            # ctx factory, auth middleware, logger binding
    services/               # business logic, takes ownerId explicitly
    repos/                  # Drizzle-based data access
    logger.ts               # pino instance
  ui/                       # shared Tamagui components
```

---

## Testing Strategy

### Unit and Service Tests

- Vitest is the primary test runner for unit and service-level tests
- `node:assert/strict` provides assertions for core logic and domain behavior

### Component and Hook Tests

- `@testing-library/react` is used for component and hook tests
- jsdom provides the browser-like environment for React test execution

### End-to-End Tests

- Playwright covers critical browser flows in Chromium

### Test Design Principles

- Keep business logic in testable services, reducers, selectors, and domain functions
- Keep transport and persistence boundaries testable through focused integration paths
- Cover critical user flows with end-to-end tests rather than duplicating every interaction at every layer

---

## Guiding Principles

- Use TanStack Query for remote data
- Use Redux Toolkit for shared client state
- Use React state for local concerns
- Use Tamagui for consistent styling and theming
- Prefer aggregate fetches for initial loads
- Batch only when necessary
- Keep batching out of UI components
- Keep Redux and Query responsibilities separate
- Avoid duplicating remote data across layers
