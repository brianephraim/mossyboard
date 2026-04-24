# Backend Build Brief: Card Detail Panel or Modal

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/card-detail-panel-or-modal.md`](./card-detail-panel-or-modal.md)
- Sibling field-behavior spec: [`docs/ux-specs/card-create-and-edit-flows.md`](./card-create-and-edit-flows.md)

This brief derives backend responsibilities only from the UX defined there. Do not add backend capabilities the UX does not require.

## 2. Slice Goal

Support a route-driven card detail read plus the first in-scope detail feature, subtasks, so the frontend can render the desktop panel, mobile modal, and all documented subtask states without inventing backend behavior.

## 3. Entities and Context Involved

### Card detail entity

Required user-visible attributes implied by the UX:

- card id
- parent column id
- parent column title
- card title
- card description
- card priority
- version
- updated timestamp

### Subtask entity

Required user-visible attributes implied by the UX:

- subtask id
- parent card id
- subtask title
- `isDone`
- stored order position
- version

### Server request context

- `ctx.userId` for authenticated ownership filtering
- request identity metadata sufficient for logging

## 4. Required Read Operations

- read one owned card by id for the current board route with:
  - current column context
  - ordered, non-deleted subtasks
- return one neutral not-found style result for:
  - not found
  - soft deleted
  - not owned by caller
  - card not belonging to the current board route

## 5. Required Write Operations

- create subtask at end of current card
- update subtask title
- toggle subtask completion state
- soft-delete subtask

## 6. Validation Rules

- every tRPC procedure must declare a zod `.input(...)` schema
- card detail read requires:
  - valid card id
- subtask creation requires:
  - trim-aware title validation
  - minimum 1 non-whitespace character
  - maximum 200 characters
- subtask title update requires the same validation

## 7. Ownership and Permission Checks

- every card-detail and subtask procedure in this slice requires `ownerId` sourced explicitly from `ctx.userId`
- `card.get` must validate the requested card through the parent board ownership chain
- if the frontend also supplies `boardId` to defend against cross-board URL state, the server must validate card-to-board membership before returning the detail read
- every subtask write must validate ownership through the parent card and board before acting
- not-available behavior must not leak whether the missing card or subtask belonged to another user

## 8. Transaction and Consistency Expectations

- subtask create should compute the new stored order with `keyBetween(lastPosition, null)`
- subtask update, toggle, and soft delete should check `expectedVersion` and return `CONFLICT` on mismatch
- every subtask write should bump both the subtask `updated_at` and the parent card `updated_at`
- background refresh should be safe because the backend returns versions the client can compare against local dirty state
- this slice does not yet require subtask reorder logic

## 9. Error Conditions the UI Depends On

The frontend UX requires backend results to map cleanly into these visible states:

- card-detail read failure
  - frontend action: show retryable detail error state
- card not found, deleted, inaccessible, or outside the current board
  - frontend action: show neutral not-available state
- subtask create validation failure
  - frontend action: show inline composer validation
- subtask create failure after validation
  - frontend action: keep the composer open with retry-capable error
- subtask update failure
  - frontend action: keep the row in edit mode with retry-capable error
- subtask toggle failure
  - frontend action: restore prior checkbox state and show row-level error
- subtask soft-delete failure
  - frontend action: keep the row visible with retry-capable error
- subtask version conflict
  - frontend action: show reload-latest recovery at row level
- unauthenticated or verification-blocked request
  - frontend action: delegate to the auth/session slice behavior

All server-side failures must use `TRPCError` with documented codes rather than custom error shapes.

## 10. Logging Expectations

- log request or procedure outcome with `requestId`, `path`, `type`, duration, `ok`, and `userId` when available
- never log:
  - full card descriptions
  - auth tokens
  - raw subtask titles from failing payloads
- safe metadata such as card id, subtask id, user id, and outcome may be logged

## 11. Concrete Schema Proposal

This is the concrete next-pass schema required for the card-detail slice.

### Existing dependency from the sibling card-core slice

`cards` must already expose:

- `priority TEXT NOT NULL DEFAULT 'none'`

That requirement is defined by [`docs/ux-specs/card-create-and-edit-flows-backend-build-brief.md`](./card-create-and-edit-flows-backend-build-brief.md).

### New table: `card_subtasks`

Required columns:

- `id UUID PRIMARY KEY`
- `card_id UUID NOT NULL REFERENCES cards(id)`
- `title TEXT NOT NULL`
- `is_done BOOLEAN NOT NULL DEFAULT false`
- `position TEXT NOT NULL`
- `version INTEGER NOT NULL DEFAULT 0`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`
- `deleted_at TIMESTAMPTZ NULL`

Required index:

- `(card_id, position)` for ordered detail reads

### Ownership and soft-delete notes

- `card_subtasks` inherit ownership transitively through `cards -> columns -> boards`
- soft-deleted subtasks are excluded from default reads
- card-detail reads must also exclude subtasks whose parent card is soft-deleted or not owned by the caller

### Ordering notes

- `card_subtasks.position` uses the same fixed-width numeric text ordering model as columns and cards
- new keys are created through the `keyBetween(prev, next)` helper
- this slice needs end-insert behavior only, but the schema remains future-ready for reorder work

### RLS requirement

- any new or altered `public` tables still require `ENABLE ROW LEVEL SECURITY`
- the same migration must also create explicit policies
- for `card_subtasks`, the expected policy stance is default-deny for `anon` and `authenticated`

## 12. Initial tRPC Procedure Contract

These are the concrete first procedures for this slice.

### `card.get`

Input:

```ts
{
  cardId: string; // uuid
  boardId?: string; // uuid, optional defensive validation against route mismatch
}
```

Output:

```ts
{
  card: {
    id: string;
    columnId: string;
    columnTitle: string;
    title: string;
    description: string;
    priority: "none" | "low" | "medium" | "high";
    version: number;
    updatedAt: string;
    subtasks: Array<{
      id: string;
      title: string;
      isDone: boolean;
      position: string;
      version: number;
    }>;
  }
}
```

Behavior:

- validates ownership through the parent board
- optionally validates `boardId` membership when supplied
- excludes soft-deleted subtasks
- returns ordered subtasks

### `subtask.create`

Input:

```ts
{
  cardId: string; // uuid
  title: string; // trim-aware, min 1, max 200
}
```

Output:

```ts
{
  subtaskId: string;
}
```

Behavior:

- validates target card ownership through the parent board
- inserts at end of current subtask list
- uses `keyBetween(lastPosition, null)` for the new `position`
- defaults:
  - `isDone = false`
  - `version = 0`

### `subtask.update`

Input:

```ts
{
  subtaskId: string; // uuid
  title: string; // trim-aware, min 1, max 200
  expectedVersion: number;
}
```

Output:

```ts
{
  subtaskId: string;
  version: number;
  updatedAt: string;
}
```

Behavior:

- validates ownership through the parent card and board
- checks `expectedVersion`
- bumps `version`
- returns `CONFLICT` on stale version

### `subtask.toggle`

Input:

```ts
{
  subtaskId: string; // uuid
  isDone: boolean;
  expectedVersion: number;
}
```

Output:

```ts
{
  subtaskId: string;
  isDone: boolean;
  version: number;
  updatedAt: string;
}
```

Behavior:

- validates ownership through the parent card and board
- checks `expectedVersion`
- bumps `version`
- returns `CONFLICT` on stale version

### `subtask.softDelete`

Input:

```ts
{
  subtaskId: string; // uuid
  expectedVersion: number;
}
```

Output:

```ts
{
  subtaskId: string;
  deletedAt: string;
}
```

Behavior:

- validates ownership through the parent card and board
- checks `expectedVersion`
- sets `deleted_at`
- returns `CONFLICT` on stale version

## 13. Backend Acceptance Criteria

- A user can read card details only for their own board card.
- `card.get` returns current column context and ordered, non-deleted subtasks.
- A user can create, rename, toggle, and soft-delete subtasks only on their own cards.
- Subtask version conflicts return consistent `CONFLICT` errors.
- Soft-deleted subtasks disappear from normal card-detail reads.
