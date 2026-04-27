# MOSSYBOARD - a Kanban app

A small Kanban product: boards with columns and cards, drag-and-drop reordering, filtering, grouping, tags, and per-user persistence. One TypeScript codebase ships both the React frontend and the API server.

**Live demo:** <https://kanban-seven-gamma.vercel.app/>

For broader product context see [`docs/kanban-app-requirements.md`](docs/kanban-app-requirements.md). For internal architectural rationale see [`docs/app-architecture-overview.md`](docs/app-architecture-overview.md).

## Setup and run

Prerequisites:

- Node 20+ and npm
- Supabase CLI, Docker Desktop, or host-installed Postgres 14+
- Java runtime (for the Firebase Auth Emulator)

`firebase-tools` is a devDependency, so `npm install` brings it in — no global Firebase CLI needed.

```bash
npm install
npm run dev
```

The first `npm run dev` runs an interactive wizard:

1. Pick a local Postgres flavor (auto-detected when possible).
2. Start the database service.
3. Create the `kanban_dev` and `kanban_test` databases plus required roles.
4. Start the Firebase Auth Emulator and create a default test user.
5. Run migrations.
6. Optionally seed sample data. Default user: **`dev@example.com`** / **`password`**.

To re-pick the database flavor: `npm run dev:setup -- --reset`.

### Tests

```bash
npm run test
```

Vitest runs unit, service, and component tests against `kanban_test` (migrations applied automatically). Type-check with `npm run typecheck`; lint with `npm run lint`.

The suite covers each spec-required core-logic area:

- **Create.** [`card/repo.test.ts`](src/server/card/repo.test.ts) — `"creates, updates, lists, and soft-deletes cards with priority-aware reads"`. [`card/router.test.ts`](src/server/card/router.test.ts) — `"validates create/update payloads and priority enum values"`.
- **Move.** [`card/repo.test.ts`](src/server/card/repo.test.ts) — `"moves and reorders cards with priority changes and version conflicts"` (optimistic-lock conflict path). [`board/repo.test.ts`](src/server/board/repo.test.ts) and [`column/repo.test.ts`](src/server/column/repo.test.ts) cover column reorder.
- **Filter.** [`card/repo.test.ts`](src/server/card/repo.test.ts) — `"filters cards by tags (OR semantics across the array) and hydrates tag rows"`, plus `listCardsByColumn` cases for single/multiple priorities, `(position, id)` cursor pagination, and soft-delete exclusion.
- **Group.** [`BoardCanvas.priority-grouping.test.tsx`](src/features/boards/BoardCanvas.priority-grouping.test.tsx) — group-by-priority keeps real columns, adds priority headers, and gates the reorder opt-in.

Other notable coverage: ownership boundary (`"rejects with NOT_FOUND when called by a different owner"`), the [`keyBetween`](src/lib/ordering/key-between.test.ts) ordering helper, position-key exhaustion + rebalance, inline-edit gestures ([`FormInlineTextField.test.tsx`](src/form/FormInlineTextField.test.tsx)), and sign-in ([`SignInForm.test.tsx`](src/features/auth/SignInForm.test.tsx)).

### Deploy

```bash
vercel --prod
```

Migrations run as part of the prod build (`vercel-build` is gated on `VERCEL_ENV === "production"`, so previews never migrate). Manual escape hatch: `CONFIRM_PROD_MIGRATE=1 npm run db:migrate:prod`.

## Architecture overview

One TypeScript codebase deployed to Vercel. Frontend and tRPC server share types end-to-end.

- **Framework**: TanStack Start (SPA mode) — app shell, routing, and query client.
- **Routing**: TanStack Router. Route loaders fire the page-entry tRPC query so the cache is hot before render.
- **Transport**: tRPC over HTTP with `httpBatchLink`, mounted at `/api/trpc/$` as a TanStack Start server route.
- **Backend services**: Per-domain folders under `src/server/<board|card|column|tag>/` — router (`src/server/trpc/routers/*`), service (business logic + ownership), repo (Drizzle queries).
- **Database**: Supabase Postgres via the pooler (port 6543). Drizzle ORM is the only client; `supabase-js` is intentionally not used.
- **Auth**: Firebase (email/password) for identity only. A tRPC middleware verifies the ID token via `firebase-admin` and sets `ctx.userId`. Hosting is Vercel; Firebase is not used as a hosting platform.
- **Email**: Resend, behind a server-side mail module (verification, password reset).
- **Logging**: pino + `pino-http`. A tRPC middleware logs `{ path, type, durationMs, ok, requestId, userId? }` per call.
- **Styling**: Tamagui primitives (`Stack`, `XStack`, `YStack`, `Text`, `Button`, `Input`) with theme tokens. No raw HTML in feature components.
- **Forms**: `react-hook-form` wired through reusable Tamagui-bound fields in `src/form/` (e.g. `FormInlineTextField`, `FormInlineRenameField`). Fields bind by `name` through form context — no inline `Controller` at every call site.

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
    board/ card/ column/ tag/    # service + repo per domain
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

Four layers, one responsibility each:

1. **The URL (view state)** — _the URL is itself a primary state container, not a side effect of state held elsewhere_. On `/boards/$boardId`, search params drive `view` (`board`/`list`), `groupBy` (`column`/`priority`), `priority` and `tags` filters, the open `card` detail panel, and `drawer` state. Routes use TanStack Router's `validateSearch` so consumers read typed params via `Route.useSearch()`. Refresh, back/forward, and link-sharing all just work.
2. **TanStack Query (server state)** — caching, background refetch, invalidation. Query keys come from tRPC procedure paths via `@trpc/react-query`; no hand-authored constants.
3. **Redux Toolkit (shared client state)** — the small set of toggles that don't belong in the URL (`groupedBoardReorderEnabled`, counter-page checkbox). Slices in `src/store/`.
4. **React component state** — open/closed menus, hover, drag, in-progress form values.

**Why this split.** Most "client state" people instinctively reach for Redux for is actually view state that should survive a refresh — which means the URL, not memory. Putting filters, grouping, view mode, and the open card in the URL is what makes the app linkable and the back button meaningful. Query owns remote data; Redux is reserved for the residue.

**Optimistic updates** for moves and reorders live in thin wrapper hooks (`features/<feature>/hooks/`) that call the generated tRPC hooks. Wrappers exist only where optimism or Redux coordination is needed.

## Database and schema

Postgres on Supabase, accessed only from the server via `postgres.js` through Drizzle. The schema in [`src/server/db/schema.ts`](src/server/db/schema.ts) is the source of truth; migrations are generated with `drizzle-kit generate` and committed to `drizzle/pg/`.

| Table                                     | Purpose                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `boards`                                  | Top-level container. Carries `owner_id`, `deleted_at`.                                        |
| `columns`                                 | Belongs to a board. `position` (string fractional key), `version`.                            |
| `cards`                                   | Belongs to a column. `title`, `description`, `priority`, `position`, `version`, `deleted_at`. |
| `tags`                                    | Per-owner tag dictionary, unique on `(owner_id, normalized_name)`.                            |
| `card_tags`                               | Many-to-many join between cards and tags.                                                     |
| `shared_counter` / `shared_counter_event` | Public click counter (first persistence-backed slice; left in place as a smoke target).       |

**Ownership.** `boards.owner_id` is canonical; columns and cards inherit ownership through the parent board. Every read filters `deleted_at IS NULL AND owner_id = ctx.userId`. Every write verifies that every referenced id (board, source/target column, card) belongs to the caller before acting.

**RLS.** Enabled on all `public` tables with default-deny policies for `anon` / `authenticated` PostgREST roles, as defense-in-depth. The server connects on a role that bypasses RLS, so ownership is enforced in the services layer.

**Soft delete.** `deleted_at TIMESTAMPTZ` on `boards` and `cards`. Soft-deleting a board cascades through the service layer.

**Ordering and concurrency.** Cards and columns carry a fixed-width string `position` plus a monotonic `version` integer.

- Moves compute a new key strictly between target neighbors via [`keyBetween(prev, next)`](src/lib/ordering/key-between.ts) — O(1), no sibling renumbering on the common path.
- Each move runs in a transaction with `SELECT ... FOR UPDATE` on the moved row, then writes `column_id`, `position`, and bumped `version` together.
- Clients pass last-known `version`; mismatches return a typed `TRPCError` and the client refetches and retries.
- A lazy per-column rebalance kicks in when fractional keys exhaust.

## API overview

A single tRPC router mounted at `/api/trpc/$`. Every procedure declares a zod `.input(...)`; types flow end-to-end through TS inference, no DTO layer. Source: [`src/server/trpc/router.ts`](src/server/trpc/router.ts).

| Router      | Procedure                                    | Kind     | Purpose                                                                  |
| ----------- | -------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| `board`     | `list`                                       | query    | List the caller's boards with column and card counts                     |
| `board`     | `getStructure`                               | query    | Page-entry payload: board + columns + cards (joined) for the board route |
| `board`     | `create` / `rename` / `softDelete`           | mutation | Board lifecycle (soft-delete cascades to columns and cards)              |
| `board`     | `addSampleData`                              | mutation | Seed sample cards into a board (1–2000)                                  |
| `column`    | `create`                                     | mutation | Create a column at a position between neighbors                          |
| `column`    | `rename` / `reorder`                         | mutation | `expectedVersion` required                                               |
| `card`      | `get`                                        | query    | Fetch one card                                                           |
| `card`      | `create`                                     | mutation | Create a card with `prev`/`next` neighbors                               |
| `card`      | `update` / `softDelete` / `move` / `reorder` | mutation | All require `expectedVersion`                                            |
| `card`      | `listByBoard`                                | query    | Filtered, paginated card list across the board (priority + tag filters)  |
| `card`      | `listByColumn`                               | query    | Paginated card list within a column                                      |
| `tag`       | `list` / `addToCard` / `detachFromCard`      | both     | Per-owner tag dictionary + card attachments                              |
| `counter`   | `get` / `increment`                          | both     | Public unauthenticated click counter                                     |
| `authEmail` | `sendVerification` / `sendPasswordReset`     | mutation | Resend-backed transactional auth emails                                  |

**Errors.** Server errors are thrown as `TRPCError` with documented codes. zod validation failures surface `zodError.flatten()` in the error `data` field for one-pass field-level rendering on the client.

**Pagination.** `card.listByBoard` uses an `(updatedAt, cardId)` cursor; `card.listByColumn` uses `(position, cardId)`. Both cap `limit` at 100. The board canvas consumes `card.listByColumn` via `useInfiniteQuery` ([`useColumnCards.ts`](src/features/boards/columnCards/useColumnCards.ts)) and threads `hasNextPage` + `fetchNextPage` into [`VirtualizedCardList`](src/features/boards/BoardCanvas/VirtualizedCardList.tsx). Virtuoso's `endReached` (with `increaseViewportBy={400}`) calls `onLoadMore()` to pull the next page; the DOM holds only the visible window plus that buffer.

## Key UX decisions

- **Drag-and-drop with a button alternative.** Cards reorder via `@hello-pangea/dnd` for pointer users. Every rendered card also exposes four edge-mounted buttons — `aria-label="Move card up/down"` (within column) and `"Move card left/right"` (to adjacent column) — that reveal on hover/focus and act on a single press. Columns get `aria-label="Move column left/right"`. Each is a real `<button>` (Tamagui `Button`), so it's tab-reachable, screen-reader-announced, and Enter/Space-activatable — reordering doesn't depend on drag.
- **Killer feature: drag cards between two boards via the side drawer.** Open a board in the main pane, then click "Open in drawer" on a _different_ board in the sidebar — that second board renders side-by-side in a resizable drawer. Both boards are live: any column on either side is a valid drop target for any card on either side. The shared dnd context in [`useDualBoardDnd`](src/features/boards/useDualBoardDnd.ts) scopes draggable IDs by `main` / `drawer` so the destination is unambiguous on drop. Drawer state lives in the URL's `drawer` param, so the two-board layout is link-shareable.
- **Optimistic moves and reorders.** Cards snap to the new position immediately; on a `version` conflict the client refetches and retries.
- **Virtualized columns** (`react-virtuoso`) keep the DOM small for boards with hundreds of cards. Off-screen cards aren't reachable by Tab or browser find — the keyboard move-buttons on visible cards are how a screen-reader user navigates the column.
- **Inline edit, not modals, for titles and descriptions.** Card title, card description, board title, and column titles edit in place via Tamagui `Input`s; modals are reserved for full card detail. Because those inputs sit inside the card's drag handle, naive click-to-focus would race the drag start. Two pieces solve it:
  - **Inputs ([`FormInlineTextField`](src/form/FormInlineTextField.tsx) `focusOnMouseUp`).** `@hello-pangea/dnd`'s window-capture `mousedown` calls `preventDefault()`, blocking native focus. Instead, the field watches `mousemove` + `mouseup` and focuses manually on `mouseup` only if the pointer stayed within a 5px drag threshold. Already-focused inputs skip the dance so cursor positioning still works natively.
  - **In-card buttons ([`useDragSafePress`](src/features/boards/BoardCanvas/useDragSafePress.ts)).** Priority and tag-chip controls bind activation to `mouseup`, not `onClick`, and only fire if the pointer stayed within the same threshold. Cross it and the drag wins.

  Net effect: clicking an inline title focuses it, dragging the same pixel starts a card drag, and pressing a card-internal button doesn't accidentally activate when the user meant to drag.

- **Insert columns between neighbors, not just append.** Round `+` buttons ([`InsertColumnCircleButton`](src/features/boards/BoardCanvas/InsertColumnCircleButton.tsx)) sit at the top of the board between every pair of columns (and at each end), each with a position-specific `aria-label`. Clicking one creates a new column at that exact slot via `column.create` with the neighboring column ids as `prevColumnId` / `nextColumnId`, so the fractional `position` key drops cleanly in place — no append-then-reorder round trip.
- **`PrettyModalWrap`** ([`src/Modal/PrettyModalWrap.tsx`](src/Modal/PrettyModalWrap.tsx)) is the only modal primitive — traps focus, returns focus on close, closes on Esc. No hand-rolled overlays.
- **All view state in the URL.** Filters, grouping, view mode, the open card panel — every one changes the URL. Refresh restores the view, back button works, every view is shareable.
- **Mobile responsiveness via a hamburger menu.** On wide screens, the side drawer and inline board controls live in the workspace chrome. On narrow screens (`media.maxMd`), the drawer drops out and the board nav, board controls, account panel, and verification callout collapse into a hamburger menu ([`BoardMobileMenuContent`](src/features/boards/BoardMobileMenuContent.tsx)). Touch-target sizing on edge-move buttons is enforced.
- **Live region announcements.** Async state changes (card moved, save failed) announce through a dedicated `aria-live="polite"` region rather than stealing focus.

## Trade-offs and future improvements

**Trade-offs:**

- **Firebase for auth, not a homegrown identity stack.** Email/password + verification + password reset out of the box. Cost: the local Firebase Auth Emulator dependency (Java + extra wizard step) and a Firebase-shaped session model on the client.
- **tRPC over REST/OpenAPI.** Picked primarily for `httpBatchLink` — the board canvas, drawer, and card detail fire several queries on the same render, and batching coalesces them into one HTTP request automatically. End-to-end type safety comes along for free. Cost: non-TS clients can't consume the API without `trpc-openapi`, acceptable while the only client is the bundled web app.
- **No reordering while grouped or filtered.** Reorder gestures (drag, edge-move buttons) are disabled when the board is grouped by priority or when a priority/tag filter is active — see [`canReorderBoard`](src/features/boards/model.ts). When the visible order is determined by a higher-level grouping or a filtered subset, "drop here" is ambiguous (does the user mean a position within the group, or within the underlying full column?), and partial moves silently dirty the canonical `position` for cards the user can't currently see. Cleaner to gate reordering until the user clears the grouping/filter than to ship a "works but feels wrong" interaction.
- **Server-side filtering and grouping.** Filter/group settings ride in the URL → tRPC query input → server returns the already-filtered, already-ordered set. We can't filter on the client because pagination means the client never holds the full card set (Virtuoso streams pages via cursor); filtering only the loaded slice would be wrong. Cost: changing a filter is a network round-trip, not an instant in-memory transform — accepted in exchange for correct results on arbitrarily large boards.
- **SPA over SSR.** TanStack Start is configured as a single-page app for development velocity — SSR introduces a class of hydration mismatches (timezones, theme/auth state, third-party widgets) that eat real time. Cost: first paint waits on the JS bundle and initial query. SEO isn't a concern because the entire product lives behind auth.

**Future improvements:**

- **More robust testing.** Coverage today is Vitest unit/service + a handful of component tests. Broader Playwright E2E (drag flows, optimistic-conflict paths, mobile menu, auth), property-based tests around `keyBetween`, and contract tests against a real Postgres for every tRPC procedure would catch concurrent-reorder and gesture-collision regressions the current suite can miss.
- **CI/CD workflow.** No `.github/workflows/` today — Vercel auto-deploys on push to `main`, but `npm run test`/`typecheck`/`lint`/`format:check` only run locally. A PR-gating Actions workflow with a Postgres service container for integration tests, branch protection, and a preview-deploy smoke test against the Vercel preview URL would close the loop end-to-end.
- **Code-quality passes and housekeeping.** Several large feature components (`BoardWorkspaceScreen`, `BoardPane`, `BoardCanvas`) have grown past the soft-cap targets in `AGENTS.md`. A focused sweep to split them, deduplicate near-identical patterns (inline-rename wiring, mutation-then-invalidate plumbing), prune dead branches, and tighten lingering `as unknown as` escapes into precise types would lower the risk surface for future changes.
- **Realtime collaboration.** Today multi-user boards rely on `version` conflicts surfacing on the next mutation. Supabase Realtime or a WebSocket channel could push cache invalidations to other connected clients.
- **Tag autocomplete and bulk assignment.** Tag assignment is one-at-a-time today; an autocomplete picker over `tag.list` would scale past a dozen tags.
- **Search.** No full-text search yet. A `tsvector` over `cards.title || cards.description` plus a trigram index would unlock card search.
- **Card history / activity feed.** `version` bumps aren't journaled. A `card_events` append-only table keyed by `(card_id, version)` would back an activity panel.
- **OpenAPI export.** If a non-TS client appears, `trpc-openapi` can produce a spec from the existing router without rewriting procedures.
- **Boards-shared-with-me.** Ownership is single-owner today. Multi-user boards would need a `board_members` table and an `is_member_of` predicate on every read filter.
