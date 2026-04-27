# Column Pagination & DnD Virtualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Paginate kanban columns at 50 cards per page with infinite scroll, virtualize the card list for `@hello-pangea/dnd`, and split data into per-(column × priority) queries when grouped by priority. tRPC's `httpBatchLink` collapses the parallel queries into one HTTP request per board load.

**Architecture:**

- Server adds a `card.listByColumn` cursor endpoint ordered by `(position, id)` with optional priority filter (single value or list).
- Frontend stops loading the full board snapshot. Each visible droppable owns a `useInfiniteQuery` keyed by `(columnId, mode, priority/filter)`. Optimistic drag updates patch the affected query caches via `queryClient.setQueryData` instead of rewriting a single board snapshot.
- Card lists virtualize with `react-virtuoso` and the `<Droppable>` opts in via `mode="virtual"` + `renderClone`. Virtuoso's `endReached` triggers `fetchNextPage`.
- Drop-into-unloaded-region resolves naturally: server only needs `prevCardId`/`nextCardId` of immediate (visible) neighbors.

**Tech Stack:** TanStack Query + tRPC (existing), `react-virtuoso` (new), `@hello-pangea/dnd` v18 (existing), Drizzle / Postgres (existing), Vitest + node:assert/strict (existing).

**Out of scope (follow-up PR if needed):** Explicit "drop at end of unloaded column" affordance. Today the user must scroll to load the tail before they can drop there.

---

## PR Map

- **PR 1 — Server: `card.listByColumn` endpoint + composite index.** Additive; doesn't touch frontend. Safe to ship independently.
- **PR 2 — Frontend: replace board snapshot with per-droppable queries.** Big refactor. After this PR, behavior is identical to today (still loads all cards, no virtualization, no infinite scroll), but the data plumbing supports it.
- **PR 3 — Virtualize + infinite scroll.** Drops page size to 50, adds `react-virtuoso`, switches `<Droppable>` to `mode="virtual"`, wires `endReached` → `fetchNextPage`.

Each PR is independently mergeable and reviewable. PR 2 is the largest.

---

# PR 1 — Server: `card.listByColumn` endpoint + composite index

**What ships:** New tRPC procedure that returns one page of cards for one column, optionally filtered by priority (single value or list). New composite index. No frontend consumer yet.

## Task 1.1: Add composite index to `cards` schema

**Files:**

- Modify: `src/server/db/schema.ts` (the `cards` table indexes block)
- Generate: `drizzle/pg/0007_<auto-name>.sql`

- [x] **Step 1: Add the index in schema**

In `src/server/db/schema.ts`, find the `cards` table indexes block:

```typescript
(t) => ({
  columnPositionIdx: index("cards_column_position_idx").on(t.columnId, t.position),
}),
```

Replace with:

```typescript
(t) => ({
  columnPositionIdx: index("cards_column_position_idx").on(t.columnId, t.position),
  columnPriorityPositionIdx: index("cards_column_priority_position_idx").on(
    t.columnId,
    t.priority,
    t.position,
    t.id,
  ),
}),
```

- [x] **Step 2: Generate migration**

Run: `npm run db:generate`
Expected: a new file `drizzle/pg/0007_<random-name>.sql` containing `CREATE INDEX "cards_column_priority_position_idx" ON "cards" ("column_id","priority","position","id");`

- [x] **Step 3: Apply migration**

Run: `npm run db:migrate`
Expected: migration applied, no errors.

- [x] **Step 4: Verify schema and migration are in sync**

Run: `npm run db:generate`
Expected: "No schema changes, nothing to migrate" (or equivalent — meaning the generated migration captured everything).

- [x] **Step 5: Format**

Run: `npx prettier --write src/server/db/schema.ts`

- [x] **Step 6: Commit**

```bash
git add src/server/db/schema.ts drizzle/pg/0007_*.sql drizzle/pg/meta
git commit -m "feat(db): add (column_id, priority, position, id) composite index on cards"
```

## Task 1.2: Add `listCardsByColumn` repo function with failing test

**Files:**

- Modify: `src/server/card/repo.test.ts`
- Modify: `src/server/card/repo.ts`

- [x] **Step 1: Write a failing test for the basic happy path**

Open `src/server/card/repo.test.ts` and add a new `describe` block (place it after the existing `describe("listCardsByBoard"...)` block, mirroring its style). Use the existing test helpers — read the file first to see how `migrateTestDb`, `seedBoardWithColumns`, etc. are wired. The test should:

1. Seed an owner, a board, one column, and 5 cards in known position order across 2 priorities (e.g., 3 with `"low"`, 2 with `"high"`).
2. Call `listCardsByColumn({ ownerId, columnId, limit: 10 })`.
3. Assert returned items are ordered by `(position ASC, id ASC)`.
4. Assert `nextCursor` is `null` (page fits).
5. Assert all 5 cards are returned.

Use the same `assert.deepStrictEqual` / `assert.equal` style already in the file. Do not introduce new test helpers — reuse what's there.

- [x] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/server/card/repo.test.ts`
Expected: FAIL with `listCardsByColumn is not a function` (or import error).

- [x] **Step 3: Implement the minimal `listCardsByColumn` function**

In `src/server/card/repo.ts`, add (after `listCardsByBoard`):

```typescript
export async function listCardsByColumn(input: {
  ownerId: string;
  columnId: string;
  priority?: CardPriority | CardPriority[];
  limit: number;
  cursor?: {
    position: string;
    cardId: string;
  } | null;
}): Promise<{
  items: CardListItemRow[];
  nextCursor: { position: string; cardId: string } | null;
}> {
  const ownedColumn = await getOwnedColumn(db, {
    ownerId: input.ownerId,
    columnId: input.columnId,
  });
  if (!ownedColumn) {
    throw trpcErrors.notFound("Column not found");
  }

  const filters = [eq(cards.columnId, ownedColumn.id), isNull(cards.deletedAt)];

  if (input.priority !== undefined) {
    if (Array.isArray(input.priority)) {
      if (input.priority.length === 0) {
        return { items: [], nextCursor: null };
      }
      filters.push(inArray(cards.priority, input.priority));
    } else {
      filters.push(eq(cards.priority, input.priority));
    }
  }

  if (input.cursor) {
    filters.push(
      or(
        sql`${cards.position} > ${input.cursor.position}`,
        and(eq(cards.position, input.cursor.position), sql`${cards.id} > ${input.cursor.cardId}`),
      )!,
    );
  }

  const rows = await db
    .select({
      id: cards.id,
      columnId: cards.columnId,
      columnTitle: columns.title,
      title: cards.title,
      description: cards.description,
      priority: cards.priority,
      position: cards.position,
      version: cards.version,
      updatedAt: cards.updatedAt,
    })
    .from(cards)
    .innerJoin(columns, eq(cards.columnId, columns.id))
    .where(and(...filters))
    .orderBy(asc(cards.position), asc(cards.id))
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const baseItems = hasMore ? rows.slice(0, input.limit) : rows;
  const lastItem = baseItems.at(-1);

  const tagMap = await listTagsForCards(db, {
    ownerId: input.ownerId,
    cardIds: baseItems.map((row) => row.id),
  });

  const items = baseItems.map((row) => ({
    ...row,
    tags: tagMap.get(row.id) ?? [],
  }));

  return {
    items,
    nextCursor: hasMore && lastItem ? { position: lastItem.position, cardId: lastItem.id } : null,
  };
}
```

Note: `getOwnedColumn` and `listTagsForCards` are already imported at the top of `repo.ts`. `or`, `asc`, `eq`, `inArray`, `isNull`, `and`, `sql` are already imported from `drizzle-orm`.

- [x] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/server/card/repo.test.ts`
Expected: PASS.

- [x] **Step 5: Format**

Run: `npx prettier --write src/server/card/repo.ts src/server/card/repo.test.ts`

- [x] **Step 6: Commit**

```bash
git add src/server/card/repo.ts src/server/card/repo.test.ts
git commit -m "feat(card): add listCardsByColumn repo with happy path test"
```

## Task 1.3: Add tests for cursor pagination, priority filter, and owner scoping

**Files:**

- Modify: `src/server/card/repo.test.ts`

- [x] **Step 1: Write a failing test for cursor pagination**

Add a test that:

1. Seeds 7 cards in one column, all priority `"none"`.
2. Calls `listCardsByColumn({ ownerId, columnId, limit: 3 })`. Asserts items.length === 3, `nextCursor` is the third card's `(position, id)`.
3. Calls `listCardsByColumn({ ownerId, columnId, limit: 3, cursor: <result1.nextCursor> })`. Asserts items.length === 3 and these are cards 4–6 in position order, `nextCursor` is the sixth card's `(position, id)`.
4. Calls `listCardsByColumn({ ownerId, columnId, limit: 3, cursor: <result2.nextCursor> })`. Asserts items.length === 1 and `nextCursor` is `null`.

- [x] **Step 2: Run to verify it passes**

Run: `npm run test -- src/server/card/repo.test.ts`
Expected: PASS (cursor logic is in place from Task 1.2).

- [x] **Step 3: Write a failing test for single-priority filter**

Add a test that:

1. Seeds 6 cards: 2 `"high"`, 2 `"medium"`, 2 `"low"`, in position order interleaved.
2. Calls `listCardsByColumn({ ownerId, columnId, priority: "high", limit: 10 })`.
3. Asserts only the 2 `"high"` cards are returned, in `(position, id)` order.

- [x] **Step 4: Run to verify it passes**

Run: `npm run test -- src/server/card/repo.test.ts`
Expected: PASS.

- [x] **Step 5: Write a failing test for priority list filter**

Add a test that:

1. Reuses the same 6-card seed from Step 3.
2. Calls `listCardsByColumn({ ownerId, columnId, priority: ["high", "medium"], limit: 10 })`.
3. Asserts the 4 high+medium cards are returned, in position order.

Also add a test that calls with `priority: []` and asserts `{ items: [], nextCursor: null }` without making a DB query (we early-return).

- [x] **Step 6: Run to verify it passes**

Run: `npm run test -- src/server/card/repo.test.ts`
Expected: PASS.

- [x] **Step 7: Write a failing test for owner scoping**

Add a test that:

1. Seeds owner A with a column containing 3 cards.
2. Calls `listCardsByColumn({ ownerId: <ownerB-id>, columnId: <ownerA-column-id>, limit: 10 })`.
3. Asserts it throws `TRPCError` with code `"NOT_FOUND"` (because `getOwnedColumn` returns null for the wrong owner, and we throw).

Use existing `await assert.rejects(...)` pattern from `router.test.ts` (line 30+ of that file).

- [x] **Step 8: Run to verify it passes**

Run: `npm run test -- src/server/card/repo.test.ts`
Expected: PASS.

- [x] **Step 9: Write a failing test for soft-delete exclusion**

Add a test that:

1. Seeds 3 cards in a column.
2. Soft-deletes one (set `deletedAt = now()` directly via `db.update(cards)...`).
3. Calls `listCardsByColumn({ ownerId, columnId, limit: 10 })`.
4. Asserts 2 cards are returned, deleted card is absent.

- [x] **Step 10: Run to verify it passes**

Run: `npm run test -- src/server/card/repo.test.ts`
Expected: PASS.

- [x] **Step 11: Format and commit**

```bash
npx prettier --write src/server/card/repo.test.ts
git add src/server/card/repo.test.ts
git commit -m "test(card): cover listCardsByColumn cursor, priority filter, owner scoping, soft-delete"
```

## Task 1.4: Add service wrapper

**Files:**

- Modify: `src/server/card/service.ts`

- [x] **Step 1: Write the service wrapper**

In `src/server/card/service.ts`, add at the top of the imports list:

```typescript
import {
  createCard,
  getCard,
  listCardsByBoard,
  listCardsByColumn,
  moveCard,
  reorderCard,
  softDeleteCard,
  updateCard,
  type CardDetailRow,
  type CardListItemRow,
} from "./repo";
```

Then add (after `listCardsByBoardForUser`):

```typescript
export async function listCardsByColumnForUser(
  ownerId: string,
  input: {
    columnId: string;
    priority?: CardPriority | CardPriority[];
    limit: number;
    cursor?: { position: string; cardId: string } | null;
  },
) {
  const listed = await listCardsByColumn({
    ownerId,
    columnId: input.columnId,
    priority: input.priority,
    limit: input.limit,
    cursor: input.cursor ?? null,
  });

  return {
    items: listed.items.map(serializeCardListItem),
    nextCursor: listed.nextCursor,
  };
}
```

`serializeCardListItem` already exists at the bottom of the file — reuse it.

- [x] **Step 2: Format**

Run: `npx prettier --write src/server/card/service.ts`

- [x] **Step 3: Commit**

```bash
git add src/server/card/service.ts
git commit -m "feat(card): add listCardsByColumnForUser service wrapper"
```

## Task 1.5: Add tRPC procedure with input validation tests

**Files:**

- Modify: `src/server/trpc/routers/card.ts`
- Modify: `src/server/card/router.test.ts`

- [x] **Step 1: Write a failing input-validation test**

In `src/server/card/router.test.ts`, add a new `it(...)` block (modeled on the existing one). It should:

1. Mock `adminAuth.verifyIdToken` to return `{ uid: "u_123" }`.
2. Build a caller as the existing test does.
3. Assert `caller.card.listByColumn({ columnId: "not-a-uuid", limit: 50 })` rejects with `BAD_REQUEST`.
4. Assert `caller.card.listByColumn({ columnId: <valid-uuid>, limit: 50, priority: "urgent" as never })` rejects with `BAD_REQUEST`.
5. Assert `caller.card.listByColumn({ columnId: <valid-uuid>, limit: 9999 })` rejects with `BAD_REQUEST`.

- [x] **Step 2: Run to verify it fails**

Run: `npm run test -- src/server/card/router.test.ts`
Expected: FAIL with `caller.card.listByColumn is not a function`.

- [x] **Step 3: Add the tRPC procedure**

In `src/server/trpc/routers/card.ts`:

Update the imports:

```typescript
import {
  createCardForUser,
  getCardForUser,
  listCardsByBoardForUser,
  listCardsByColumnForUser,
  moveCardForUser,
  reorderCardForUser,
  softDeleteCardForUser,
  updateCardForUser,
} from "../../card/service";
```

Add the procedure inside `cardRouter` (after `listByBoard`):

```typescript
listByColumn: protectedProcedure
  .input(
    z.object({
      columnId: columnIdSchema,
      priority: z
        .union([cardPrioritySchema, z.array(cardPrioritySchema).min(1).max(4)])
        .optional(),
      limit: z.number().int().min(1).max(100).default(50),
      cursor: z
        .object({
          position: z.string().min(1),
          cardId: cardIdSchema,
        })
        .nullable()
        .optional(),
    }),
  )
  .query(({ ctx, input }) => {
    return listCardsByColumnForUser(ctx.userId, input);
  }),
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/server/card/router.test.ts`
Expected: PASS.

- [x] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: all green. The new endpoint is additive; nothing else should break.

- [x] **Step 6: Format**

Run: `npx prettier --write src/server/trpc/routers/card.ts src/server/card/router.test.ts`

- [x] **Step 7: Commit**

```bash
git add src/server/trpc/routers/card.ts src/server/card/router.test.ts
git commit -m "feat(trpc): expose card.listByColumn with cursor + priority validation"
```

## Task 1.6: PR 1 wrap-up

- [x] **Step 1: Verify nothing else regressed**

Run: `npm run test`
Expected: full suite passes.

- [ ] **Step 2: Push and open PR**

```bash
git push -u origin <branch>
gh pr create --title "Add card.listByColumn endpoint with priority filter" --body "$(cat <<'EOF'
## Summary
- New `card.listByColumn` tRPC procedure: cursor-paginated, sorted by (position, id), optional priority filter (single value or list)
- Composite index `cards_column_priority_position_idx` to back the new query path
- Repo + service + router tests for cursor pagination, single/list priority filter, owner scoping, soft-delete exclusion, and input validation
- No frontend consumer yet — additive only

## Test plan
- [x] `npm run test`
EOF
)"
```

After PR merges, capture the head commit hash and output: `Opened PR: <full-commit-hash>`.

---

# PR 2 — Frontend: replace board snapshot with per-droppable queries

**What ships:** The single `board.getWithColumnsAndCards` snapshot is gone. The board page loads two things: column structure (no cards) and one infinite query per visible droppable. Optimistic drag updates patch query caches. Page size stays at 100 in this PR (effectively "load all" for typical boards) so behavior matches today — virtualization and 50-card pagination land in PR 3.

**Why this seam:** Splitting structure from cards lets us migrate the data layer without touching virtualization, scroll, or DnD library config. After this PR, the board still feels identical to a user; the plumbing is what changed.

## Task 2.1: Add `board.getStructure` server endpoint

**Files:**

- Modify: `src/server/board/repo.ts`
- Modify: `src/server/board/repo.test.ts`
- Modify: `src/server/trpc/routers/board.ts`
- Modify: `src/server/board/router.test.ts`

- [x] **Step 1: Write a failing repo test for `getBoardStructure`**

In `src/server/board/repo.test.ts`, add a `describe("getBoardStructure", () => { ... })` block with a test that:

1. Seeds a board with 3 columns and several cards.
2. Calls `getBoardStructure({ ownerId, boardId })`.
3. Asserts return shape: `{ id, name, updatedAt, columns: [{ id, title, position, version }, ...] }` — no cards on columns, no aggregate counts.
4. Asserts columns are ordered by `(position ASC, id ASC)`.

Add a second test that returns `null` for a board owned by someone else.

- [x] **Step 2: Run to verify it fails**

Run: `npm run test -- src/server/board/repo.test.ts`
Expected: FAIL with `getBoardStructure is not a function`.

- [x] **Step 3: Implement `getBoardStructure`**

In `src/server/board/repo.ts`, add (after `getBoardWithColumnsAndCards`):

```typescript
export type BoardStructureRow = {
  id: string;
  name: string;
  updatedAt: Date;
  columns: Array<{
    id: string;
    title: string;
    position: string;
    version: number;
  }>;
};

export async function getBoardStructure(input: {
  ownerId: string;
  boardId: string;
}): Promise<BoardStructureRow | null> {
  const [boardRow] = await db
    .select({
      id: boards.id,
      name: boards.name,
      updatedAt: boards.updatedAt,
    })
    .from(boards)
    .where(
      and(
        eq(boards.id, input.boardId),
        eq(boards.ownerId, input.ownerId),
        isNull(boards.deletedAt),
      ),
    )
    .limit(1);

  if (!boardRow) {
    return null;
  }

  const columnRows = await db
    .select({
      id: columns.id,
      title: columns.title,
      position: columns.position,
      version: columns.version,
    })
    .from(columns)
    .where(and(eq(columns.boardId, input.boardId), isNull(columns.deletedAt)))
    .orderBy(asc(columns.position), asc(columns.id));

  return {
    id: boardRow.id,
    name: boardRow.name,
    updatedAt: boardRow.updatedAt,
    columns: columnRows,
  };
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/server/board/repo.test.ts`
Expected: PASS.

- [x] **Step 5: Add service wrapper**

Open `src/server/board/service.ts` (read it first to see the existing wrapper pattern). Add `getBoardStructureForUser` mirroring the existing `getBoardWithColumnsAndCardsForUser`. The service should serialize `updatedAt` to ISO string for the wire.

- [x] **Step 6: Add tRPC procedure with input-validation test**

In `src/server/board/router.test.ts`, add a test that asserts `caller.board.getStructure({ boardId: "not-a-uuid" })` rejects with `BAD_REQUEST`.

In `src/server/trpc/routers/board.ts`, add (modeled on `getWithColumnsAndCards`):

```typescript
getStructure: protectedProcedure
  .input(z.object({ boardId: z.string().uuid() }))
  .query(({ ctx, input }) => {
    return getBoardStructureForUser(ctx.userId, input);
  }),
```

Add the import.

- [x] **Step 7: Run all server tests**

Run: `npm run test -- src/server/`
Expected: PASS.

- [x] **Step 8: Format and commit**

```bash
npx prettier --write src/server/board/repo.ts src/server/board/repo.test.ts src/server/board/service.ts src/server/trpc/routers/board.ts src/server/board/router.test.ts
git add src/server/board/repo.ts src/server/board/repo.test.ts src/server/board/service.ts src/server/trpc/routers/board.ts src/server/board/router.test.ts
git commit -m "feat(board): add getStructure endpoint returning columns without cards"
```

## Task 2.2: Build `useColumnCards` hook + droppable-key model

**Files:**

- Create: `src/features/boards/columnCards/keys.ts`
- Create: `src/features/boards/columnCards/keys.test.ts`
- Create: `src/features/boards/columnCards/useColumnCards.ts`

- [x] **Step 1: Write the failing key-derivation test**

Create `src/features/boards/columnCards/keys.test.ts`:

```typescript
import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { describeColumnSlice } from "./keys";
import type { BoardDetailSearch } from "../types";

const baseSearch: BoardDetailSearch = {
  view: "board",
  groupBy: "column",
  priority: [],
};

describe("describeColumnSlice", () => {
  it("returns one 'all' slice when grouped by column with no filter", () => {
    const slices = describeColumnSlice("col-1", baseSearch);
    assert.deepEqual(slices, [{ columnId: "col-1", mode: "all" }]);
  });

  it("returns one 'filtered' slice when grouped by column with priority filter", () => {
    const slices = describeColumnSlice("col-1", {
      ...baseSearch,
      priority: ["high", "medium"],
    });
    assert.deepEqual(slices, [
      { columnId: "col-1", mode: "filtered", priorities: ["high", "medium"] },
    ]);
  });

  it("returns one slice per priority when grouped by priority with no filter", () => {
    const slices = describeColumnSlice("col-1", {
      ...baseSearch,
      groupBy: "priority",
    });
    assert.deepEqual(slices, [
      { columnId: "col-1", mode: "priority", priority: "none" },
      { columnId: "col-1", mode: "priority", priority: "low" },
      { columnId: "col-1", mode: "priority", priority: "medium" },
      { columnId: "col-1", mode: "priority", priority: "high" },
    ]);
  });

  it("returns one slice per visible priority when grouped by priority with filter", () => {
    const slices = describeColumnSlice("col-1", {
      ...baseSearch,
      groupBy: "priority",
      priority: ["high", "medium"],
    });
    assert.deepEqual(slices, [
      { columnId: "col-1", mode: "priority", priority: "medium" },
      { columnId: "col-1", mode: "priority", priority: "high" },
    ]);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npm run test -- src/features/boards/columnCards/keys.test.ts`
Expected: FAIL — file does not exist.

- [x] **Step 3: Implement `keys.ts`**

Create `src/features/boards/columnCards/keys.ts`:

```typescript
import type { BoardDetailSearch, CardPriority } from "../types";

export type ColumnCardsSlice =
  | { columnId: string; mode: "all" }
  | { columnId: string; mode: "filtered"; priorities: CardPriority[] }
  | { columnId: string; mode: "priority"; priority: CardPriority };

const PRIORITY_RENDER_ORDER: ReadonlyArray<CardPriority> = ["none", "low", "medium", "high"];

export function describeColumnSlice(
  columnId: string,
  search: BoardDetailSearch,
): ColumnCardsSlice[] {
  if (search.groupBy === "priority") {
    const visible =
      search.priority.length === 0
        ? PRIORITY_RENDER_ORDER
        : PRIORITY_RENDER_ORDER.filter((p) => search.priority.includes(p));
    return visible.map((priority) => ({ columnId, mode: "priority", priority }));
  }

  if (search.priority.length > 0) {
    return [{ columnId, mode: "filtered", priorities: [...search.priority] }];
  }

  return [{ columnId, mode: "all" }];
}

export function sliceQueryInput(slice: ColumnCardsSlice): {
  columnId: string;
  priority?: CardPriority | CardPriority[];
  limit: number;
} {
  if (slice.mode === "priority") {
    return { columnId: slice.columnId, priority: slice.priority, limit: 100 };
  }
  if (slice.mode === "filtered") {
    return { columnId: slice.columnId, priority: slice.priorities, limit: 100 };
  }
  return { columnId: slice.columnId, limit: 100 };
}
```

Note: `limit: 100` is intentional for PR 2 — we want behavior parity with today (load everything for typical boards). PR 3 drops this to 50.

- [x] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/features/boards/columnCards/keys.test.ts`
Expected: PASS.

- [x] **Step 5: Implement `useColumnCards` hook**

Create `src/features/boards/columnCards/useColumnCards.ts`:

```typescript
import { useMemo } from "react";

import { trpc } from "../../../trpc/client";
import type { ColumnCardsSlice } from "./keys";
import { sliceQueryInput } from "./keys";

export type ColumnCardItem = {
  id: string;
  columnId: string;
  title: string;
  description: string;
  priority: import("../types").CardPriority;
  position: string;
  version: number;
  tags: Array<{ id: string; name: string; normalizedName: string }>;
};

export function useColumnCards(slice: ColumnCardsSlice) {
  const input = sliceQueryInput(slice);
  const query = trpc.card.listByColumn.useInfiniteQuery(input, {
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: false,
  });

  const items = useMemo<ColumnCardItem[]>(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) =>
      page.items.map((item) => ({
        id: item.id,
        columnId: item.columnId,
        title: item.title,
        description: item.description,
        priority: item.priority,
        position: item.position,
        version: item.version,
        tags: item.tags,
      })),
    );
  }, [query.data]);

  return {
    items,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage: query.fetchNextPage,
    error: query.error,
  };
}
```

- [x] **Step 6: Format and commit**

```bash
npx prettier --write src/features/boards/columnCards/
git add src/features/boards/columnCards/
git commit -m "feat(boards): add column slice key model and useColumnCards hook"
```

## Task 2.3: Build cache-patch helpers (the optimistic update primitives)

**Files:**

- Create: `src/features/boards/columnCards/patchCache.ts`
- Create: `src/features/boards/columnCards/patchCache.test.ts`

- [x] **Step 1: Write the failing test**

Create `src/features/boards/columnCards/patchCache.test.ts`:

```typescript
import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { applyMutation } from "./patchCache";
import type { ColumnCardItem } from "./useColumnCards";

const card = (
  id: string,
  position: string,
  priority: ColumnCardItem["priority"] = "none",
): ColumnCardItem => ({
  id,
  columnId: "col-1",
  title: id,
  description: "",
  priority,
  position,
  version: 0,
  tags: [],
});

describe("applyMutation", () => {
  it("removes a card by id", () => {
    const before = [card("a", "a"), card("b", "b"), card("c", "c")];
    const after = applyMutation(before, { type: "remove", cardId: "b" });
    assert.deepEqual(
      after.map((c) => c.id),
      ["a", "c"],
    );
  });

  it("inserts a card preserving position-sorted order", () => {
    const before = [card("a", "a"), card("c", "c")];
    const after = applyMutation(before, { type: "insert", card: card("b", "b") });
    assert.deepEqual(
      after.map((c) => c.id),
      ["a", "b", "c"],
    );
  });

  it("updates priority + position of an existing card and re-sorts", () => {
    const before = [card("a", "a"), card("b", "b"), card("c", "c")];
    const after = applyMutation(before, {
      type: "update",
      cardId: "a",
      patch: { position: "d", priority: "high" },
    });
    assert.deepEqual(
      after.map((c) => c.id),
      ["b", "c", "a"],
    );
    assert.equal(after[2]?.priority, "high");
  });

  it("returns the input unchanged when target id is not present", () => {
    const before = [card("a", "a")];
    const after = applyMutation(before, { type: "remove", cardId: "z" });
    assert.equal(after, before);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `npm run test -- src/features/boards/columnCards/patchCache.test.ts`
Expected: FAIL — file does not exist.

- [x] **Step 3: Implement `patchCache.ts`**

Create `src/features/boards/columnCards/patchCache.ts`:

```typescript
import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

import { trpc } from "../../../trpc/client";
import type { ColumnCardItem } from "./useColumnCards";
import type { ColumnCardsSlice } from "./keys";
import { sliceQueryInput } from "./keys";

export type CardMutation =
  | { type: "remove"; cardId: string }
  | { type: "insert"; card: ColumnCardItem }
  | {
      type: "update";
      cardId: string;
      patch: Partial<
        Pick<
          ColumnCardItem,
          "position" | "priority" | "version" | "title" | "description" | "columnId"
        >
      >;
    };

export function applyMutation(cards: ColumnCardItem[], mutation: CardMutation): ColumnCardItem[] {
  if (mutation.type === "remove") {
    const next = cards.filter((c) => c.id !== mutation.cardId);
    return next.length === cards.length ? cards : next;
  }
  if (mutation.type === "insert") {
    const merged = [...cards.filter((c) => c.id !== mutation.card.id), mutation.card];
    return sortByPosition(merged);
  }
  // update
  const idx = cards.findIndex((c) => c.id === mutation.cardId);
  if (idx === -1) return cards;
  const next = cards.slice();
  next[idx] = { ...next[idx]!, ...mutation.patch };
  return sortByPosition(next);
}

function sortByPosition(cards: ColumnCardItem[]): ColumnCardItem[] {
  return cards.slice().sort((a, b) => {
    if (a.position === b.position) return a.id < b.id ? -1 : 1;
    return a.position < b.position ? -1 : 1;
  });
}

type ListByColumnPage = {
  items: ColumnCardItem[];
  nextCursor: { position: string; cardId: string } | null;
};

type InfiniteData = {
  pages: ListByColumnPage[];
  pageParams: Array<unknown>;
};

export function patchSliceCache(
  queryClient: QueryClient,
  slice: ColumnCardsSlice,
  mutation: CardMutation,
): void {
  const input = sliceQueryInput(slice);
  const queryKey = getQueryKey(trpc.card.listByColumn, input, "infinite");
  queryClient.setQueryData<InfiniteData>(queryKey, (existing) => {
    if (!existing) return existing;
    const nextPages = existing.pages.map((page) => ({
      ...page,
      items: applyMutation(page.items, mutation),
    }));
    return { ...existing, pages: nextPages };
  });
}
```

Note on imports: `getQueryKey` from `@trpc/react-query` is the canonical way to derive query keys for cache patches. If your tRPC client uses a different helper, swap accordingly — verify by reading how `utils.card.listByBoard.invalidate({ boardId })` is currently wired in `BoardDetailScreen.tsx:184`.

- [x] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/features/boards/columnCards/patchCache.test.ts`
Expected: PASS.

- [x] **Step 5: Format and commit**

```bash
npx prettier --write src/features/boards/columnCards/
git add src/features/boards/columnCards/
git commit -m "feat(boards): add cache-patch helpers for per-column queries"
```

## Task 2.4: Wire `BoardDetailScreen` to structure + per-column queries

**Files:**

- Modify: `src/features/boards/BoardDetailScreen.tsx`
- Modify: `src/features/boards/types.ts` (if `LoadedBoard` needs to allow card-less columns)
- Modify: `src/features/boards/BoardCanvas/BoardLaneView.tsx`
- Modify: `src/features/boards/BoardCanvas/StaticLaneCards.tsx`
- Modify: `src/features/boards/BoardCanvas/index.tsx`
- Modify: `src/features/boards/model.ts`

This is the largest single task in the plan. It's a coordinated swap; we cannot do it incrementally without leaving the app broken. Steps go: tests first for new behavior, then the swap, then verify the whole suite passes.

- [x] **Step 1: Read existing tests that exercise the board snapshot**

```bash
ls src/features/boards/BoardCanvas.*.test.tsx
```

These tests render `BoardCanvas` directly with a `LoadedBoard` mock. They will continue to work if we keep `BoardCanvas` accepting cards via props for testing — but production wiring (`BoardDetailScreen`) will source those cards from queries. Plan accordingly: `BoardLaneView` keeps accepting `cards: ColumnCardItem[]` as a prop, and `BoardDetailScreen` injects it from `useColumnCards`.

- [x] **Step 2: Update `LoadedBoard` type in `types.ts`**

Find the `LoadedBoard` type. Make `cards` on a column **no longer required** (or split into `LoadedBoardStructure` vs `LoadedBoard` — pick whichever creates less churn). The cleanest approach:

```typescript
export type LoadedBoardColumn = {
  id: string;
  title: string;
  position: string;
  version: number;
  cards: BoardLaneCard[];
};

export type LoadedBoardStructureColumn = Omit<LoadedBoardColumn, "cards">;

export type LoadedBoardStructure = {
  id: string;
  name: string;
  updatedAt: string;
  columns: LoadedBoardStructureColumn[];
};
```

Keep `LoadedBoard` as-is for tests / legacy callers. Add `LoadedBoardStructure` for the new production path.

- [x] **Step 3: Refactor `BoardLaneView` to source cards from `useColumnCards`**

In `BoardLaneView.tsx`, replace `lane.cards` reads with the slice query. Because the existing tests pass `lane.cards` as a literal, gate the swap with a prop:

```typescript
type BoardLaneViewProps = {
  // ... existing props ...
  cards: ColumnCardItem[]; // new — caller provides
  onLoadMore?: () => void; // wired in PR 3
  hasNextPage?: boolean; // wired in PR 3
};
```

Strip out everything that read `lane.cards.length`, `lane.cards.map(...)`, etc., and replace with the new `cards` prop. The lane's `title` and `helperText` stay on `lane` (those come from structure).

- [x] **Step 4: Refactor `StaticLaneCards` similarly**

`StaticLaneCards` reads `lane.cards` — same swap. Take `cards: ColumnCardItem[]` as a prop. The grouping logic (`groupListItemsByPriority`) stays, but it operates on the prop now.

- [x] **Step 5: In `BoardDetailScreen`, swap data fetching**

Replace:

```typescript
const boardQuery = trpc.board.getWithColumnsAndCards.useQuery({ boardId }, { retry: false });
```

With:

```typescript
const structureQuery = trpc.board.getStructure.useQuery({ boardId }, { retry: false });
```

Remove `optimisticBoard` state entirely. Remove all `setOptimisticBoard(...)` calls.

In the place where `BoardCanvas` was rendered, render a new wrapper component (e.g., `BoardCanvasContainer`) that:

1. Receives `structure: LoadedBoardStructure` and `search: BoardDetailSearch`.
2. For each column, calls `describeColumnSlice(column.id, search)` and uses one `useColumnCards(slice)` per slice.
3. Passes the resolved `cards` array down to `BoardLaneView` per slice.

Sketch:

```typescript
function BoardCanvasContainer({ structure, search, ...rest }: ...) {
  return (
    <BoardCanvas
      board={{
        id: structure.id,
        name: structure.name,
        columns: structure.columns.map((col) => ({ ...col, cards: [] })), // shape stub
      }}
      search={search}
      renderColumnCards={(columnId) => {
        // For groupBy === "column", one slice; for groupBy === "priority", multiple
        const slices = describeColumnSlice(columnId, search);
        return slices.map((slice) => (
          <ColumnSliceView key={sliceKey(slice)} slice={slice} ... />
        ));
      }}
      {...rest}
    />
  );
}
```

The exact wiring depends on how much churn you want in `BoardCanvas` — there's room to either pass a `renderColumnCards` callback or inline the slice rendering inside `BoardLaneView`. Pick the smaller change.

- [x] **Step 6: Rewrite optimistic drag updates to use `patchSliceCache`**

In `BoardDetailScreen`'s `commitCardPlacement`, replace the `setOptimisticBoard(reorderBoardCards(...))` call with two `patchSliceCache(...)` calls (source and destination slices). For same-column reorders, both calls hit the same slice.

The `prevId` / `nextId` calculation moves from "neighbors in the destination column's `cards` array" to "neighbors in the destination slice's currently-loaded items." This is the correct shape per the feasibility doc — the server only needs immediate neighbors of the drop point, which are by construction loaded.

Build a small helper:

```typescript
function getNeighborIdsInLoaded(items: ColumnCardItem[], destinationIndex: number) {
  return {
    prevId: items[destinationIndex - 1]?.id ?? null,
    nextId: items[destinationIndex]?.id ?? null,
  };
}
```

On mutation success, instead of `refreshBoard()`, invalidate the affected slice queries:

```typescript
await Promise.all([
  utils.card.listByColumn.invalidate({ columnId: sourceColumnId }),
  utils.card.listByColumn.invalidate({ columnId: destinationColumnId }),
]);
```

`utils.card.listByColumn.invalidate` with a partial input should match all cursors for that column — verify by checking the tRPC v11 docs for `invalidate` partial-input behavior; if it doesn't, invalidate at the broader `utils.card.listByColumn.invalidate()` level.

- [x] **Step 7: Remove `getWithColumnsAndCards` callsite**

Search the repo:

```bash
rg "getWithColumnsAndCards" src/
```

Remove only the **frontend** callsite. Leave the server endpoint in place for now — we'll delete it in Task 2.6 once we're confident nothing else uses it.

- [x] **Step 8: Run frontend tests**

Run: `npm run test -- src/features/boards/`
Expected: existing `BoardCanvas.*.test.tsx` tests should still pass because they render `BoardCanvas` directly with the legacy `LoadedBoard` shape (cards baked in). If anything fails, the test was reaching past `BoardCanvas` into wiring — adjust the test to inject `cards` directly via the new prop.

- [x] **Step 9: Run the full suite**

Run: `npm run test`
Expected: all green.

- [ ] **Step 10: Manual smoke test**

```bash
npm run dev
```

In a browser at the dev URL:

- Open a board with cards. Verify all cards show up under the right columns.
- Drag a card within a column. Verify it sticks (no flash-back), and reload to confirm the server agrees.
- Drag a card to another column. Same checks.
- Toggle group-by between "column" and "priority". Verify cards regroup correctly.
- Toggle priority filter on/off. Verify filtering works.

State explicitly in your task summary which scenarios you exercised and which you couldn't.

- [x] **Step 11: Format and commit**

```bash
npx prettier --write src/features/boards/
git add src/features/boards/ src/server/  # if any server file got touched
git commit -m "refactor(boards): replace board snapshot with per-droppable infinite queries"
```

## Task 2.5: Delete dead `reorderBoardCards` / `setOptimisticBoard` plumbing

**Files:**

- Modify: `src/features/boards/model.ts`
- Modify: `src/features/boards/model.test.ts`

- [x] **Step 1: Find dead code**

Run: `rg "reorderBoardCards|reorderBoardColumns|getCardPosition|getColumnPosition" src/features/boards/`

For each helper, check whether it's still used after Task 2.4. Anything used only by the removed `commitCardPlacement` / `setOptimisticBoard` paths is dead.

- [x] **Step 2: Delete dead helpers and their tests**

Remove the unused functions from `model.ts` and the corresponding tests from `model.test.ts`. Keep helpers that are still used (e.g., `parseBoardDetailSearch`, `boardPriorityMeta`, `togglePrioritySelection` — those are presentation logic, not snapshot manipulation).

- [x] **Step 3: Run tests**

Run: `npm run test -- src/features/boards/`
Expected: PASS.

- [x] **Step 4: Format and commit**

```bash
npx prettier --write src/features/boards/model.ts src/features/boards/model.test.ts
git add src/features/boards/model.ts src/features/boards/model.test.ts
git commit -m "refactor(boards): remove dead board-snapshot reorder helpers"
```

## Task 2.6: Remove `board.getWithColumnsAndCards` server endpoint

**Files:**

- Modify: `src/server/board/repo.ts`
- Modify: `src/server/board/service.ts`
- Modify: `src/server/trpc/routers/board.ts`
- Modify: `src/server/board/repo.test.ts`
- Modify: `src/server/board/router.test.ts`

- [x] **Step 1: Confirm no callers**

Run: `rg "getWithColumnsAndCards|getBoardWithColumnsAndCards" src/`
Expected: no matches in `src/features/`, `src/routes/`, or anywhere outside the server file you're about to delete from.

- [x] **Step 2: Remove the procedure, service, repo function, and their tests**

Delete `getBoardWithColumnsAndCards` from `repo.ts`, `getBoardWithColumnsAndCardsForUser` from `service.ts`, the `getWithColumnsAndCards` procedure from the router, and the corresponding tests.

- [x] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS.

- [x] **Step 4: Format and commit**

```bash
npx prettier --write src/server/board/ src/server/trpc/routers/board.ts
git add src/server/
git commit -m "chore(board): remove unused getWithColumnsAndCards endpoint"
```

## Task 2.7: PR 2 wrap-up

- [x] **Step 1: Full test pass**

Run: `npm run test`
Expected: green.

- [ ] **Step 2: Manual smoke test second pass**

Re-do Step 10 from Task 2.4. Pay special attention to:

- Drag with priority filter active.
- Drag while grouped by priority.
- Reload after each drag — does the server state match the optimistic state?

- [ ] **Step 3: Push and open PR**

```bash
git push
gh pr create --title "Replace board snapshot with per-droppable infinite queries" --body "$(cat <<'EOF'
## Summary
- Frontend stops loading the full board with all cards baked in. Instead, it loads board structure (columns only) plus one infinite query per visible droppable
- Each droppable's slice key derives from `(columnId, groupBy, priorityFilter)`; tRPC's httpBatchLink collapses the parallel queries into one HTTP request
- Optimistic drag updates patch query caches per slice via `queryClient.setQueryData`, replacing the single `optimisticBoard` snapshot
- Page size is 100 in this PR (effectively "load all" for typical boards) — matches today's UX. PR 3 drops it to 50 and adds infinite scroll + virtualization

## Test plan
- [x] `npm run test` — full unit/integration suite
- [x] Manual: drag within column, across columns, while filtered, while grouped by priority
- [x] Manual: reload after each drag confirms server state matches optimistic state
EOF
)"
```

After PR merges, output the head commit hash: `Opened PR: <full-commit-hash>`.

---

# PR 3 — Virtualize columns + infinite scroll

**What ships:** Page size drops to 50. Add `react-virtuoso` for the column card list. Switch `<Droppable>` to `mode="virtual"`, add `renderClone`. Wire Virtuoso's `endReached` to `fetchNextPage`. Document a11y caveat.

## Task 3.1: Install `react-virtuoso`

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`

- [x] **Step 1: Install**

Run: `npm install react-virtuoso`
Expected: latest 4.x version installed.

- [x] **Step 2: Verify install**

Run: `npm ls react-virtuoso`
Expected: shows the installed version, no peer-dep warnings.

- [x] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-virtuoso for column virtualization"
```

## Task 3.2: Drop slice page size to 50

**Files:**

- Modify: `src/features/boards/columnCards/keys.ts`
- Modify: `src/features/boards/columnCards/keys.test.ts`

- [x] **Step 1: Update the test**

In `keys.test.ts`, add an assertion that `sliceQueryInput({ columnId: "col", mode: "all" }).limit === 50`.

- [x] **Step 2: Run to verify it fails**

Run: `npm run test -- src/features/boards/columnCards/keys.test.ts`
Expected: FAIL — limit is currently 100.

- [x] **Step 3: Change the literal in `keys.ts`**

Replace `limit: 100` with `limit: 50` in all three branches of `sliceQueryInput`.

- [x] **Step 4: Run to verify it passes**

Run: `npm run test -- src/features/boards/columnCards/keys.test.ts`
Expected: PASS.

- [x] **Step 5: Format and commit**

```bash
npx prettier --write src/features/boards/columnCards/
git add src/features/boards/columnCards/
git commit -m "feat(boards): drop column page size to 50"
```

## Task 3.3: Wrap card list in `Virtuoso` with `mode="virtual"` Droppable + `renderClone`

**Files:**

- Modify: `src/features/boards/BoardCanvas/BoardLaneView.tsx`
- Create: `src/features/boards/BoardCanvas/VirtualizedCardList.tsx`

- [x] **Step 1: Extract the virtualized card list into its own component**

Create `src/features/boards/BoardCanvas/VirtualizedCardList.tsx`. The component owns:

- The `<Droppable mode="virtual" ...>` wrapper.
- The `<Virtuoso>` instance, sized to fill its parent.
- The per-row `<Draggable>` rendering.
- `renderClone` — required by `mode="virtual"` because dragged items unmount on scroll.
- `endReached` callback that calls `onLoadMore`.

Skeleton:

```typescript
import type { DraggableProvided, DraggableRubric, DraggableStateSnapshot } from "@hello-pangea/dnd";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Virtuoso } from "react-virtuoso";

import { CardInterior } from "./CardInterior";
import type { ColumnCardItem } from "../columnCards/useColumnCards";

type Props = {
  droppableId: string;
  cards: ColumnCardItem[];
  onLoadMore: () => void;
  hasNextPage: boolean;
  // ... CardInterior callbacks (onOpen, onMove, onRenameTitle) ...
};

export function VirtualizedCardList({
  droppableId,
  cards,
  onLoadMore,
  hasNextPage,
  onOpenCard,
  onMoveCard,
  onRenameCardTitle,
}: Readonly<Props>) {
  return (
    <Droppable
      droppableId={droppableId}
      type="CARD"
      mode="virtual"
      renderClone={(provided, _snapshot, rubric) => {
        const card = cards[rubric.source.index];
        if (!card) return <div ref={provided.innerRef} {...provided.draggableProps} />;
        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            <CardInterior
              card={card}
              showColumnContext={false}
              canMove
              onOpen={() => onOpenCard(card.id)}
              onMove={onMoveCard}
              onRenameTitle={onRenameCardTitle}
            />
          </div>
        );
      }}
    >
      {(provided) => (
        <Virtuoso
          scrollerRef={provided.innerRef as (ref: HTMLElement | Window | null) => void}
          data={cards}
          endReached={() => {
            if (hasNextPage) onLoadMore();
          }}
          increaseViewportBy={400}
          itemContent={(index, card) => (
            <Draggable
              key={card.id}
              draggableId={card.id}
              index={index}
              disableInteractiveElementBlocking
            >
              {(cardProvided) => (
                <div
                  ref={cardProvided.innerRef}
                  {...cardProvided.draggableProps}
                >
                  <CardInterior
                    card={card}
                    showColumnContext={false}
                    canMove
                    dragHandleProps={cardProvided.dragHandleProps}
                    onOpen={() => onOpenCard(card.id)}
                    onMove={onMoveCard}
                    onRenameTitle={onRenameCardTitle}
                  />
                </div>
              )}
            </Draggable>
          )}
          components={{
            Footer: () => provided.placeholder ?? null,
          }}
        />
      )}
    </Droppable>
  );
}
```

Two non-obvious bits:

- `scrollerRef={provided.innerRef}` — gives `@hello-pangea/dnd` the actual scrollable container so it can detect scroll position during drag.
- `increaseViewportBy={400}` — this is the overscan the dnd virtual-list docs require. Without overscan the library can't detect items just past the visible window.

- [x] **Step 2: Use the new component in `BoardLaneView`**

In `BoardLaneView.tsx`, replace the `lane.cards.map(...)` block (the one inside the `<Droppable>` for the canReorder + isRealColumn branch) with a `<VirtualizedCardList>` instance, passing `cards`, `hasNextPage`, `onLoadMore` from props.

Also pass these new props from `BoardDetailScreen` → `BoardCanvas` → `BoardLaneView`. Wire `onLoadMore` to `fetchNextPage` from the slice's `useColumnCards`.

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

- Open a board with at least 60 cards in one column. Verify only ~20 are in the DOM at any time (inspect the column's scroll container).
- Scroll down — verify a network request fires near the bottom and more cards appear.
- Drag a card within the column. Verify it works.
- Drag a card from one column to another. Verify both source and destination behave correctly.
- Drag a card and scroll while dragging — verify the dragged card visual stays attached to the cursor (this is what `renderClone` enables).

State explicitly in the task summary which scenarios you exercised.

- [x] **Step 4: Run unit tests**

Run: `npm run test -- src/features/boards/`
Expected: existing `BoardCanvas.*.test.tsx` tests pass. Some may need adjustment if they rendered the old non-virtualized list and asserted on `lane.cards` rendering — update them to render with the new component or to mock Virtuoso via `vi.mock("react-virtuoso", ...)`.

If a test has trouble with Virtuoso in jsdom, use Vitest's `vi.mock` pattern at the top of the test file:

```typescript
vi.mock("react-virtuoso", () => ({
  Virtuoso: ({ data, itemContent }: { data: unknown[]; itemContent: (i: number, item: unknown) => unknown }) => (
    <div>{data.map((item, i) => itemContent(i, item))}</div>
  ),
}));
```

This bypasses virtualization in tests (renders all items synchronously), which is what you want for assertion-style tests. **Do not** use this mock in browser/E2E — only in jsdom unit tests.

- [x] **Step 5: Format and commit**

```bash
npx prettier --write src/features/boards/
git add src/features/boards/
git commit -m "feat(boards): virtualize column card lists with react-virtuoso + dnd virtual mode"
```

## Task 3.4: Document the a11y caveat

**Files:**

- Modify: `AGENTS.md` (the "Accessibility" section)

- [x] **Step 1: Add a note**

Append to the Accessibility section:

```markdown
- Virtualized columns (board view) only render visible cards into the DOM. Off-screen cards are not reachable by Tab, screen readers, or browser find. The keyboard move-buttons on each card remain the accessible escape hatch — they do not depend on the virtualized DOM.
```

- [x] **Step 2: Format and commit**

```bash
npx prettier --write AGENTS.md
git add AGENTS.md
git commit -m "docs: note virtualization a11y caveat for board columns"
```

## Task 3.5: PR 3 wrap-up

- [x] **Step 1: Full test pass**

Run: `npm run test`
Expected: green.

- [ ] **Step 2: Push and open PR**

```bash
git push
gh pr create --title "Virtualize columns + infinite scroll at 50 cards/page" --body "$(cat <<'EOF'
## Summary
- Add `react-virtuoso` for column card lists; `<Droppable mode="virtual">` + `renderClone` per dnd virtual-list docs
- Page size drops to 50; Virtuoso `endReached` triggers `fetchNextPage`
- Document a11y caveat: off-screen cards are not in the DOM; keyboard move-buttons remain the accessible escape hatch
- Drop-into-unloaded-region behavior: drops resolve to the immediate visible neighbors (server only needs prevCardId/nextCardId, both loaded). Dropping at the true tail of an unloaded column requires scrolling to load the tail first

## Test plan
- [x] `npm run test`
- [x] Manual: column with 60+ cards renders only ~20 in DOM, scrolling triggers next page
- [x] Manual: drag within and across columns; drag-and-scroll keeps clone attached
EOF
)"
```

After PR merges, output the head commit hash: `Opened PR: <full-commit-hash>`.

---

## Self-Review Notes

**Spec coverage:**

- ✅ Per-column pagination with cursor — PR 1 + PR 2
- ✅ 50 cards per page — PR 3 Task 3.2
- ✅ Load more on scroll near bottom — PR 3 Task 3.3 via Virtuoso `endReached`
- ✅ DnD virtualization (`mode="virtual"` + `renderClone` + overscan) — PR 3 Task 3.3
- ✅ Per-(column × priority) queries when grouped by priority — PR 2 Task 2.2 via `describeColumnSlice`
- ✅ Server-side priority filter when grouped by column — PR 2 Task 2.2 via `mode: "filtered"` slice
- ✅ tRPC batching reduces network roundtrips — inherited automatically from existing `httpBatchLink` setup; no extra work
- ✅ A11y caveat documented — PR 3 Task 3.4

**Drop-into-unloaded-region** (the product decision from feasibility): plan picks the implicit option — drops resolve to visible neighbors. If user feedback later indicates a need for "drop at end of an unloaded column," that's a follow-up PR (out of scope here).

**Things this plan deliberately doesn't do:**

- Optimize the 4-queries-per-column server load with a single `ROW_NUMBER() OVER (PARTITION BY ...)` query. Naive approach first; optimize if profiling shows a problem.
- Add a per-priority count badge for the empty-section problem (Option 3 from the feasibility). If users complain that "High shows 0 but I know I have high cards down there," that's a future PR.
- Move tag filter to per-column queries. Today, tag filter only affects the list view (`card.listByBoard`), not the board view, so this stays out of scope.
