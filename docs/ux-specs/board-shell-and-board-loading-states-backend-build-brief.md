# Backend Build Brief: Board Shell and Board Loading States

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/board-shell-and-board-loading-states.md`](./board-shell-and-board-loading-states.md)

This brief derives backend responsibilities only from the UX defined there. Do not add server capabilities the UX does not require.

## 2. Slice Goal

Support the first protected Kanban shell with behaviorally correct board reads and board creation so the frontend can render `/boards`, `/boards/$boardId`, and all documented loading, empty, error, and not-available states.

## 3. Entities and Context Involved

### Board entity

Required user-visible attributes implied by the UX:

- board id
- board name
- updated timestamp or equivalent ordering signal used to sort the boards-home list
- total visible column count
- total visible card count

### Column entity

Required user-visible attributes implied by the UX:

- column id
- parent board id
- column title
- stored order position
- version field for future conflict-prone slices

### Card entity

Required user-visible attributes implied by the UX:

- card id
- parent column id
- card title
- card description or description preview source
- stored order position
- version field for future conflict-prone slices
- soft-delete support

### Server request context

- `ctx.userId` for authenticated ownership filtering
- request identity metadata sufficient for logging

## 4. Required Read Operations

- list current user's boards ordered by most recently updated first
- include enough summary data for each board entry to render:
  - board name
  - visible column count
  - visible card count
- read one owned board by id with:
  - ordered columns
  - ordered non-deleted cards within each column

## 5. Required Write Operations

- create board with:
  - validated board name
  - current user as owner
  - fixed default columns `To do`, `In progress`, and `Done`
- ensure board creation and default-column creation occur together so the frontend never lands on a newly created board with missing starter columns

## 6. Validation Rules

- every tRPC procedure must declare a zod `.input(...)` schema
- board creation requires:
  - string input
  - trim-aware validation
  - minimum 1 non-whitespace character
  - maximum 80 characters
- duplicate board names are allowed in this slice

## 7. Ownership and Permission Checks

- every board read and write in this slice requires `ownerId` sourced explicitly from `ctx.userId`
- boards-home list must return only boards owned by the caller and not soft-deleted
- board-detail read must only return a board owned by the caller and not soft-deleted
- when returning columns and cards for a board:
  - cards must exclude soft-deleted rows
  - referenced board ownership must still be validated through the parent board
- create-board must assign ownership to the authenticated caller only
- board-not-available behavior must not leak whether the requested board id belongs to another user

## 8. Transaction and Consistency Expectations

- create-board should run in a transaction so the board row and starter columns are created atomically
- the transaction should leave the new board readable immediately after success
- this slice does not yet require reorder transactions or `SELECT ... FOR UPDATE`, but the created columns should still carry future-ready ordering and version fields

## 9. Error Conditions the UI Depends On

The frontend UX requires backend results to map cleanly into these visible states:

- boards-home read failure
  - frontend action: show boards-home retryable error state
- board-detail read failure
  - frontend action: show board-detail retryable error state
- board not found, deleted, or not owned by caller
  - frontend action: show neutral board-not-available state
- create-board validation failure
  - frontend action: show field or form error inside the dialog
- create-board failure after validation
  - frontend action: keep the dialog open with retry-capable error
- unauthenticated or verification-blocked request
  - frontend action: delegate to the auth/session slice behavior

All server-side failures must use `TRPCError` with documented codes rather than custom error shapes.

## 10. Logging Expectations

- log request or procedure outcome with `requestId`, `path`, `type`, duration, `ok`, and `userId` when available
- never log:
  - full card bodies
  - auth tokens
  - raw request bodies that contain sensitive values
- board create failures may log safe metadata such as user id, path, and outcome, but not sensitive payload dumps

## 11. Concrete Schema Proposal

This is the concrete first-pass schema for the board-shell slice.

### `boards`

Required columns:

- `id UUID PRIMARY KEY`
- `owner_id TEXT NOT NULL`
- `name TEXT NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`
- `deleted_at TIMESTAMPTZ NULL`

Required index:

- `(owner_id, updated_at)` for the `/boards` list

### `columns`

Required columns:

- `id UUID PRIMARY KEY`
- `board_id UUID NOT NULL REFERENCES boards(id)`
- `title TEXT NOT NULL`
- `position TEXT NOT NULL`
- `version INTEGER NOT NULL DEFAULT 0`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`
- `deleted_at TIMESTAMPTZ NULL`

Required index:

- `(board_id, position)` for ordered board reads

### `cards`

Required columns:

- `id UUID PRIMARY KEY`
- `column_id UUID NOT NULL REFERENCES columns(id)`
- `title TEXT NOT NULL`
- `description TEXT NOT NULL DEFAULT ''`
- `position TEXT NOT NULL`
- `version INTEGER NOT NULL DEFAULT 0`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`
- `deleted_at TIMESTAMPTZ NULL`

Required index:

- `(column_id, position)` for ordered column reads

### Ownership and soft-delete notes

- `boards` carries the direct ownership column
- `columns` and `cards` inherit ownership transitively through the parent board
- `cards` and `boards` use soft delete in this slice
- `columns` also carry `deleted_at` now so later board-structure changes do not require a second schema correction pass

### Ordering notes

- `columns.position` and `cards.position` are fixed-width numeric text ordering keys
- new keys are created through the `keyBetween(prev, next)` helper
- this slice needs starter-column ordering only, but the same schema is future-ready for reorder and move work

### RLS requirement

- any new or altered `public` tables still require `ENABLE ROW LEVEL SECURITY`
- the same migration must also create explicit policies
- for these Kanban tables, the expected policy stance is default-deny for `anon` and `authenticated`

## 12. Initial tRPC Procedure Contract

These are the concrete first procedures for this slice.

### `board.list`

Input:

```ts
{
}
```

Output:

```ts
{
  boards: Array<{
    id: string;
    name: string;
    updatedAt: string;
    columnCount: number;
    cardCount: number;
  }>;
}
```

Behavior:

- protected procedure
- returns only owned, non-deleted boards
- orders by most recently updated first

### `board.create`

Input:

```ts
{
  name: string; // trim-aware, min 1, max 80
}
```

Output:

```ts
{
  boardId: string;
}
```

Behavior:

- protected procedure
- creates the board for `ctx.userId`
- creates starter columns `To do`, `In progress`, and `Done` in the same transaction
- does not require unique board names

### `board.getWithColumnsAndCards`

Input:

```ts
{
  boardId: string; // uuid
}
```

Output:

```ts
{
  board: {
    id: string;
    name: string;
    updatedAt: string;
    columnCount: number;
    cardCount: number;
    columns: Array<{
      id: string;
      title: string;
      position: string;
      version: number;
      cardCount: number;
      cards: Array<{
        id: string;
        title: string;
        description: string;
        position: string;
        version: number;
      }>;
    }>;
  }
}
```

Behavior:

- protected procedure
- returns only one owned, non-deleted board
- returns ordered, non-deleted columns
- returns ordered, non-deleted cards within each column
- collapses not-found, deleted, and foreign-owned board ids into the same not-found-style outcome

## 13. Backend Acceptance Criteria

- An authenticated user can list only their own non-deleted boards.
- `/boards` data returns enough summary information for the board list and empty-state decisions.
- An authenticated user can create a board with a validated name.
- New boards are created with the fixed default columns in one consistent operation.
- An authenticated user can read one owned board with ordered columns and ordered non-deleted cards.
- The backend distinguishes retryable load failures from board-not-available outcomes in a way the frontend can map into the documented states.
- No cross-owner board id can be used to read another user's board data.
