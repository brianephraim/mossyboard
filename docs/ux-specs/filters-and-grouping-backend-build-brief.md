# Backend Build Brief: Filters and Grouping

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/filters-and-grouping.md`](./filters-and-grouping.md)
- Sibling card-core spec: [`docs/ux-specs/card-create-and-edit-flows.md`](./card-create-and-edit-flows.md)

This brief derives backend responsibilities only from the UX defined there. Do not add backend capabilities the UX does not require.

## 2. Slice Goal

Support priority-based board filtering, client-side grouping, and a paginated matching-cards list mode without requiring a server-shaped grouped-board response.

## 3. Entities and Context Involved

### Card summary entity

Required user-visible attributes implied by the UX:

- card id
- column id
- column title for list mode
- title
- description preview source
- priority
- position
- version
- updated timestamp

### Server request context

- `ctx.userId` for authenticated ownership filtering
- request identity metadata sufficient for logging

## 4. Required Read Operations

- extend the existing board-detail read so each card summary includes `priority`
- list matching cards for one caller-owned board with:
  - optional priority filters
  - stable cursor pagination
  - current column context

## 5. Validation Rules

- every tRPC procedure must declare a zod `.input(...)` schema
- `card.listByBoard` requires:
  - valid board id
  - optional priority filter values constrained to allowed enum values
  - optional limit with default 50 and max 100
  - optional cursor shape with `updatedAt` and `cardId`

## 6. Ownership and Permission Checks

- every filtered-list read in this slice requires `ownerId` sourced explicitly from `ctx.userId`
- the board id supplied to `card.listByBoard` must belong to the caller
- list results must exclude soft-deleted cards by default

## 7. Transaction and Consistency Expectations

- this slice is read-only on the backend
- pagination order should be stable:
  - `updated_at DESC`
  - then `id DESC` or equivalent stable tie-breaker
- `nextCursor` should represent the last returned row in that stable ordering

## 8. Error Conditions the UI Depends On

The frontend UX requires backend results to map cleanly into these visible states:

- initial list read failure
  - frontend action: show full list-surface retryable error
- next-page read failure
  - frontend action: preserve existing rows and show inline retry near the footer
- unauthenticated or verification-blocked request
  - frontend action: delegate to the auth/session slice behavior

All server-side failures must use `TRPCError` with documented codes rather than custom error shapes.

## 9. Logging Expectations

- log request or procedure outcome with `requestId`, `path`, `type`, duration, `ok`, and `userId` when available
- never log raw card descriptions unnecessarily
- safe metadata such as board id, filter presence, limit, and outcome may be logged

## 10. Concrete Schema Proposal

No new tables are required for this slice.

Required existing dependency:

- `cards.priority TEXT NOT NULL DEFAULT 'none'`

No new indexes are strictly required for the documented list mode, though future performance work may revisit compound indexes around board-scoped filtered list reads.

## 11. Initial tRPC Procedure Contract

### Extend `board.getWithColumnsAndCards`

Each visible card summary returned for board view must include:

```ts
{
  id: string;
  title: string;
  description: string;
  priority: "none" | "low" | "medium" | "high";
  position: string;
  version: number;
}
```

### `card.listByBoard`

Input:

```ts
{
  boardId: string; // uuid
  filters?: {
    priority?: Array<"none" | "low" | "medium" | "high">;
  };
  limit?: number; // default 50, max 100
  cursor?: {
    updatedAt: string;
    cardId: string;
  } | null;
}
```

Output:

```ts
{
  items: Array<{
    id: string;
    columnId: string;
    columnTitle: string;
    title: string;
    description: string;
    priority: "none" | "low" | "medium" | "high";
    position: string;
    version: number;
    updatedAt: string;
  }>;
  nextCursor: {
    updatedAt: string;
    cardId: string;
  } | null;
}
```

Behavior:

- validates the board belongs to the caller
- filters by selected priorities when provided
- excludes soft-deleted cards
- orders by `updated_at DESC`, then a stable tie-breaker
- returns `nextCursor` only when more results remain

## 12. Backend Acceptance Criteria

- Board view card summaries expose `priority`.
- A user can list matching cards only for their own board.
- Priority filters work for any subset of the four allowed values.
- Pagination is stable and cursor-based.
- Initial-load and next-page failures remain distinguishable for the frontend.
