# Kanban Backend Roadmap

## 1. Source Inputs

- [`docs/kanban-app-requirements.md`](./kanban-app-requirements.md)
- [`docs/app-architecture-overview.md`](./app-architecture-overview.md)
- [`docs/ux-specs/auth-session-boundaries.md`](./ux-specs/auth-session-boundaries.md)
- [`docs/ux-specs/board-shell-and-board-loading-states.md`](./ux-specs/board-shell-and-board-loading-states.md)
- [`docs/ux-specs/board-shell-and-board-loading-states-backend-build-brief.md`](./ux-specs/board-shell-and-board-loading-states-backend-build-brief.md)

## 2. Current Status

The backend already supports the board-shell slice:

- `board.list`
- `board.create`
- `board.getWithColumnsAndCards`

The current schema already includes:

- `boards`
- `columns`
- `cards`
- ownership through `boards.owner_id`
- soft delete on `boards`, `columns`, and `cards`
- `position` and `version` on `columns` and `cards`

This is enough for:

- `/boards`
- create board
- `/boards/$boardId` loading and read-only rendering

It is not yet enough for:

- card CRUD
- column create/reorder
- card move/reorder
- card detail data
- filter and grouping support
- full board lifecycle management

## 3. Recommended Locked Decisions

These decisions let the backend move forward before every later UX slice is fully written.

### First card-detail model

Use `subtasks` as the first card-detail feature.

Why:

- It satisfies the “card details panel” requirement with concrete persisted data.
- It fits Kanban work tracking better than comments in a single-user product.
- It does not overlap with the filtering/grouping attribute choice.

### First filter and grouping attribute

Use `priority` on `cards`.

Why:

- It supports both filtering and grouping cleanly.
- It works in a single-user board without requiring collaborator concepts.
- It avoids multi-tag grouping ambiguity.

Allowed values:

- `none`
- `low`
- `medium`
- `high`

### Ownership model

Keep the current ownership model:

- `boards.owner_id`
- transitive ownership for `columns` and `cards`
- do not add `owner_id` to `cards` yet

### Column deletion

Defer `column.delete` until UX defines what happens to cards in that column.

This is the one major backend operation I would not implement early without product direction.

## 4. Schema Delta Needed for Full Board Functionality

### Existing tables to extend

#### `cards`

Add:

- `priority TEXT NOT NULL DEFAULT 'none'`

Rationale:

- powers first filter and grouping capability
- keeps `board.getWithColumnsAndCards` sufficient for grouped frontend views later

### New tables

#### `card_subtasks`

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

- `(card_id, position)`

Notes:

- Use the same fixed-width numeric `position` model.
- Use the same optimistic version pattern.
- Exclude soft-deleted subtasks from reads by default.

### No new tables yet

Do not add these until a later product slice requires them:

- `card_tags`
- `card_comments`
- `board_members`
- `card_assignees`

## 5. Cross-Cutting Backend Rules for the Remaining Work

- Every procedure remains a tRPC procedure with zod `.input(...)`.
- Every service method touching Kanban entities takes `ownerId` explicitly.
- Every read excludes soft-deleted rows by default.
- Every write that references another row id must validate ownership through the board.
- Every reorder or move mutation runs inside a transaction.
- Every reorder or move mutation locks the moved row with `SELECT ... FOR UPDATE`.
- Every reorder or move mutation checks `expectedVersion` and returns `CONFLICT` on mismatch.
- Every write to cards, columns, or subtasks should bump `updated_at`.
- Board activity ordering should stay meaningful, so board-level `updated_at` should be refreshed when:
  - board name changes
  - columns are created, renamed, reordered, or deleted
  - cards are created, updated, moved, reordered, soft-deleted, or restored
  - subtasks are created, updated, toggled, reordered, or soft-deleted

## 6. Procedure Roadmap

This is the recommended concrete procedure set for “full board functionality” on the backend.

### Board router

#### Already implemented

- `board.list`
- `board.create`
- `board.getWithColumnsAndCards`

#### Next board procedures

##### `board.rename`

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

##### `board.softDelete`

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

- marks the board deleted
- soft-deletes descendant columns and cards in the same transaction

### Column router

Create a dedicated `column` router.

##### `column.create`

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
- validates neighbor ids belong to the same board when provided
- computes `position` with `keyBetween(prev, next)`

##### `column.rename`

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

##### `column.reorder`

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

##### Deferred

- `column.softDelete`

Reason:

- product semantics for orphaned cards are still undefined

### Card router

Create a dedicated `card` router.

##### `card.get`

Input:

```ts
{
  cardId: string; // uuid
}
```

Output:

```ts
{
  card: {
    id: string;
    columnId: string;
    title: string;
    description: string;
    priority: "none" | "low" | "medium" | "high";
    position: string;
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

##### `card.create`

Input:

```ts
{
  columnId: string; // uuid
  title: string; // trim-aware, min 1, max 200
  description?: string; // max 10000, default ""
  priority?: "none" | "low" | "medium" | "high";
  prevCardId?: string | null; // uuid
  nextCardId?: string | null; // uuid
}
```

Output:

```ts
{
  cardId: string;
}
```

##### `card.update`

Input:

```ts
{
  cardId: string; // uuid
  title: string; // trim-aware, min 1, max 200
  description: string; // max 10000
  priority: "none" | "low" | "medium" | "high";
  expectedVersion: number;
}
```

Output:

```ts
{
  cardId: string;
  version: number;
  updatedAt: string;
}
```

##### `card.softDelete`

Input:

```ts
{
  cardId: string; // uuid
  expectedVersion: number;
}
```

Output:

```ts
{
  cardId: string;
  deletedAt: string;
}
```

##### `card.move`

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

##### `card.reorder`

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

Note:

- implementation can internally share logic with `card.move`
- keep the separate procedure because the architecture doc already models reorder and move as distinct operations

##### `card.listByBoard`

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

- supports the minimum backend requirement for filtered card listing with pagination
- excludes soft-deleted cards by default

### Subtask router

Create a dedicated `subtask` router.

##### `subtask.create`

Input:

```ts
{
  cardId: string; // uuid
  title: string; // trim-aware, min 1, max 200
  prevSubtaskId?: string | null; // uuid
  nextSubtaskId?: string | null; // uuid
}
```

Output:

```ts
{
  subtaskId: string;
}
```

##### `subtask.update`

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

##### `subtask.toggle`

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

##### `subtask.reorder`

Input:

```ts
{
  subtaskId: string; // uuid
  prevSubtaskId?: string | null; // uuid
  nextSubtaskId?: string | null; // uuid
  expectedVersion: number;
}
```

Output:

```ts
{
  subtaskId: string;
  position: string;
  version: number;
  updatedAt: string;
}
```

##### `subtask.softDelete`

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

## 7. How Grouping Can Work Without a Separate Grouping API

Once `cards.priority` exists, the backend can support the first grouped board view without a separate `board.groupByPriority` procedure.

Recommended approach:

- extend `board.getWithColumnsAndCards` to include `priority` on each card
- let the frontend regroup the already-fetched cards by `priority`
- keep `card.listByBoard` for filtered and paginated non-board views

Add a separate grouped-board procedure only if later UX or performance needs require the server to shape the groups directly.

## 8. Recommended Build Order

### Milestone 1: Card core

- add `cards.priority`
- implement `card.create`
- implement `card.update`
- implement `card.softDelete`
- implement `card.get`
- extend `board.getWithColumnsAndCards` to return `priority`

### Milestone 2: Column core

- implement `column.create`
- implement `column.rename`

### Milestone 3: Card move and reorder

- implement `card.move`
- implement `card.reorder`
- add conflict tests
- add shared internal move/reorder service logic

### Milestone 4: Column reorder

- implement `column.reorder`
- add conflict tests

### Milestone 5: Card detail

- add `card_subtasks`
- implement the `subtask` router
- include subtasks in `card.get`

### Milestone 6: Filter and pagination support

- implement `card.listByBoard`
- add priority filter support
- let grouped board views use `priority` client-side at first

### Milestone 7: Board management

- implement `board.rename`
- implement `board.softDelete`

### Deferred until later UX decisions

- `column.softDelete`
- tags
- comments
- collaborator/assignee data
- server-shaped grouping endpoints

## 9. Test Matrix Needed

### Ownership tests

- user A cannot read user B’s board
- user A cannot create a card in user B’s column
- user A cannot move a card into user B’s column
- user A cannot reorder or rename user B’s column
- user A cannot read or mutate subtasks on user B’s card

### Validation tests

- empty and overlong titles fail for boards, columns, cards, and subtasks
- invalid UUIDs fail at the router layer
- invalid priority values fail at the router layer

### Concurrency tests

- `card.move` conflicts on stale `expectedVersion`
- `card.reorder` conflicts on stale `expectedVersion`
- `column.reorder` conflicts on stale `expectedVersion`
- `subtask.reorder` conflicts on stale `expectedVersion`

### Soft-delete tests

- deleted cards are excluded from board reads
- deleted boards are excluded from board list
- board soft delete hides descendant columns and cards
- deleted subtasks are excluded from `card.get`

### Ordering tests

- new cards insert correctly between neighbors
- moved cards land in the target column at the correct order slot
- reordered columns preserve board order
- reordered subtasks preserve card-local order

## 10. What This Plan Deliberately Leaves Open

- whether card details open in a modal or side panel
- how column deletion should behave
- whether the product eventually prefers tags or comments in addition to subtasks
- whether the board index should evolve into a richer dashboard

Those are still UX choices. This roadmap is meant to unblock backend implementation up to the point where those choices matter.
