# Backend Build Brief: Move and Reorder Behavior

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/move-and-reorder-behavior.md`](./move-and-reorder-behavior.md)

This brief derives backend responsibilities only from the UX defined there. Do not add backend capabilities the UX does not require.

## 2. Slice Goal

Support card move, card reorder, and column reorder so the frontend can optimistically reshape board order while relying on consistent conflict detection and rollback behavior.

## 3. Entities and Context Involved

### Card entity

Required user-visible attributes implied by the UX:

- card id
- column id
- position
- version
- updated timestamp

### Column entity

Required user-visible attributes implied by the UX:

- column id
- board id
- position
- version
- updated timestamp

### Server request context

- `ctx.userId` for authenticated ownership filtering
- request identity metadata sufficient for logging

## 4. Required Write Operations

- reorder card within current column
- move card to another column
- reorder columns within the current board

## 5. Validation Rules

- every tRPC procedure must declare a zod `.input(...)` schema
- every move or reorder requires:
  - valid target ids
  - valid neighbor ids when provided
  - `expectedVersion` from the client

## 6. Ownership and Permission Checks

- every move or reorder procedure in this slice requires `ownerId` sourced explicitly from `ctx.userId`
- `card.move` and `card.reorder` must validate card ownership through the parent board
- `card.move` must validate target column ownership through the same caller-owned board
- neighbor card ids, when provided, must belong to the target column
- `column.reorder` must validate the moved column and neighbor columns through the same caller-owned board

## 7. Transaction and Consistency Expectations

- every move or reorder runs inside a transaction
- every move or reorder locks the moved row with `SELECT ... FOR UPDATE`
- every move or reorder computes `position` with `keyBetween(prev, next)`
- every move or reorder checks `expectedVersion` and returns `CONFLICT` on mismatch
- successful card move or reorder updates:
  - `column_id` when applicable
  - `position`
  - `version`
  - `updated_at`
- successful column reorder updates:
  - `position`
  - `version`
  - `updated_at`
- every successful move or reorder should bump `boards.updated_at`
- lazy rebalance remains an internal backend concern and does not need separate UX-visible API in this slice

## 8. Error Conditions the UI Depends On

The frontend UX requires backend results to map cleanly into these visible states:

- card move failure
  - frontend action: roll back optimistic placement and show inline recovery
- card reorder failure
  - frontend action: roll back optimistic placement and show inline recovery
- column reorder failure
  - frontend action: roll back optimistic placement and show inline recovery
- version conflict on any move or reorder
  - frontend action: roll back and show one reload-latest recovery path
- unauthenticated or verification-blocked request
  - frontend action: delegate to the auth/session slice behavior

All server-side failures must use `TRPCError` with documented codes rather than custom error shapes.

## 9. Logging Expectations

- log request or procedure outcome with `requestId`, `path`, `type`, duration, `ok`, and `userId` when available
- never log raw drag payload dumps unnecessarily
- safe metadata such as board id, card id, column id, and outcome may be logged

## 10. Concrete Schema Proposal

No new tables are required for this slice.

Existing `cards` and `columns` fields are sufficient:

- `position`
- `version`
- `updated_at`

No new indexes are required beyond the existing ordered-read indexes.

## 11. Initial tRPC Procedure Contract

### `card.move`

Input:

```ts
{
  cardId: string; // uuid
  targetColumnId: string; // uuid
  prevCardId?: string | null; // uuid
  nextCardId?: string | null; // uuid
  expectedVersion: number;
}
```

Output:

```ts
{
  cardId: string;
  columnId: string;
  position: string;
  version: number;
  updatedAt: string;
}
```

Behavior:

- validates source card ownership through board
- validates target column ownership through board
- validates neighbor cards belong to the target column when provided
- runs inside a transaction
- locks the moved card row
- updates `column_id`, `position`, `version`, and `updated_at` together

### `card.reorder`

Input:

```ts
{
  cardId: string; // uuid
  columnId: string; // uuid
  prevCardId?: string | null; // uuid
  nextCardId?: string | null; // uuid
  expectedVersion: number;
}
```

Output:

```ts
{
  cardId: string;
  position: string;
  version: number;
  updatedAt: string;
}
```

Behavior:

- validates ownership and current-column membership
- shares internal ordering logic with `card.move`
- returns `CONFLICT` on stale version

### `column.reorder`

Input:

```ts
{
  columnId: string; // uuid
  prevColumnId?: string | null; // uuid
  nextColumnId?: string | null; // uuid
  expectedVersion: number;
}
```

Output:

```ts
{
  columnId: string;
  position: string;
  version: number;
  updatedAt: string;
}
```

Behavior:

- validates the moved column and neighbor columns belong to the same caller-owned board
- runs inside a transaction
- locks the moved column row
- computes `position` with `keyBetween(prev, next)`
- returns `CONFLICT` on stale version

## 12. Backend Acceptance Criteria

- A user can move a card only within their own board.
- A user can reorder a card only within its current caller-owned column.
- A user can reorder columns only within their own board.
- Every move or reorder returns consistent `CONFLICT` errors on stale version.
- Successful move or reorder writes only the moved item plus board recency metadata on the common path.
