# Backend Build Brief: Column Structure Management

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/column-structure-management.md`](./column-structure-management.md)

This brief derives backend responsibilities only from the UX defined there. Do not add backend capabilities the UX does not require.

## 2. Slice Goal

Support column creation and column rename so the frontend can add new workflow stages and retitle existing ones without inventing placement, validation, or conflict behavior.

## 3. Entities and Context Involved

### Column entity

Required user-visible attributes implied by the UX:

- column id
- parent board id
- column title
- stored order position
- version
- updated timestamp

### Server request context

- `ctx.userId` for authenticated ownership filtering
- request identity metadata sufficient for logging

## 4. Required Write Operations

- create a new column at board end
- create a new column after an existing column
- rename an existing column

## 5. Validation Rules

- every tRPC procedure must declare a zod `.input(...)` schema
- column creation requires:
  - trim-aware title validation
  - minimum 1 non-whitespace character
  - maximum 80 characters
- column rename requires the same title validation

## 6. Ownership and Permission Checks

- every column procedure in this slice requires `ownerId` sourced explicitly from `ctx.userId`
- `column.create` must validate that the parent board belongs to the caller
- if neighbor column ids are provided for insertion, each neighbor must belong to the same caller-owned board
- `column.rename` must validate ownership through the parent board before acting

## 7. Transaction and Consistency Expectations

- `column.create` should compute the new stored order with `keyBetween(prev, next)`
- create-at-end maps to `keyBetween(lastPosition, null)`
- create-after-existing maps to `keyBetween(currentPosition, nextPosition)`
- `column.rename` should check `expectedVersion` and return `CONFLICT` on mismatch
- every successful create or rename should bump `boards.updated_at`

## 8. Error Conditions the UI Depends On

The frontend UX requires backend results to map cleanly into these visible states:

- column create validation failure
  - frontend action: show inline composer validation
- column create failure after validation
  - frontend action: keep the composer open with retry-capable error
- column rename failure
  - frontend action: keep inline edit mode open with retry-capable error
- column rename conflict
  - frontend action: show reload-latest recovery in the inline rename editor
- unauthenticated or verification-blocked request
  - frontend action: delegate to the auth/session slice behavior

All server-side failures must use `TRPCError` with documented codes rather than custom error shapes.

## 9. Logging Expectations

- log request or procedure outcome with `requestId`, `path`, `type`, duration, `ok`, and `userId` when available
- never log raw request payloads unnecessarily
- safe metadata such as board id, column id, user id, and outcome may be logged

## 10. Concrete Schema Proposal

No new tables are required for this slice.

Existing `columns` fields are sufficient:

- `id`
- `board_id`
- `title`
- `position`
- `version`
- `created_at`
- `updated_at`
- `deleted_at`

No new indexes are required beyond the existing ordered-read index on `(board_id, position)`.

## 11. Initial tRPC Procedure Contract

### `column.create`

Input:

```ts
{
  boardId: string; // uuid
  title: string; // trim-aware, min 1, max 80
  prevColumnId?: string | null; // uuid
  nextColumnId?: string | null; // uuid
}
```

Output:

```ts
{
  columnId: string;
}
```

Behavior:

- validates the board belongs to the caller
- validates provided neighbor ids belong to the same board when present
- computes `position` with `keyBetween(prev, next)`
- inserts an empty column ready for normal board reads

### `column.rename`

Input:

```ts
{
  columnId: string; // uuid
  title: string; // trim-aware, min 1, max 80
  expectedVersion: number;
}
```

Output:

```ts
{
  columnId: string;
  version: number;
  updatedAt: string;
}
```

Behavior:

- validates ownership through the parent board
- checks `expectedVersion`
- bumps `version`
- returns `CONFLICT` on stale version

## 12. Backend Acceptance Criteria

- A user can create a column only on their own board.
- A user can insert a column at board end or after an existing column.
- A user can rename a column only on their own board.
- Column rename conflicts return consistent `CONFLICT` errors.
- New columns appear in the correct ordered position on the next board read.
