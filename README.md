# Kanban

A small Kanban product: boards with columns and cards, drag-and-drop reordering, filtering, grouping, tags, and per-user persistence. Built as a single TypeScript codebase that ships both the React frontend and the API server.

**Live demo:** <https://kanban-seven-gamma.vercel.app/>

For broader product context see [`docs/kanban-app-requirements.md`](docs/kanban-app-requirements.md). For internal architectural rationale see [`docs/app-architecture-overview.md`](docs/app-architecture-overview.md).

## Setup and run

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
6. Optionally seeding sample data. The wizard provisions a default emulator user — sign in with **`dev@example.com`** / **`password`**.

To re-pick the database flavor:

```bash
npm run dev:setup -- --reset
```

### Tests

```bash
npm run test
```

Vitest runs unit, service, and component tests against the local `kanban_test` database. Test migrations are applied automatically by the test setup. Type checking is `npm run typecheck`; linting is `npm run lint`.

The suite explicitly covers each of the spec's required core-logic areas:

- **Create.** [`card/repo.test.ts`](src/server/card/repo.test.ts) — `"creates, updates, lists, and soft-deletes cards with priority-aware reads"`. [`card/router.test.ts`](src/server/card/router.test.ts) — `"validates create/update payloads and priority enum values"`.
- **Move.** [`card/repo.test.ts`](src/server/card/repo.test.ts) — `"moves and reorders cards with priority changes and version conflicts"` (covers the optimistic-lock conflict path). [`board/repo.test.ts`](src/server/board/repo.test.ts) and [`column/repo.test.ts`](src/server/column/repo.test.ts) cover column reorder.
- **Filter.** [`card/repo.test.ts`](src/server/card/repo.test.ts) — `"filters cards by tags (OR semantics across the array) and hydrates tag rows"`, plus the `listCardsByColumn` block: `"filters to a single priority value"`, `"filters to a list of priorities and short-circuits on empty list"`, `"paginates through cards using (position, id) cursor"`, and `"excludes soft-deleted cards"`.
- **Group.** [`BoardCanvas.priority-grouping.test.tsx`](src/features/boards/BoardCanvas.priority-grouping.test.tsx) — group-by-priority mode keeps real columns, adds priority headers, and gates the reorder opt-in correctly.

Other notable coverage: ownership-boundary tests (`"rejects with NOT_FOUND when called by a different owner"`), the `keyBetween` ordering helper ([`key-between.test.ts`](src/lib/ordering/key-between.test.ts)), the position-key exhaustion + rebalance fallback path, inline-edit gesture handling ([`FormInlineTextField.test.tsx`](src/form/FormInlineTextField.test.tsx)), and the auth/sign-in flow ([`SignInForm.test.tsx`](src/features/auth/SignInForm.test.tsx)).

### Deploy

```bash
vercel --prod
```

Migrations run automatically as part of the prod build (`vercel-build` is gated on `VERCEL_ENV === "production"`, so preview deploys never migrate). Manual escape hatch:

```bash
CONFIRM_PROD_MIGRATE=1 npm run db:migrate:prod
```

## Architecture overview

One TypeScript codebase, deployed to Vercel. The frontend and the tRPC server share types end-to-end.

- **Framework**: TanStack Start (SPA mode) bootstraps the app shell, routing, and query client.
- **Routing**: TanStack Router. Route loaders trigger the page-entry tRPC query so the cache is populated before render.
- **Transport**: tRPC over HTTP with `httpBatchLink`. The single tRPC router is mounted at `/api/trpc/$` as a TanStack Start server route.
- **Backend services**: Per-domain folders under `src/server/<board|card|column|tag>/` containing a router (`src/server/trpc/routers/*`), service (business logic + ownership), and repo (Drizzle queries).
- **Database**: Supabase Postgres via the pooler (port 6543). Drizzle ORM is the single client for migrations and queries; `supabase-js` is intentionally not used.
- **Auth**: Firebase (email/password) for identity only. A tRPC middleware verifies the Firebase ID token via `firebase-admin` and sets `ctx.userId`. Hosting is Vercel; Firebase is not used as a hosting platform.
- **Email**: Resend, behind a server-side mail module (verification, password reset).
- **Logging**: pino + `pino-http` at the HTTP boundary. A tRPC middleware logs `{ path, type, durationMs, ok, requestId, userId? }` per procedure call.
- **Styling**: Tamagui primitives (`Stack`, `XStack`, `YStack`, `Text`, `Button`, `Input`) with theme tokens. No raw HTML in feature components.
- **Forms**: `react-hook-form` (RHF) wired through reusable Tamagui-bound fields in `src/form/` (e.g. `FormInlineTextField`, `FormInlineRenameField`). Fields bind by `name` through form context rather than inline `Controller` wiring at every call site.

### Folder layout

```
src/
  routes/               # TanStack Router files (incl. /api/trpc/$ server route)
  features/
    auth/               # sign-in, sign-up, password reset, verification UI
    boards/             # board canvas, drawer, controls, dnd, list view
    brand/              # branding components
  store/                # Redux store + slices
  trpc/                 # client-side tRPC + React Query setup
  lib/
    ordering/           # keyBetween helper (fractional indexing)
  server/
    trpc/               # appRouter, init, context, per-domain routers
    board/              # board service + repo
    card/               # card service + repo
    column/             # column service + repo
    tag/                # tag service + repo
    auth/               # firebase-admin wrapper, email service
    db/                 # Drizzle schema and client singleton
    logging/            # pino logger
  Modal/                # PrettyModalWrap (focus-trapping, Esc-to-close)
  form/                 # react-hook-form + Tamagui form fields
  tamagui/              # design tokens and theme config
drizzle/pg/             # generated SQL migrations
scripts/                # dev-setup, db-migrate, db-seed, vercel-build
```

## State management

Four layers, each with a single responsibility:

1. **The URL (view state)** — _the page URL is itself a primary state container, not a side effect of state held elsewhere_. Every piece of view state a user might want to deep-link, share, or recover with the back button lives in the URL. On the board route (`/boards/$boardId`), the path identifies the board and the search params drive `view` (`board` vs `list`), `groupBy` (`column` vs `priority`), `priority` and `tags` filters, the open `card` detail panel, and the `drawer` state. Routes declare a `validateSearch` schema (TanStack Router) so consumers read typed search params via `Route.useSearch()` instead of parsing strings ad hoc. Refresh, back/forward, copy-paste link — all of it survives because the URL is the source of truth.
2. **TanStack Query (server state)** — owns the lifecycle of every fetched value: caching, background refetches, invalidation. Query keys are derived from tRPC procedure paths via `@trpc/react-query`; no hand-authored key constants.
3. **Redux Toolkit (shared client state)** — owns the small set of cross-feature toggles that genuinely don't belong in the URL (e.g. the `groupedBoardReorderEnabled` opt-in for grouped-mode reordering, and the counter-page checkbox slice). Slices live in `src/store/`.
4. **React component state (local UI)** — open/closed menus, hover, drag interactions, in-progress form values.

**Why this split:** the Kanban product is read-heavy with snappy mutations, and most "client state" people instinctively reach for Redux for is actually view state that should survive a refresh — which means it belongs in the URL, not in memory. Putting filters, grouping, view mode, and the open card in the URL is what makes the app linkable and the back button meaningful. Query handles the hard parts of remote data (deduping, batching, refetch), so duplicating it into Redux would be a tax with no payoff. Redux is reserved for the residue: a couple of toggles that are neither linkable nor server-owned. Local UI state stays in components so we don't pollute global state with ephemera.

**Optimistic updates** for moves and reorders live in thin hand-written wrapper hooks (`features/<feature>/hooks/`) that internally call the generated tRPC hooks. Wrappers are added only where optimism or Redux coordination is actually needed.

## Database and schema

Postgres on Supabase, accessed exclusively from the server via `postgres.js` through Drizzle. The schema in [`src/server/db/schema.ts`](src/server/db/schema.ts) is the single source of truth. Migrations are generated with `drizzle-kit generate` and committed to `drizzle/pg/`.

| Table                                     | Purpose                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `boards`                                  | Top-level container. Carries `owner_id`, `deleted_at`.                                            |
| `columns`                                 | Belongs to a board. Has `position` (string fractional key), `version`.                            |
| `cards`                                   | Belongs to a column. Has `title`, `description`, `priority`, `position`, `version`, `deleted_at`. |
| `tags`                                    | Per-owner tag dictionary, unique on `(owner_id, normalized_name)`.                                |
| `card_tags`                               | Many-to-many join between cards and tags.                                                         |
| `shared_counter` / `shared_counter_event` | Public click counter (first persistence-backed slice; left in place as a smoke target).           |

**Ownership.** `boards.owner_id` is the canonical ownership column; `columns` and `cards` derive ownership transitively via the parent board join. Every read filters `deleted_at IS NULL AND owner_id = ctx.userId`. Every write verifies that every referenced id (board, source column, target column, card) belongs to the caller before acting on it.

**RLS.** Enabled on all `public` tables with default-deny policies for `anon` and `authenticated` PostgREST roles, as defense-in-depth. Application access goes through the server's DB role, so ownership is actually enforced in the services layer rather than relying on RLS.

**Soft delete.** `deleted_at TIMESTAMPTZ` on `boards` and `cards`. Soft-deleting a board cascades through the service layer.

**Ordering and concurrency.** Cards and columns carry a fixed-width string `position` key plus a monotonic `version` integer.

- Moves and reorders compute a new key strictly between the target neighbors using [`keyBetween(prev, next)`](src/lib/ordering/key-between.ts) — O(1), no sibling renumbering on the common path.
- Each move runs in a transaction with `SELECT ... FOR UPDATE` on the moved row, then writes `column_id`, `position`, and bumped `version` together.
- Clients pass the last-known `version`; the server rejects on mismatch with a typed `TRPCError`. The client refetches and retries against the latest state.
- A lazy per-column rebalance kicks in when fractional keys exhaust — it runs in its own transaction and bumps the affected versions.

## API overview

A single tRPC router mounted at `/api/trpc/$`. Every procedure declares a zod `.input(...)` schema; types flow end-to-end through TypeScript inference, no separate DTO layer. The full router is in [`src/server/trpc/router.ts`](src/server/trpc/router.ts).

| Router      | Procedure                                | Kind     | Purpose                                                                  |
| ----------- | ---------------------------------------- | -------- | ------------------------------------------------------------------------ |
| `board`     | `list`                                   | query    | List the caller's boards with column and card counts                     |
| `board`     | `getStructure`                           | query    | Page-entry payload: board + columns + cards (joined) for the board route |
| `board`     | `create`                                 | mutation | Create a board                                                           |
| `board`     | `rename`                                 | mutation | Rename a board                                                           |
| `board`     | `softDelete`                             | mutation | Soft-delete a board (cascades to columns and cards)                      |
| `board`     | `addSampleData`                          | mutation | Seed sample cards into a board (1–2000)                                  |
| `column`    | `create`                                 | mutation | Create a column at a position between neighbors                          |
| `column`    | `rename`                                 | mutation | Rename (`expectedVersion` required)                                      |
| `column`    | `reorder`                                | mutation | Reorder a column (`expectedVersion` required)                            |
| `card`      | `get`                                    | query    | Fetch one card                                                           |
| `card`      | `create`                                 | mutation | Create a card with `prev`/`next` neighbors                               |
| `card`      | `update`                                 | mutation | Update title/description/priority (`expectedVersion` required)           |
| `card`      | `softDelete`                             | mutation | Soft-delete (`expectedVersion` required)                                 |
| `card`      | `move`                                   | mutation | Move between columns (`expectedVersion` required)                        |
| `card`      | `reorder`                                | mutation | Reorder within a column (`expectedVersion` required)                     |
| `card`      | `listByBoard`                            | query    | Filtered, paginated card list across the board (priority + tag filters)  |
| `card`      | `listByColumn`                           | query    | Paginated card list within a column                                      |
| `tag`       | `list`                                   | query    | List the caller's tags                                                   |
| `tag`       | `addToCard`                              | mutation | Attach a tag (creating it if it doesn't exist)                           |
| `tag`       | `detachFromCard`                         | mutation | Detach a tag from a card                                                 |
| `counter`   | `get` / `increment`                      | both     | Public unauthenticated click counter                                     |
| `authEmail` | `sendVerification` / `sendPasswordReset` | mutation | Resend-backed transactional auth emails                                  |

**Errors.** Server errors are thrown as `TRPCError` with a documented code. zod validation failures surface `zodError.flatten()` inside the error `data` field so the client can render field-level errors in one pass.

**Pagination.** `card.listByBoard` uses an `(updatedAt, cardId)` cursor; `card.listByColumn` uses a `(position, cardId)` cursor. Both cap `limit` at 100. The board canvas consumes `card.listByColumn` through `trpc.card.listByColumn.useInfiniteQuery` ([`useColumnCards.ts`](src/features/boards/columnCards/useColumnCards.ts)) and threads `hasNextPage` + `fetchNextPage` into [`VirtualizedCardList`](src/features/boards/BoardCanvas/VirtualizedCardList.tsx) — Virtuoso's `endReached` callback fires as the user scrolls into the trailing buffer (`increaseViewportBy={400}`), which calls `onLoadMore()` and pulls the next cursor page. Tall columns stream in as the user scrolls; the DOM only ever holds the visible window plus that buffer.

## Key UX decisions

- **Drag-and-drop with a button alternative.** Cards reorder via `@hello-pangea/dnd` for pointer users. Every rendered card also exposes four edge-mounted buttons — `aria-label="Move card up"`, `"Move card down"` (reorder within the column) and `"Move card left"`, `"Move card right"` (move to the adjacent column) — that reveal on hover or focus and act on a single press. Columns get the same treatment with `aria-label="Move column left"` / `"Move column right"`. Each button is a real `<button>` (via Tamagui `Button`), so it's in the tab order, announces its `aria-label` to screen readers, and activates on Enter/Space — reordering does not depend on drag.
- **The killer feature: drag cards between two boards via the side drawer.** Open a board in the main pane, then in the sidebar list of boards click "Open in drawer" on a _different_ board — that second board renders side-by-side in a resizable drawer. Both boards are live: every column on either side is a valid drop target for any card on either side, so a card can be moved across boards with the same drag gesture used to move it between columns. The shared dnd context is wired in [`useDualBoardDnd`](src/features/boards/useDualBoardDnd.ts), which scopes draggable IDs by `main` / `drawer` so the destination pane (and therefore the destination board) is unambiguous on drop. The drawer's open state is encoded in the URL's `drawer` search param, so the two-board layout is link-shareable and survives refresh.
- **Optimistic moves and reorders.** The card snaps to its new position immediately; on a `version` conflict the client refetches and retries against the latest state.
- **Virtualized columns** (`react-virtuoso`) keep the DOM small for boards with hundreds of cards. Off-screen cards aren't reachable by Tab or browser find; the keyboard move-buttons on the visible cards are how a screen-reader user navigates the column.
- **Inline edit, not modals, for titles and descriptions.** Card title, card description, board title, and column titles all edit in place via Tamagui `Input`s. Modals are reserved for full card detail (tags, priority, delete confirmation). The tricky part is that those inputs sit inside the card's drag handle, so a naive click-to-focus would race the drag start. The custom solution lives in two pieces:
  - **Inputs (`focusOnMouseUp` in [`FormInlineTextField`](src/form/FormInlineTextField.tsx)).** `@hello-pangea/dnd` registers a window-capture `mousedown` listener that calls `preventDefault()` to claim the gesture, which would normally also block native focus on the input. Instead of focusing on `mousedown`, the field starts a window-level `mousemove` + `mouseup` watcher. If the pointer is released within a 5px drag threshold, the input is focused manually on `mouseup`; if the threshold is exceeded the gesture is treated as a drag and focus is suppressed entirely. The same field skips this dance when it's already focused (so cursor positioning and drag-select keep working natively).
  - **In-card buttons ([`useDragSafePress`](src/features/boards/BoardCanvas/useDragSafePress.ts)).** The priority button and tag-chip controls bind their click to `mousedown` + tracked `mouseup` rather than the native `onClick`, and only fire `onActivate()` if the pointer was released without crossing the same 5px threshold. Cross the threshold and the press is suppressed so the outer drag handle takes over.

  Net effect: clicking an inline title focuses it, dragging the same pixel starts a card drag, and pressing a card-internal button doesn't accidentally activate the button when the user actually meant to drag.

- **`PrettyModalWrap`** (`src/Modal/PrettyModalWrap.tsx`) is the only modal primitive — it traps focus, returns focus to the invoker on close, and closes on Esc. No hand-rolled overlays.
- **Filters, grouping, view mode, and the open card all live in the URL.** Filter by priority and tag; group by priority; switch between board and list view; open a card detail panel — every one of those changes the URL. Refreshing the page restores exactly what you were looking at, the browser back button works the way users expect, and any view is shareable as a link.
- **Mobile responsiveness via a hamburger menu.** On wide screens, the side drawer (a second board opened side-by-side) and the inline board controls live directly in the workspace chrome. On narrow screens (`media.maxMd`), the drawer affordance drops out entirely and the board navigation list, board controls, account panel, and verification callout collapse into a hamburger menu rendered by [`BoardMobileMenuContent`](src/features/boards/BoardMobileMenuContent.tsx). Touch-target sizing on edge-move buttons is enforced.
- **Live region announcements.** Async state changes (card moved, save failed) announce through a dedicated `aria-live="polite"` region rather than stealing focus.

## Trade-offs and future improvements

**Trade-offs we accepted:**

- **Firebase for auth, not a homegrown identity stack.** Faster to build correctly, with email/password + verification + password reset working out of the box. The cost is the local Firebase Auth Emulator dependency (Java runtime, extra setup wizard step) and a Firebase-shaped session model on the client.
- **tRPC instead of REST/OpenAPI.** Picked primarily for `httpBatchLink` — the board canvas, drawer, and card detail panel all fire several queries on the same render, and batching coalesces them into a single HTTP request automatically with no hand-written client-side batcher. End-to-end type safety comes along for free. The cost is that non-TypeScript clients can't consume the API without `trpc-openapi`, which is acceptable while the only client is the bundled web app.
- **Server-side filtering and grouping, not client-side.** Filter and group settings are encoded in the URL and pushed into `card.listByColumn` / `card.listByBoard` as part of the query input, so the server returns the already-filtered, already-correctly-ordered set. The reason we can't do this purely on the client is pagination: a board with hundreds of cards never holds its full card set in memory at once (Virtuoso streams pages in via the column-level cursor), so a client-side filter would only filter the slice that happens to be loaded — wrong answer. Same story for grouping: if the user groups by priority, every card with that priority must be reachable, including ones that haven't been paged in yet. The trade-off is that changing a filter or grouping mode triggers a network refetch instead of being an instant in-memory transform; we accept that latency in exchange for correct, complete results on arbitrarily large boards.
- **SPA mode over SSR.** TanStack Start is configured as a single-page app rather than server-rendered. The motivation was development velocity — SSR introduces a class of hydration mismatches (timezone drift, theme/auth state that's only known on the client, third-party widgets that don't render server-side) that eat real time to chase down. The trade-off is that the first paint waits on the JS bundle and the initial query, so the app isn't instant on a cold load. SEO isn't a concern because the entire product lives behind auth — there's nothing for a crawler to index — so the usual reason to pay the SSR tax doesn't apply here.

**Future improvements:**

- **More robust testing to surface bugs.** Coverage today leans on Vitest unit/service tests and a handful of component tests. Adding broader Playwright E2E coverage (drag flows, optimistic-update conflict paths, mobile menu, auth flows), property-based tests around the ordering/`keyBetween` helper, and a contract-style test that exercises every tRPC procedure against a real Postgres would catch regressions that the current suite can miss — especially around concurrent reorders and gesture-collision edge cases.
- **CI/CD workflow.** There's no `.github/workflows/` setup today — pushes to `main` auto-deploy through Vercel, but `npm run test`, `npm run typecheck`, `npm run lint`, and `npm run format:check` only run locally. A GitHub Actions workflow that runs the full check suite on every PR (and blocks merge on failure), plus a separate job that boots a Postgres service container for the repo/router integration tests, would catch regressions before they hit `main`. Pairing that with branch protection and a preview-deploy smoke test against the Vercel preview URL would close the loop end-to-end.
- **Intensive code-quality passes and housekeeping.** Several large feature components (`BoardWorkspaceScreen`, `BoardPane`, `BoardCanvas`) have grown past the soft-cap targets in `AGENTS.md` and would benefit from being broken into smaller cohesive modules. A focused sweep to extract reusable helpers, deduplicate near-identical patterns across feature folders (e.g. inline-rename wiring, mutation-then-invalidate plumbing), prune dead branches left behind during pivots, and tighten lingering `as unknown as` escape hatches into precise types would pay off both in readability and in lowering the risk surface for future changes.
- **Realtime collaboration.** Multi-user boards currently rely on `version` conflicts surfacing on the next mutation. Supabase Realtime or a WebSocket channel could push cache invalidations to other connected clients.
- **Tag autocomplete and bulk assignment.** Tag assignment is one-at-a-time today; an autocomplete picker driven by `tag.list` would scale better past a dozen tags.
- **Search.** No full-text search yet. A `tsvector` column on `cards.title || cards.description` plus a trigram index would unlock card search at acceptable cost.
- **Card history / activity feed.** `version` bumps are not journaled. A `card_events` append-only table keyed by `(card_id, version)` would back an activity panel and audit log.
- **OpenAPI export.** If a non-TypeScript client appears, `trpc-openapi` can produce a spec from the existing router without rewriting procedures.
- **Boards-shared-with-me.** Ownership is single-owner today (`boards.owner_id`). Multi-user boards would need a `board_members` table and an `is_member_of` predicate added to every read filter.
