# Backend Build Brief: Board Management and Lifecycle

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/board-management-and-lifecycle.md`](./board-management-and-lifecycle.md)

This brief derives backend responsibilities only from the UX defined there. Do not add backend capabilities the UX does not require.

## 2. Slice Goal

Support board rename and board soft delete so the frontend can manage the current board lifecycle without inventing validation, cascade, or post-delete semantics.

## 3. Entities and Context Involved

### Board entity

Required user-visible attributes implied by the UX:

- board id
- board name
- updated timestamp
- deleted timestamp for lifecycle writes

### Server request context

- `ctx.userId` for authenticated ownership filtering
- request identity metadata sufficient for logging

## 4. Required Write Operations

- rename a board
- soft-delete a board and hide it from normal board reads

## 5. Validation Rules

- every tRPC procedure must declare a zod `.input(...)` schema
- board rename requires:
  - trim-aware name validation
  - minimum 1 non-whitespace character
  - maximum 80 characters

## 6. Ownership and Permission Checks

- every board-management procedure in this slice requires `ownerId` sourced explicitly from `ctx.userId`
- `board.rename` must validate the board belongs to the caller
- `board.softDelete` must validate the board belongs to the caller

## 7. Transaction and Consistency Expectations

- `board.rename` updates `name` and `updated_at`
- `board.softDelete` runs in a transaction
- successful board soft delete sets `deleted_at` on:
  - the board
  - descendant columns
  - descendant cards
- once deleted, the board must disappear from:
  - `board.list`
  - `board.getWithColumnsAndCards`
  - `card.get`
  - any board-scoped list read that excludes deleted data by default

## 8. Error Conditions the UI Depends On

The frontend UX requires backend results to map cleanly into these visible states:

- board rename validation failure
  - frontend action: show field validation inside settings
- board rename failure after validation
  - frontend action: keep settings dialog open with retry-capable error
- board soft-delete failure
  - frontend action: keep delete confirmation open with retry-capable error
- unauthenticated or verification-blocked request
  - frontend action: delegate to the auth/session slice behavior

All server-side failures must use `TRPCError` with documented codes rather than custom error shapes.

## 9. Logging Expectations

- log request or procedure outcome with `requestId`, `path`, `type`, duration, `ok`, and `userId` when available
- never log raw form payloads unnecessarily
- safe metadata such as board id, user id, and outcome may be logged

## 10. Concrete Schema Proposal

No new tables are required for this slice.

Existing `boards.deleted_at`, `columns.deleted_at`, and `cards.deleted_at` are sufficient for board soft delete.

## 11. Initial tRPC Procedure Contract

### `board.rename`

Input:

```ts
{
  boardId: string; // uuid
  name: string; // trim-aware, min 1, max 80
}
```

Output:

```ts
{
  boardId: string;
  name: string;
  updatedAt: string;
}
```

Behavior:

- validates the board belongs to the caller
- updates `name` and `updated_at`

### `board.softDelete`

Input:

```ts
{
  boardId: string; // uuid
}
```

Output:

```ts
{
  boardId: string;
  deletedAt: string;
}
```

Behavior:

- validates the board belongs to the caller
- marks the board deleted
- soft-deletes descendant columns and cards in the same transaction

## 12. Backend Acceptance Criteria

- A user can rename only their own board.
- A user can soft-delete only their own board.
- Soft-deleted boards disappear from normal board and card reads.
- Soft-deleting a board cascades to descendant columns and cards in the service layer.
