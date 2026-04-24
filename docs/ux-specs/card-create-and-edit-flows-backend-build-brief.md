# Backend Build Brief: Card Create and Edit Flows

## 1. Source Inputs

- Canonical UX spec: [`docs/ux-specs/card-create-and-edit-flows.md`](./card-create-and-edit-flows.md)

## 2. Slice Goal

Support card creation, card field editing, and card soft delete without yet introducing card detail loading, card movement, or reorder logic.

## 3. Schema Implications

### Existing table change

`cards` needs:

- `priority TEXT NOT NULL DEFAULT 'none'`

Allowed values:

- `none`
- `low`
- `medium`
- `high`

## 4. Required Write Operations

### `card.create`

Input:

```ts
{
  columnId: string; // uuid
  title: string; // trim-aware, min 1, max 200
}
```

Output:

```ts
{
  cardId: string;
}
```

Behavior:

- validates target column ownership through the parent board
- inserts at end of target column
- uses `keyBetween(lastPosition, null)` for the new `position`
- defaults:
  - `description = ""`
  - `priority = "none"`
  - `version = 0`

### `card.update`

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

Behavior:

- validates ownership through the parent board
- checks `expectedVersion`
- bumps `version`
- returns `CONFLICT` on stale version

### `card.softDelete`

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

Behavior:

- validates ownership through the parent board
- sets `deleted_at`
- returns `CONFLICT` on stale version

## 5. Required Read Shape Changes

The board read used by the board-detail route needs to expose `priority` on each visible card summary.

## 6. Error Conditions the UI Depends On

- validation failures
- create failure
- update failure
- soft-delete failure
- version conflict on update
- version conflict on delete

All must map to standard `TRPCError` codes.

## 7. Backend Acceptance Criteria

- A user can create a card only in their own column.
- New cards appear at the end of the target column.
- A user can update title, description, and priority only on their own cards.
- Soft-deleted cards disappear from normal board reads.
- Stale `expectedVersion` values return consistent conflicts.
