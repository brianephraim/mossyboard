# Replace Card Subtasks With Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the card subtasks feature in its entirety, replace it with an account-scoped many-to-many tags feature with auto-derived swatch colors, displayed as a wrapping pill row on each card with a Tamagui popover for add and per-pill `×` for detach, plus a drawer-only filter.

**Architecture:** Two new tables (`tags`, `card_tags`) with composite PK on the join. New tRPC `tag` router with `list` / `addToCard` / `detachFromCard`. Atomic find-or-create + casing-rewrite-on-typed-input + attach in one transaction. Card hydration extended with a `tags` array. New `CardTagsRow` Tamagui component used identically on the canvas card and in the card-detail modal. Drawer filter extends `BoardDetailSearch` with a `tags: string[]` URL param carrying normalized names. Board reordering disabled when the tag filter is active (parity with priority). The drag-threshold `onMouseDown` gesture used by the existing priority popover is extracted into a `useDragSafePress` hook so the new tag-add button uses the same code path.

**Tech Stack:** TypeScript, Drizzle ORM (Postgres), tRPC v11, zod, React, Tamagui (`@tamagui/popover`, `@tamagui/stacks`, `@tamagui/input`, `@tamagui/core`), `@hello-pangea/dnd`, react-hook-form (already wired to existing card surfaces), Vitest + `node:assert/strict` + `@testing-library/react` + jsdom.

**Spec:** [docs/superpowers/specs/2026-04-26-replace-card-subtasks-with-tags-design.md](../specs/2026-04-26-replace-card-subtasks-with-tags-design.md). When in doubt about a behavior, the spec is canonical.

---

## File structure / units

**Delete:**

- `src/server/subtask/` (entire directory: `repo.ts`, `repo.test.ts`, `service.ts`, `router.test.ts`).
- `src/server/trpc/routers/subtask.ts`.

**Create:**

- `drizzle/pg/0006_*.sql` — single migration: drop `card_subtasks`; create `tags` + `card_tags` with RLS deny-all policies.
  - Drizzle generates the base; the agent appends RLS by hand (drizzle-kit does not emit RLS).
- `src/server/tag/repo.ts` — data layer (`listTagsForOwner`, `addTagToCard`, `detachTagFromCard`, `listTagsForCards`).
- `src/server/tag/service.ts` — owner-scoping wrappers.
- `src/server/tag/repo.test.ts`, `src/server/tag/router.test.ts`.
- `src/server/trpc/routers/tag.ts`.
- `src/features/boards/tagPalette.ts` — FNV-1a hash + 8-swatch lookup.
- `src/features/boards/BoardCanvas/useDragSafePress.ts` — extracted gesture hook (5 px threshold).
- `src/features/boards/BoardCanvas/CardTagsRow.tsx` — pill row + popover + plus button.
- `src/features/boards/BoardCanvas.tag-row.test.tsx`.
- `src/features/boards/useTagMutations.ts` — `addTag`/`detachTag` wrappers + invalidation set.

**Modify:**

- `src/server/db/schema.ts` — drop `cardSubtasks` and `cardSubtasksRelations`; add `tags`, `cardTags`, their relations, `tags: many(cardTags)` on `cardsRelations`.
- `src/server/board/repo-shared.ts` — drop subtask helpers; add `getOwnedTag`, `lockOwnedTag`, `listTagsForCards`.
- `src/server/board/repo.ts` — board soft-delete cascades hard-delete `card_tags` for descendant cards.
- `src/server/board/repo.test.ts` — subtask cascade test → tag cascade test.
- `src/server/card/repo.ts` — `CardDetailRow.subtasks` → `tags`; `getCard` join swap; `softDeleteCard` cascade; `listCardsByBoard` accepts `tags?: string[]` and bulk-hydrates `tags` on each row.
- `src/server/card/repo.test.ts` — assertion swaps + new `listCardsByBoard` filter test.
- `src/server/trpc/router.ts` — drop `subtask: subtaskRouter`, add `tag: tagRouter`.
- `src/server/trpc/routers/card.ts` — add `tags` to `listByBoard.input` zod schema.
- `src/features/boards/types.ts` — `BoardDetailSearch.tags`; remove `SubtaskSummary`.
- `src/features/boards/model.ts` + `model.test.ts` — `parseTagFilter` / `serializeTagFilter` / `toggleTagSelection`; extend `parseBoardDetailSearch`, `buildBoardLanes`, `canReorderBoard`.
- `src/features/boards/BoardCanvas/CardInterior.tsx` — accept tag props, render `<CardTagsRow />`, refactor priority gesture to `useDragSafePress`.
- `src/features/boards/BoardCanvas/index.tsx`, `BoardCanvas/BoardLaneView.tsx`, `BoardCanvas/StaticLaneCards.tsx`, `BoardCanvas/BoardColumnsLayout.tsx` (and any other lane fan-out file) — thread `availableTags` / `attachedTags` / `onAddTag` / `onDetachTag` down to `CardInterior` / `CardPreview`.
- `src/features/boards/BoardDetailScreen.tsx` — load `trpc.tag.list`, plumb props down, swap "subtasks" copy → "tags".
- `src/features/boards/BoardWorkspaceScreen.tsx` — same plumbing.
- `src/features/boards/BoardDrawer.tsx` — add Tags filter section.
- `src/features/boards/CardDetailSurface.tsx` — full subtasks removal + tags `BoardSurface`.
- Tamagui config file housing `$boardPriorityHighBg` etc. — add 8 token pairs (`$boardTagSwatch1Bg/Text` … `$boardTagSwatch8Bg/Text`) for light + dark.

**Touch-up sweep:** `rg "subtask" docs/` and update prose in any `docs/ux-specs/*.md` or `docs/kanban-*.md` that mentions subtasks.

---

## Conventions for every task

- Format every modified/created file: `npx prettier --write <path>` before commit.
- Tests run via `npm run test` (Vitest). Always green before commit.
- Type-check via `npm run typecheck` (`tsc --noEmit`). Always clean before commit.
- Commits use the project's prefix style: `feat(...)`, `fix(...)`, `refactor(...)`, `test(...)`, `docs(...)`.
- Every git commit ends with the trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- Each git commit message body is created via heredoc (per the project's commit conventions).

---

## Progress tracking — read this before starting

**This plan IS the worklog.** The agent updates it as it goes:

- After completing each step, edit this file and change `- [ ]` to `- [x]` for that step.
- The plan file gets staged with every commit. The `git add -A` invocations shown in the commit steps already pick it up — do not re-stage manually. The result: every task's commit captures both the code changes and the just-ticked checkboxes in one snapshot.
- Never tick a box for a step you haven't actually finished. Never untick a box.
- If you need to abort mid-task, leave already-finished steps ticked and stop. The next runner picks up at the first unticked box.

**Commit cadence:** every task ends with at least one commit. Tasks 5, 6, and 11 have multiple intermediate commits at safe save-points so progress lands in git frequently. Each commit must leave the working tree on a clean green build (typecheck clean, tests passing). No broken intermediate commits — if a save-point can't keep the build green, fold it into the next commit instead.

**Save-point rule:** a commit step can run only after the most recent typecheck and test step both finished green. If you got here without running them, run them first; do not commit a build you haven't verified.

---

## Task 1: Demolition — remove every trace of subtasks (DB schema + server code + frontend code, single commit)

Subtasks must come out atomically: the schema entry, the server module, the route, all UI references, and the typed shape on `CardDetailRow` are mutually dependent. Splitting into smaller commits leaves the codebase failing typecheck mid-way. This task does the entire demolition in one commit, leaving a green build with no subtasks anywhere and tags not yet introduced.

**Files:**

- Modify: `src/server/db/schema.ts`
- Delete: `src/server/subtask/repo.ts`, `src/server/subtask/repo.test.ts`, `src/server/subtask/service.ts`, `src/server/subtask/router.test.ts`, `src/server/trpc/routers/subtask.ts`
- Modify: `src/server/trpc/router.ts`, `src/server/board/repo-shared.ts`, `src/server/card/repo.ts`, `src/server/card/repo.test.ts`, `src/server/board/repo.ts`, `src/server/board/repo.test.ts`
- Modify: `src/features/boards/types.ts`, `src/features/boards/CardDetailSurface.tsx`, `src/features/boards/BoardDetailScreen.tsx`
- Create: `drizzle/pg/0006_*.sql` (drizzle-generated; we discard it after this task and let Task 2 own the new migration; see Step 11 note)

- [x] **Step 1: Edit `src/server/db/schema.ts` to remove the `cardSubtasks` table and `cardSubtasksRelations`, and remove `subtasks: many(cardSubtasks)` from `cardsRelations`**

Open `src/server/db/schema.ts`. Delete the entire `cardSubtasks` `pgTable(...)` block (currently around lines 121–139). Delete `cardSubtasksRelations` (currently around lines 161–166). Inside `cardsRelations`, remove the `subtasks: many(cardSubtasks),` line so `cardsRelations` becomes:

```ts
export const cardsRelations = relations(cards, ({ one }) => ({
  column: one(columns, {
    fields: [cards.columnId],
    references: [columns.id],
  }),
}));
```

Update imports at the top: drop `boolean` if no longer used after removing `cardSubtasks`. (Keep all other imports as-is.)

- [x] **Step 2: Delete the entire `src/server/subtask/` directory and the subtask router file**

```bash
rm -rf src/server/subtask
rm src/server/trpc/routers/subtask.ts
```

- [x] **Step 3: Edit `src/server/trpc/router.ts` to drop the subtask wire-up**

Remove the import `import { subtaskRouter } from "./routers/subtask";` and remove the `subtask: subtaskRouter,` line inside `t.router({...})`. The `appRouter` should now expose `board`, `card`, `column`, `counter`, `protectedEcho`, `authEmail`, `health`, `echo` — but no `subtask`.

- [x] **Step 4: Edit `src/server/board/repo-shared.ts` to drop subtask helpers**

Remove these three exports entirely:

- `getOwnedSubtask` (currently around lines 96–129)
- `lockOwnedSubtask` (currently around lines 195–229)
- `listActiveSubtasksForCard` (currently around lines 277–289)

Remove `cardSubtasks` from the import line at the top: change `import { boards, cards, cardSubtasks, columns } from "../db/schema";` to `import { boards, cards, columns } from "../db/schema";`.

- [x] **Step 5: Edit `src/server/card/repo.ts` to remove the `subtasks` field and its hydration**

In `CardDetailRow` (around lines 18–35), delete the `subtasks: Array<{ ... }>` field so the type becomes:

```ts
export type CardDetailRow = {
  id: string;
  columnId: string;
  columnTitle: string;
  title: string;
  description: string;
  priority: CardPriority;
  position: string;
  version: number;
  updatedAt: Date;
};
```

In the `getCard` function (around lines 225–266), delete the entire `const subtasks = await db.select(...)...` block (currently lines 242–252) and remove the trailing `subtasks,` from the returned object literal so `getCard` returns the bare card row with no subtasks key.

In `softDeleteCard` (around lines 165–223), delete the cascading update on `cardSubtasks` (currently lines 208–214):

```ts
await tx
  .update(cardSubtasks)
  .set({
    deletedAt: now,
    updatedAt: now,
  })
  .where(and(eq(cardSubtasks.cardId, lockedCard.id), isNull(cardSubtasks.deletedAt)));
```

Remove `cardSubtasks` from the import line at the top: `import { boards, cards, cardSubtasks, type CardPriority, columns } from "../db/schema";` → `import { boards, cards, type CardPriority, columns } from "../db/schema";`.

- [x] **Step 6: Edit `src/server/card/repo.test.ts` to remove the subtasks assertion**

Find the line `assert.equal(detail?.subtasks.length, 0);` (around line 76) and delete it entirely.

- [x] **Step 7: Edit `src/server/board/repo.test.ts` to remove the subtask cascade test**

Find the test that imports `createSubtask` (around line 60) and asserts on a `subtaskRow` (around line 114). Delete the entire `it("renames and soft-deletes a board with descendant cards and subtasks", async () => { ... })` test. Tag-cascade coverage will be added in Task 5.

- [x] **Step 8: Edit `src/features/boards/types.ts` to remove `SubtaskSummary`**

Delete the `export type SubtaskSummary = ...` line entirely.

- [x] **Step 9: Edit `src/features/boards/CardDetailSurface.tsx` to rip out every subtask reference**

This is the largest UI demolition. Make the following edits in `src/features/boards/CardDetailSurface.tsx`:

a. Remove the imports that exist only for subtasks. After the change, remove `Checkbox` from `@tamagui/checkbox` (delete the line). Remove `Input` from `@tamagui/input` (delete the line). Remove `tamaguiInputValueOnChange` from `../../tamaguiRhfWebField` (delete the line). These will be re-added in later tasks if needed.

b. Inside the component body, delete these state declarations:

```tsx
const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
```

c. Delete these four mutation declarations entirely:

```tsx
const createSubtask = trpc.subtask.create.useMutation({...});
const updateSubtask = trpc.subtask.update.useMutation({...});
const toggleSubtask = trpc.subtask.toggle.useMutation({...});
const deleteSubtask = trpc.subtask.softDelete.useMutation({...});
```

d. Update all three `<PrettyModalWrap ... description="..." />` call sites: change `description="Edit title, description, priority, and subtasks from this surface."` to `description="Edit title, description, priority, and tags from this surface."`.

e. Delete the line `const completedCount = card.subtasks.filter((subtask) => subtask.isDone).length;` (around line 218).

f. Inside the `<XStack gap="$2" flexWrap="wrap">` between the priority field and the action buttons (around lines 301–304), delete the entire `<BoardPill>{completedCount} complete subtasks</BoardPill>` element so only the column-title pill remains:

```tsx
<XStack gap="$2" flexWrap="wrap">
  <BoardPill>{card.columnTitle}</BoardPill>
</XStack>
```

g. Delete the entire second `<BoardSurface padding="$4"> ... </BoardSurface>` panel (currently lines 351–496) — the subtasks header, input row, list, and per-subtask render. Do not replace it yet (Task 13 will add the new tags panel).

After this step, the file should contain only the form panel — no subtasks panel. Verify there are zero remaining `subtask` (case-insensitive) string occurrences in the file.

- [x] **Step 10: Edit `src/features/boards/BoardDetailScreen.tsx` to drop the subtasks word in the delete-board copy**

Find the line "Deleting a board removes its columns, cards, and subtasks from the active workspace." (around line 1112) and change it to "Deleting a board removes its columns and cards from the active workspace." (Tags follow cards transitively; no need to call them out in delete-board copy.)

- [x] **Step 11: Generate a migration that drops `card_subtasks`**

```bash
npm run db:generate
```

Drizzle-kit produces a new file `drizzle/pg/0006_<slug>.sql` containing only the drop. Inspect the file:

```bash
ls drizzle/pg/ | tail -3
cat drizzle/pg/0006_*.sql
```

Expected content (slug will vary):

```sql
DROP TABLE "card_subtasks" CASCADE;--> statement-breakpoint
```

Note: do NOT run `db:migrate` yet — Task 2 will replace this migration with a single combined migration that drops `card_subtasks` AND creates `tags` + `card_tags`, so we don't end up with two consecutive migrations that share one logical change. Delete the just-generated `0006_*.sql` file:

```bash
rm drizzle/pg/0006_*.sql
```

Also drop the corresponding entry from `drizzle/pg/meta/_journal.json`:

```bash
node -e '
const fs = require("node:fs");
const path = "drizzle/pg/meta/_journal.json";
const j = JSON.parse(fs.readFileSync(path, "utf8"));
j.entries = j.entries.filter((e) => e.idx !== 6);
fs.writeFileSync(path, JSON.stringify(j, null, 2) + "\n");
'
```

And remove any `0006_snapshot.json` that drizzle wrote into `drizzle/pg/meta/`:

```bash
rm -f drizzle/pg/meta/0006_snapshot.json
```

- [x] **Step 12: Format every touched file**

```bash
npx prettier --write \
  src/server/db/schema.ts \
  src/server/trpc/router.ts \
  src/server/board/repo-shared.ts \
  src/server/card/repo.ts \
  src/server/card/repo.test.ts \
  src/server/board/repo.test.ts \
  src/features/boards/types.ts \
  src/features/boards/CardDetailSurface.tsx \
  src/features/boards/BoardDetailScreen.tsx
```

- [x] **Step 13: Run typecheck — expect green**

```bash
npm run typecheck
```

Expected: clean. If anything still references `subtasks`, `cardSubtasks`, `SubtaskSummary`, `subtaskRouter`, or any subtask-related symbol, fix the residual reference before moving on.

- [x] **Step 14: Run tests — expect green**

```bash
npm run test
```

Expected: pass. Subtask tests are gone (their files were deleted). The test DB will still have a `card_subtasks` table (we haven't run a migration that drops it), but the test code no longer references it, so this is fine until Task 2.

- [x] **Step 15: Commit demolition**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(boards): remove subtasks feature ahead of tags rewrite

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `tags` and `card_tags` schema, generate migration, hand-edit RLS, apply

This task introduces the new schema entries to drizzle, has drizzle generate the migration, then appends the RLS deny-all policies (drizzle does not emit those). After this task the database is at its final shape and TypeScript types compile.

**Files:**

- Modify: `src/server/db/schema.ts`
- Create: `drizzle/pg/0006_*.sql` (drizzle-generated, hand-edited to add RLS)

- [x] **Step 1: Add `tags` and `cardTags` tables and relations to `src/server/db/schema.ts`**

Append to `src/server/db/schema.ts` (after `cards` table and `cardsRelations`):

```ts
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    ownerNormalizedUnique: uniqueIndex("tags_owner_normalized_unique").on(
      t.ownerId,
      t.normalizedName,
    ),
  }),
);

export const cardTags = pgTable(
  "card_tags",
  {
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.cardId, t.tagId] }),
    tagIdx: index("card_tags_tag_idx").on(t.tagId),
    cardIdx: index("card_tags_card_idx").on(t.cardId),
  }),
);

export const tagsRelations = relations(tags, ({ many }) => ({
  cardTags: many(cardTags),
}));

export const cardTagsRelations = relations(cardTags, ({ one }) => ({
  card: one(cards, {
    fields: [cardTags.cardId],
    references: [cards.id],
  }),
  tag: one(tags, {
    fields: [cardTags.tagId],
    references: [tags.id],
  }),
}));
```

Update `cardsRelations` to include the join:

```ts
export const cardsRelations = relations(cards, ({ one, many }) => ({
  column: one(columns, {
    fields: [cards.columnId],
    references: [columns.id],
  }),
  cardTags: many(cardTags),
}));
```

Add `primaryKey` to the imports from `drizzle-orm/pg-core` at the top of the file:

```ts
import {
  bigint,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
```

(Note: `boolean` was already removed in Task 1. Confirm no other unused imports.)

The unique index on `(owner_id, normalized_name)` is intentionally a full unique constraint — duplicates among soft-deleted rows are allowed only because no UI deletes tags in this cut, so soft-deletion is dormant. If the future adds tag deletion, the index should become a partial index `WHERE deleted_at IS NULL` (drizzle-kit supports `where` on indexes).

- [x] **Step 2: Generate the migration**

```bash
npm run db:generate
```

This produces `drizzle/pg/0006_<slug>.sql`. Verify:

```bash
ls drizzle/pg/ | tail -3
```

The file should contain `DROP TABLE "card_subtasks"`, `CREATE TABLE "tags"`, `CREATE TABLE "card_tags"`, and the unique/secondary indexes.

- [x] **Step 3: Hand-edit the generated migration to append RLS**

Open `drizzle/pg/0006_*.sql` and append (after drizzle's emitted statements):

```sql
ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."card_tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tags_select_none" ON "public"."tags" FOR SELECT TO anon, authenticated USING (false);
--> statement-breakpoint
CREATE POLICY "tags_insert_none" ON "public"."tags" FOR INSERT TO anon, authenticated WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "tags_update_none" ON "public"."tags" FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "tags_delete_none" ON "public"."tags" FOR DELETE TO anon, authenticated USING (false);
--> statement-breakpoint
CREATE POLICY "card_tags_select_none" ON "public"."card_tags" FOR SELECT TO anon, authenticated USING (false);
--> statement-breakpoint
CREATE POLICY "card_tags_insert_none" ON "public"."card_tags" FOR INSERT TO anon, authenticated WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "card_tags_update_none" ON "public"."card_tags" FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "card_tags_delete_none" ON "public"."card_tags" FOR DELETE TO anon, authenticated USING (false);
```

This matches the pattern from `drizzle/pg/0005_illegal_ultragirl.sql` (existing convention).

- [x] **Step 4: Run the migration on the dev DB**

```bash
npm run db:migrate
```

Expected: success. Then verify tables exist:

```bash
psql "$DATABASE_URL" -c "\d tags" -c "\d card_tags"
```

Expected: both tables listed with the columns from the schema.

- [x] **Step 5: Format the schema file**

```bash
npx prettier --write src/server/db/schema.ts
```

- [x] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [x] **Step 7: Run tests**

```bash
npm run test
```

Expected: pass. The new tables exist in the test DB after `migrateTestDb()` runs (test setup picks up the new migration automatically).

- [x] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(db): add tags and card_tags tables with RLS deny-all

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add tag repo helpers in `repo-shared.ts` and tag service module

**Files:**

- Modify: `src/server/board/repo-shared.ts`
- Create: `src/server/tag/repo.ts`
- Create: `src/server/tag/service.ts`

- [x] **Step 1: Add `getOwnedTag`, `lockOwnedTag`, `listTagsForCards` to `src/server/board/repo-shared.ts`**

At the top of the file, update the schema import:

```ts
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { boards, cards, cardTags, columns, tags } from "../db/schema";
```

Append these helpers to the bottom of the file:

```ts
export async function getOwnedTag(
  executor: DatabaseExecutor,
  input: { ownerId: string; tagId: string },
) {
  const [row] = await executor
    .select({
      id: tags.id,
      ownerId: tags.ownerId,
      name: tags.name,
      normalizedName: tags.normalizedName,
      version: tags.version,
      updatedAt: tags.updatedAt,
    })
    .from(tags)
    .where(and(eq(tags.id, input.tagId), eq(tags.ownerId, input.ownerId), isNull(tags.deletedAt)))
    .limit(1);

  return row ?? null;
}

export async function lockOwnedTag(
  tx: DatabaseTransaction,
  input: { ownerId: string; tagId: string },
) {
  const [row] = await tx
    .select({
      id: tags.id,
      ownerId: tags.ownerId,
      name: tags.name,
      normalizedName: tags.normalizedName,
      version: tags.version,
      updatedAt: tags.updatedAt,
    })
    .from(tags)
    .where(and(eq(tags.id, input.tagId), eq(tags.ownerId, input.ownerId), isNull(tags.deletedAt)))
    .for("update")
    .limit(1);

  return row ?? null;
}

export async function listTagsForCards(
  executor: DatabaseExecutor,
  input: { ownerId: string; cardIds: string[] },
): Promise<Map<string, Array<{ id: string; name: string; normalizedName: string }>>> {
  const result = new Map<string, Array<{ id: string; name: string; normalizedName: string }>>();
  if (input.cardIds.length === 0) return result;

  const rows = await executor
    .select({
      cardId: cardTags.cardId,
      id: tags.id,
      name: tags.name,
      normalizedName: tags.normalizedName,
      createdAt: cardTags.createdAt,
    })
    .from(cardTags)
    .innerJoin(tags, eq(tags.id, cardTags.tagId))
    .where(
      and(
        inArray(cardTags.cardId, input.cardIds),
        eq(tags.ownerId, input.ownerId),
        isNull(tags.deletedAt),
      ),
    )
    .orderBy(asc(cardTags.createdAt), asc(tags.id));

  for (const row of rows) {
    const list = result.get(row.cardId) ?? [];
    list.push({ id: row.id, name: row.name, normalizedName: row.normalizedName });
    result.set(row.cardId, list);
  }

  return result;
}
```

- [x] **Step 2: Create `src/server/tag/repo.ts`**

```ts
import { randomUUID } from "node:crypto";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "../db/client";
import { cardTags, tags } from "../db/schema";
import {
  getOwnedCard,
  lockOwnedCard,
  listTagsForCards,
  touchBoard,
  touchCard,
} from "../board/repo-shared";
import { trpcErrors } from "../trpc/init";

export type TagRow = {
  id: string;
  name: string;
  normalizedName: string;
  version: number;
};

export const TAG_NAME_MAX_LENGTH = 40;
export const PER_CARD_TAG_LIMIT = 20;

function normalize(rawName: string): { trimmed: string; normalized: string } {
  const trimmed = rawName.trim();
  const normalized = trimmed.toLowerCase();
  return { trimmed, normalized };
}

export async function listTagsForOwner(input: { ownerId: string }): Promise<TagRow[]> {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      normalizedName: tags.normalizedName,
      version: tags.version,
    })
    .from(tags)
    .where(and(eq(tags.ownerId, input.ownerId), isNull(tags.deletedAt)))
    .orderBy(asc(tags.name), asc(tags.id));
}

export async function addTagToCard(input: {
  ownerId: string;
  cardId: string;
  rawName: string;
}): Promise<{ tagId: string }> {
  const { trimmed, normalized } = normalize(input.rawName);
  if (trimmed.length === 0) {
    throw trpcErrors.badRequest("Tag name cannot be empty");
  }
  if (trimmed.length > TAG_NAME_MAX_LENGTH) {
    throw trpcErrors.badRequest(`Tag name cannot exceed ${TAG_NAME_MAX_LENGTH} characters`);
  }
  if (trimmed.includes(",")) {
    throw trpcErrors.badRequest("Tag name cannot contain a comma");
  }

  return db.transaction(async (tx) => {
    const lockedCard = await lockOwnedCard(tx, {
      ownerId: input.ownerId,
      cardId: input.cardId,
    });
    if (!lockedCard) {
      throw trpcErrors.notFound("Card not found");
    }

    const [existingTag] = await tx
      .select({
        id: tags.id,
        name: tags.name,
        normalizedName: tags.normalizedName,
        version: tags.version,
      })
      .from(tags)
      .where(
        and(
          eq(tags.ownerId, input.ownerId),
          eq(tags.normalizedName, normalized),
          isNull(tags.deletedAt),
        ),
      )
      .for("update")
      .limit(1);

    const now = new Date();
    let tagId: string;

    if (existingTag) {
      tagId = existingTag.id;
      if (existingTag.name !== trimmed) {
        await tx
          .update(tags)
          .set({
            name: trimmed,
            version: existingTag.version + 1,
            updatedAt: now,
          })
          .where(eq(tags.id, existingTag.id));
      }
    } else {
      tagId = randomUUID();
      await tx.insert(tags).values({
        id: tagId,
        ownerId: input.ownerId,
        name: trimmed,
        normalizedName: normalized,
        version: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx
      .insert(cardTags)
      .values({
        cardId: lockedCard.id,
        tagId,
        createdAt: now,
      })
      .onConflictDoNothing();

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(cardTags)
      .where(eq(cardTags.cardId, lockedCard.id));

    if (count > PER_CARD_TAG_LIMIT) {
      throw trpcErrors.badRequest(`A card can have at most ${PER_CARD_TAG_LIMIT} tags`);
    }

    await touchCard(tx, { cardId: lockedCard.id, now });
    await touchBoard(tx, { boardId: lockedCard.boardId, now });

    return { tagId };
  });
}

export async function detachTagFromCard(input: {
  ownerId: string;
  cardId: string;
  tagId: string;
}): Promise<{ detached: boolean }> {
  return db.transaction(async (tx) => {
    const lockedCard = await lockOwnedCard(tx, {
      ownerId: input.ownerId,
      cardId: input.cardId,
    });
    if (!lockedCard) {
      throw trpcErrors.notFound("Card not found");
    }

    const [ownedTag] = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.id, input.tagId), eq(tags.ownerId, input.ownerId), isNull(tags.deletedAt)))
      .limit(1);

    if (!ownedTag) {
      // Idempotent: detaching a non-existent (or non-owned) tag is a no-op.
      return { detached: false };
    }

    const result = await tx
      .delete(cardTags)
      .where(and(eq(cardTags.cardId, lockedCard.id), eq(cardTags.tagId, ownedTag.id)));

    const detached = (result.rowCount ?? 0) > 0;

    if (detached) {
      const now = new Date();
      await touchCard(tx, { cardId: lockedCard.id, now });
      await touchBoard(tx, { boardId: lockedCard.boardId, now });
    }

    return { detached };
  });
}

export { listTagsForCards };
```

Notes for the implementer:

- `trpcErrors.badRequest` / `trpcErrors.notFound` / `trpcErrors.conflict` already exist in `src/server/trpc/init.ts`. If `badRequest` is not exported, follow the existing convention used in `card/repo.ts` and re-throw a `TRPCError` directly with code `"BAD_REQUEST"`.
- `result.rowCount` — drizzle's `delete` returns a result whose shape depends on driver. If `rowCount` isn't available on this driver, capture the deleted rows via `.returning({ cardId: cardTags.cardId })` and check length.

- [x] **Step 3: Create `src/server/tag/service.ts`**

```ts
import { addTagToCard, detachTagFromCard, listTagsForOwner, type TagRow } from "./repo";

export function listTagsForUser(ownerId: string): Promise<TagRow[]> {
  return listTagsForOwner({ ownerId });
}

export function addTagToCardForUser(
  ownerId: string,
  input: { cardId: string; name: string },
): Promise<{ tagId: string }> {
  return addTagToCard({
    ownerId,
    cardId: input.cardId,
    rawName: input.name,
  });
}

export function detachTagFromCardForUser(
  ownerId: string,
  input: { cardId: string; tagId: string },
): Promise<{ detached: boolean }> {
  return detachTagFromCard({
    ownerId,
    cardId: input.cardId,
    tagId: input.tagId,
  });
}
```

- [x] **Step 4: Format**

```bash
npx prettier --write \
  src/server/board/repo-shared.ts \
  src/server/tag/repo.ts \
  src/server/tag/service.ts
```

- [x] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: clean. (No tests yet — that's Task 4.)

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(server): add tag repo, service, and shared helpers

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: TDD the tag repo (`src/server/tag/repo.test.ts`)

**Files:**

- Create: `src/server/tag/repo.test.ts`

This task writes the full repo test suite up front (the tests already match the implementation done in Task 3 — TDD ordering is inverted because the next test would have caught issues with the tx logic in step ordering).

- [ ] **Step 1: Examine an existing repo test for setup pattern**

```bash
sed -n '1,80p' src/server/card/repo.test.ts
```

Look at how the test file imports test helpers (`migrateTestDb`, owner-id factory, card factory). Mirror that setup style in the new file.

- [ ] **Step 2: Create `src/server/tag/repo.test.ts` with the full suite**

```ts
import { strict as assert } from "node:assert";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { cardTags, tags } from "../db/schema";
import {
  migrateTestDb,
  withFreshOwner,
  insertBoard,
  insertColumn,
  insertCard,
} from "../testing/database";
import {
  addTagToCard,
  detachTagFromCard,
  listTagsForOwner,
  PER_CARD_TAG_LIMIT,
  TAG_NAME_MAX_LENGTH,
} from "./repo";
import { listTagsForCards } from "../board/repo-shared";

beforeAll(async () => {
  await migrateTestDb();
});

beforeEach(async () => {
  // testing/database harness handles per-test isolation; if not, truncate here.
});

describe("addTagToCard", () => {
  it("creates a tag and attaches it to the card", async () => {
    const { ownerId, cardId } = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "Card" });
      return { ownerId, cardId };
    });

    const { tagId } = await addTagToCard({ ownerId, cardId, rawName: "Bug" });

    const allTags = await listTagsForOwner({ ownerId });
    assert.equal(allTags.length, 1);
    assert.equal(allTags[0].id, tagId);
    assert.equal(allTags[0].name, "Bug");
    assert.equal(allTags[0].normalizedName, "bug");
    assert.equal(allTags[0].version, 0);

    const attached = await listTagsForCards(db, { ownerId, cardIds: [cardId] });
    assert.equal(attached.get(cardId)?.length, 1);
    assert.equal(attached.get(cardId)?.[0].id, tagId);
  });

  it("dedupes case-insensitively and rewrites casing globally on typed re-add", async () => {
    const { ownerId, cardA, cardB } = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardA = await insertCard({ columnId, title: "A" });
      const cardB = await insertCard({ columnId, title: "B" });
      return { ownerId, cardA, cardB };
    });

    const { tagId: idA } = await addTagToCard({ ownerId, cardId: cardA, rawName: "Bug" });
    const { tagId: idB } = await addTagToCard({ ownerId, cardId: cardB, rawName: "bug" });

    assert.equal(idA, idB, "second add should reuse the same tag row");

    const all = await listTagsForOwner({ ownerId });
    assert.equal(all.length, 1);
    assert.equal(all[0].name, "bug", "name should reflect the latest typed casing");
    assert.equal(all[0].version, 1, "casing rewrite increments version");
  });

  it("preserves casing when the existing display already matches", async () => {
    const { ownerId, cardA, cardB } = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardA = await insertCard({ columnId, title: "A" });
      const cardB = await insertCard({ columnId, title: "B" });
      return { ownerId, cardA, cardB };
    });

    await addTagToCard({ ownerId, cardId: cardA, rawName: "Bug" });
    await addTagToCard({ ownerId, cardId: cardB, rawName: "Bug" });

    const all = await listTagsForOwner({ ownerId });
    assert.equal(all[0].version, 0, "no rewrite, version stays at 0");
  });

  it("treats inner whitespace as significant", async () => {
    const { ownerId, cardId } = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "C" });
      return { ownerId, cardId };
    });

    await addTagToCard({ ownerId, cardId, rawName: "BlackCat" });
    await addTagToCard({ ownerId, cardId, rawName: "Black Cat" });

    const all = await listTagsForOwner({ ownerId });
    assert.equal(all.length, 2);
  });

  it("trims surrounding whitespace before normalizing", async () => {
    const { ownerId, cardId } = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "C" });
      return { ownerId, cardId };
    });

    await addTagToCard({ ownerId, cardId, rawName: "  Frontend  " });

    const all = await listTagsForOwner({ ownerId });
    assert.equal(all[0].name, "Frontend");
    assert.equal(all[0].normalizedName, "frontend");
  });

  it("enforces per-card cap", async () => {
    const { ownerId, cardId } = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "C" });
      return { ownerId, cardId };
    });

    for (let i = 0; i < PER_CARD_TAG_LIMIT; i += 1) {
      await addTagToCard({ ownerId, cardId, rawName: `tag${i}` });
    }

    await assert.rejects(addTagToCard({ ownerId, cardId, rawName: "overflow" }), /at most/);
  });

  it("enforces name length cap", async () => {
    const { ownerId, cardId } = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "C" });
      return { ownerId, cardId };
    });

    const tooLong = "x".repeat(TAG_NAME_MAX_LENGTH + 1);
    await assert.rejects(addTagToCard({ ownerId, cardId, rawName: tooLong }), /cannot exceed/);
  });

  it("rejects names containing commas", async () => {
    const { ownerId, cardId } = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "C" });
      return { ownerId, cardId };
    });

    await assert.rejects(addTagToCard({ ownerId, cardId, rawName: "foo,bar" }), /comma/);
  });

  it("is idempotent when re-attaching the same tag to the same card", async () => {
    const { ownerId, cardId } = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "C" });
      return { ownerId, cardId };
    });

    await addTagToCard({ ownerId, cardId, rawName: "ux" });
    await addTagToCard({ ownerId, cardId, rawName: "ux" });

    const rows = await db.select().from(cardTags).where(eq(cardTags.cardId, cardId));
    assert.equal(rows.length, 1);
  });

  it("rejects cross-owner attaches with notFound", async () => {
    const ownerA = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "A" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "Mine" });
      return { ownerId, cardId };
    });
    const ownerB = await withFreshOwner(async ({ ownerId }) => ({ ownerId }));

    await assert.rejects(
      addTagToCard({ ownerId: ownerB.ownerId, cardId: ownerA.cardId, rawName: "x" }),
      /not found/i,
    );
  });
});

describe("detachTagFromCard", () => {
  it("removes the join row and returns detached: true", async () => {
    const { ownerId, cardId, tagId } = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "C" });
      const { tagId } = await addTagToCard({ ownerId, cardId, rawName: "wip" });
      return { ownerId, cardId, tagId };
    });

    const result = await detachTagFromCard({ ownerId, cardId, tagId });
    assert.equal(result.detached, true);

    const remaining = await listTagsForCards(db, { ownerId, cardIds: [cardId] });
    assert.equal(remaining.get(cardId)?.length ?? 0, 0);
  });

  it("is idempotent: detaching twice returns detached: false the second time", async () => {
    const { ownerId, cardId, tagId } = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "C" });
      const { tagId } = await addTagToCard({ ownerId, cardId, rawName: "wip" });
      return { ownerId, cardId, tagId };
    });

    await detachTagFromCard({ ownerId, cardId, tagId });
    const second = await detachTagFromCard({ ownerId, cardId, tagId });
    assert.equal(second.detached, false);
  });
});

describe("listTagsForOwner", () => {
  it("returns only the caller's tags, sorted by name", async () => {
    const ownerA = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "C" });
      await addTagToCard({ ownerId, cardId, rawName: "Zebra" });
      await addTagToCard({ ownerId, cardId, rawName: "Apple" });
      return { ownerId };
    });
    await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "C" });
      await addTagToCard({ ownerId, cardId, rawName: "OtherUserTag" });
      return { ownerId };
    });

    const list = await listTagsForOwner({ ownerId: ownerA.ownerId });
    assert.deepEqual(
      list.map((t) => t.name),
      ["Apple", "Zebra"],
    );
  });
});

describe("listTagsForCards", () => {
  it("returns a map keyed by cardId with tags in insertion order", async () => {
    const { ownerId, c1, c2 } = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const c1 = await insertCard({ columnId, title: "C1" });
      const c2 = await insertCard({ columnId, title: "C2" });
      await addTagToCard({ ownerId, cardId: c1, rawName: "alpha" });
      await addTagToCard({ ownerId, cardId: c1, rawName: "beta" });
      await addTagToCard({ ownerId, cardId: c2, rawName: "alpha" });
      return { ownerId, c1, c2 };
    });

    const map = await listTagsForCards(db, { ownerId, cardIds: [c1, c2] });
    assert.deepEqual(
      map.get(c1)?.map((t) => t.name),
      ["alpha", "beta"],
    );
    assert.deepEqual(
      map.get(c2)?.map((t) => t.name),
      ["alpha"],
    );
  });
});
```

Notes for the implementer:

- The test helpers `migrateTestDb`, `withFreshOwner`, `insertBoard`, `insertColumn`, `insertCard` exist in `src/server/testing/database.ts`. Inspect that file first to confirm exact signatures; if a helper has a different name (`createOwner`, `seedBoard`, etc.), substitute and keep the test logic the same.
- If `db.delete(...)` doesn't surface `rowCount` on this driver, replace the count check in `detachTagFromCard` repo with a `.returning({ id: cardTags.tagId })` and `.length > 0`.

- [ ] **Step 3: Run the new test file**

```bash
npm run test -- src/server/tag/repo.test.ts
```

Expected: pass. If `assert.rejects(..., /comma/)` fails because the implementation throws a different error message, adjust either the message in `repo.ts` or the regex here so they agree.

- [ ] **Step 4: Format**

```bash
npx prettier --write src/server/tag/repo.test.ts
```

- [ ] **Step 5: Run full test suite**

```bash
npm run test
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
test(tag): cover repo CRUD, casing rewrite, caps, owner scoping

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Wire `tagRouter` into `appRouter` + add router test, extend card hydration with `tags`, re-add cascades

This task does four mutually-dependent things in one commit so the build never breaks:

- New `src/server/trpc/routers/tag.ts` and its test.
- `appRouter` exposes `tag: tagRouter`.
- `CardDetailRow` regains a `tags` field; `getCard` hydrates it; `listCardsByBoard` hydrates and filters by it.
- `softDeleteCard` and `softDeleteBoard` cascade-hard-delete `card_tags` rows.
- Updated `card/repo.test.ts` and `board/repo.test.ts` cover the cascade and filter.

**Files:**

- Create: `src/server/trpc/routers/tag.ts`, `src/server/tag/router.test.ts`
- Modify: `src/server/trpc/router.ts`, `src/server/trpc/routers/card.ts`, `src/server/card/repo.ts`, `src/server/card/repo.test.ts`, `src/server/board/repo.ts`, `src/server/board/repo.test.ts`

- [ ] **Step 1: Create `src/server/trpc/routers/tag.ts`**

```ts
import { z } from "zod";

import { addTagToCardForUser, detachTagFromCardForUser, listTagsForUser } from "../../tag/service";
import { protectedProcedure, t } from "../init";

export const tagRouter = t.router({
  list: protectedProcedure.input(z.object({})).query(({ ctx }) => listTagsForUser(ctx.userId)),
  addToCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string().uuid(),
        name: z
          .string()
          .trim()
          .min(1, "Tag name cannot be empty")
          .max(40, "Tag name cannot exceed 40 characters")
          .refine((v) => !v.includes(","), "Tag name cannot contain a comma"),
      }),
    )
    .mutation(({ ctx, input }) => addTagToCardForUser(ctx.userId, input)),
  detachFromCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string().uuid(),
        tagId: z.string().uuid(),
      }),
    )
    .mutation(({ ctx, input }) => detachTagFromCardForUser(ctx.userId, input)),
});
```

- [ ] **Step 2: Wire `tag: tagRouter` into `src/server/trpc/router.ts`**

Add the import:

```ts
import { tagRouter } from "./routers/tag";
```

And inside `t.router({...})` add the line `tag: tagRouter,` (alongside `card: cardRouter,` etc).

- [ ] **Step 2a: Format the router files**

```bash
npx prettier --write src/server/trpc/routers/tag.ts src/server/trpc/router.ts
```

- [ ] **Step 2b: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 2c: Run tests — expect green**

```bash
npm run test
```

Expected: pass. The new router has no consumer yet — this commit is just the wire-up surface.

- [ ] **Step 2d: Commit router wire-up (save-point)**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(server): wire tagRouter into appRouter

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Update `src/server/trpc/routers/card.ts` to accept `tags` filter on `listByBoard`**

Find the `listByBoard` procedure's `.input(...)` zod schema. Add a `tags` field:

```ts
.input(
  z.object({
    boardId: z.string().uuid(),
    priority: z.array(z.string()).optional(),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(40)
          .transform((v) => v.toLowerCase()),
      )
      .max(20)
      .optional(),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z
      .object({
        updatedAt: z.string().datetime().or(z.date()),
        cardId: z.string().uuid(),
      })
      .nullish(),
  }),
)
```

Note: this code matches the existing `listByBoard` shape; if the existing schema differs in any field (e.g. `priority` is typed as `CardPriority[]` via a union enum), preserve those bits and only add the `tags` field.

Pass `input.tags` through to `listCardsByBoardForUser` (or whatever the service-layer wrapper is called); update the service if needed to forward `tags?: string[]`.

- [ ] **Step 4: Update `src/server/card/repo.ts` to re-introduce `tags` on `CardDetailRow` and hydrate everywhere**

Change `CardDetailRow`:

```ts
export type CardDetailRow = {
  id: string;
  columnId: string;
  columnTitle: string;
  title: string;
  description: string;
  priority: CardPriority;
  position: string;
  version: number;
  updatedAt: Date;
  tags: Array<{
    id: string;
    name: string;
    normalizedName: string;
  }>;
};
```

Update the imports at the top:

```ts
import { boards, cards, cardTags, type CardPriority, columns, tags } from "../db/schema";
```

Update `getCard` — replace the prior subtask join with a join through `cardTags ⨝ tags`. After the existing `getOwnedCard` call:

```ts
const tagRows = await db
  .select({
    id: tags.id,
    name: tags.name,
    normalizedName: tags.normalizedName,
    createdAt: cardTags.createdAt,
  })
  .from(cardTags)
  .innerJoin(tags, eq(tags.id, cardTags.tagId))
  .where(and(eq(cardTags.cardId, card.id), eq(tags.ownerId, input.ownerId), isNull(tags.deletedAt)))
  .orderBy(asc(cardTags.createdAt), asc(tags.id));

return {
  id: card.id,
  columnId: card.columnId,
  columnTitle: card.columnTitle,
  title: card.title,
  description: card.description,
  priority: card.priority,
  position: card.position,
  version: card.version,
  updatedAt: card.updatedAt,
  tags: tagRows.map(({ id, name, normalizedName }) => ({ id, name, normalizedName })),
};
```

Update `softDeleteCard` to cascade-hard-delete `card_tags`. Inside the transaction, after the cards UPDATE that sets `deletedAt`:

```ts
await tx.delete(cardTags).where(eq(cardTags.cardId, lockedCard.id));
```

(Replaces the deleted subtask cascade.)

Update `listCardsByBoard` to accept `tags?: string[]` and hydrate:

```ts
export async function listCardsByBoard(input: {
  ownerId: string;
  boardId: string;
  priority?: CardPriority[];
  tags?: string[];
  limit: number;
  cursor?: { updatedAt: Date; cardId: string } | null;
}): Promise<{
  items: Array<CardListItemRow & { tags: Array<{ id: string; name: string; normalizedName: string }> }>;
  nextCursor: { updatedAt: Date; cardId: string } | null;
}> {
  // ...existing ownedBoard / filters / cursor logic...

  if (input.tags && input.tags.length > 0) {
    filters.push(
      sql`EXISTS (
        SELECT 1 FROM card_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.card_id = ${cards.id}
          AND t.owner_id = ${input.ownerId}
          AND t.deleted_at IS NULL
          AND t.normalized_name = ANY(${input.tags})
      )`,
    );
  }

  const rows = await db
    .select({...existing select...})
    .from(cards)
    // ...existing joins/where/orderBy/limit...

  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  const lastItem = items.at(-1);

  const tagMap = await listTagsForCards(db, {
    ownerId: input.ownerId,
    cardIds: items.map((row) => row.id),
  });

  return {
    items: items.map((row) => ({ ...row, tags: tagMap.get(row.id) ?? [] })),
    nextCursor:
      hasMore && lastItem
        ? { updatedAt: lastItem.updatedAt, cardId: lastItem.id }
        : null,
  };
}
```

Add `sql` to the drizzle-orm import: `import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";`. Add `listTagsForCards` to the `repo-shared` import.

If `getBoardWithColumnsAndCards` (or its repo equivalent) exists in `src/server/board/repo.ts`, append a similar `listTagsForCards` hydration call so each card returned by board hydration has a `tags` array. The fan-out: collect every cardId from the columns, single batched call, then attach. Do not introduce N+1.

- [ ] **Step 5: Update `src/server/board/repo.ts` for the cascade on board soft-delete**

Locate the `softDeleteBoard` (or `softDelete` for boards) function. Inside its transaction, after the existing column/card cascade (which sets `deletedAt` on descendant cards), append:

```ts
await tx
  .delete(cardTags)
  .where(
    inArray(
      cardTags.cardId,
      tx
        .select({ id: cards.id })
        .from(cards)
        .innerJoin(columns, eq(cards.columnId, columns.id))
        .where(eq(columns.boardId, lockedBoard.id)),
    ),
  );
```

(Adjust the variable name `lockedBoard` to match what the existing code uses — could be `boardId`.)

Add `cardTags` to the schema import.

- [ ] **Step 5a: Format card + board repos and the card-router input change**

```bash
npx prettier --write \
  src/server/trpc/routers/card.ts \
  src/server/card/repo.ts \
  src/server/board/repo.ts
```

- [ ] **Step 5b: Typecheck**

```bash
npm run typecheck
```

Expected: clean. If existing tests in `card/repo.test.ts` or `board/repo.test.ts` no longer compile because they reference removed shapes, that's expected — Steps 6 and 7 update them. Defer the test-run until then.

- [ ] **Step 5c: Commit card hydration + cascades (save-point)**

Run `npm run test` first; it should pass even before Steps 6–7 because the existing test files don't yet reference the new shapes negatively. If a test fails because it asserts on the old subtask cascade (the test was supposed to be removed in Task 1 — verify by `rg "subtask" src/server/board/repo.test.ts`), drop it now.

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(server): hydrate tags on card reads and cascade soft-deletes

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Update `src/server/card/repo.test.ts` — assertion swap + new filter test**

Replace any pre-existing assertion that referenced `subtasks` with a `tags`-shaped check. Add a new test case to the existing `describe("listCardsByBoard", ...)` block (or create the block if absent):

```ts
it("filters cards by tags (OR semantics across the array)", async () => {
  const { ownerId, boardId, c1, c2, c3 } = await withFreshOwner(async ({ ownerId }) => {
    const boardId = await insertBoard({ ownerId, name: "B" });
    const columnId = await insertColumn({ boardId, title: "Todo" });
    const c1 = await insertCard({ columnId, title: "C1" });
    const c2 = await insertCard({ columnId, title: "C2" });
    const c3 = await insertCard({ columnId, title: "C3" });
    await addTagToCard({ ownerId, cardId: c1, rawName: "Bug" });
    await addTagToCard({ ownerId, cardId: c2, rawName: "Frontend" });
    return { ownerId, boardId, c1, c2, c3 };
  });

  const both = await listCardsByBoard({
    ownerId,
    boardId,
    tags: ["bug", "frontend"],
    limit: 50,
  });
  assert.deepEqual(both.items.map((r) => r.id).sort(), [c1, c2].sort());

  const onlyBug = await listCardsByBoard({
    ownerId,
    boardId,
    tags: ["bug"],
    limit: 50,
  });
  assert.deepEqual(
    onlyBug.items.map((r) => r.id),
    [c1],
  );

  const noFilter = await listCardsByBoard({ ownerId, boardId, limit: 50 });
  assert.deepEqual(noFilter.items.map((r) => r.id).sort(), [c1, c2, c3].sort());
});

it("hydrates tags on each row", async () => {
  const { ownerId, boardId, cardId } = await withFreshOwner(async ({ ownerId }) => {
    const boardId = await insertBoard({ ownerId, name: "B" });
    const columnId = await insertColumn({ boardId, title: "Todo" });
    const cardId = await insertCard({ columnId, title: "C" });
    await addTagToCard({ ownerId, cardId, rawName: "ux" });
    return { ownerId, boardId, cardId };
  });

  const { items } = await listCardsByBoard({ ownerId, boardId, limit: 10 });
  const row = items.find((r) => r.id === cardId);
  assert.deepEqual(
    row?.tags.map((t) => t.normalizedName),
    ["ux"],
  );
});
```

Add the necessary imports at the top of the test file (`addTagToCard` from `../tag/repo`, `listCardsByBoard` from `./repo`).

- [ ] **Step 7: Update `src/server/board/repo.test.ts` — add tag-cascade test**

```ts
it("hard-deletes card_tags when a board is soft-deleted", async () => {
  const { ownerId, boardId, cardId } = await withFreshOwner(async ({ ownerId }) => {
    const boardId = await insertBoard({ ownerId, name: "B" });
    const columnId = await insertColumn({ boardId, title: "Todo" });
    const cardId = await insertCard({ columnId, title: "C" });
    await addTagToCard({ ownerId, cardId, rawName: "x" });
    return { ownerId, boardId, cardId };
  });

  await softDeleteBoard({ ownerId, boardId, expectedVersion: 0 });

  const remaining = await db.select().from(cardTags).where(eq(cardTags.cardId, cardId));
  assert.equal(remaining.length, 0);
});
```

Adjust `softDeleteBoard` import + signature to match the actual function in `src/server/board/repo.ts`. Add `cardTags` and `eq` and `addTagToCard` imports as needed.

- [ ] **Step 8: Create `src/server/tag/router.test.ts`**

```ts
import { strict as assert } from "node:assert";
import { afterAll, beforeAll, describe, it } from "vitest";
import { TRPCError } from "@trpc/server";

import {
  migrateTestDb,
  withFreshOwner,
  insertBoard,
  insertColumn,
  insertCard,
} from "../testing/database";
import { appRouter } from "../trpc/router";
import { createTestCallerForUser, createTestCallerUnauthenticated } from "../testing/trpc";

beforeAll(async () => {
  await migrateTestDb();
});

describe("tag.list", () => {
  it("returns [] for a fresh user", async () => {
    const ownerId = await withFreshOwner(({ ownerId }) => Promise.resolve(ownerId));
    const caller = createTestCallerForUser(ownerId);
    const result = await caller.tag.list({});
    assert.deepEqual(result, []);
  });

  it("rejects unauthenticated calls", async () => {
    const caller = createTestCallerUnauthenticated();
    await assert.rejects(caller.tag.list({}), TRPCError);
  });
});

describe("tag.addToCard", () => {
  it("rejects empty / over-long / comma names", async () => {
    const { ownerId, cardId } = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "B" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "C" });
      return { ownerId, cardId };
    });
    const caller = createTestCallerForUser(ownerId);

    await assert.rejects(caller.tag.addToCard({ cardId, name: "" }), /empty|invalid_string/);
    await assert.rejects(caller.tag.addToCard({ cardId, name: "x".repeat(41) }), /too_big|exceed/);
    await assert.rejects(caller.tag.addToCard({ cardId, name: "foo,bar" }), /comma/);
  });

  it("rejects cross-user cardId with NOT_FOUND", async () => {
    const ownerA = await withFreshOwner(async ({ ownerId }) => {
      const boardId = await insertBoard({ ownerId, name: "A" });
      const columnId = await insertColumn({ boardId, title: "Todo" });
      const cardId = await insertCard({ columnId, title: "Mine" });
      return { ownerId, cardId };
    });
    const ownerBId = await withFreshOwner(({ ownerId }) => Promise.resolve(ownerId));

    const caller = createTestCallerForUser(ownerBId);
    await assert.rejects(
      caller.tag.addToCard({ cardId: ownerA.cardId, name: "x" }),
      /not found|NOT_FOUND/i,
    );
  });
});
```

Notes:

- Before writing this test, check whether test-caller helpers exist:

  ```bash
  rg -n "createCaller|TestCaller" src/server/testing src/server/trpc
  ```

  If a helper exists (any name), use it and adjust the imports in the test above. If nothing exists, create a minimal `src/server/testing/trpc.ts`:

  ```ts
  import { appRouter } from "../trpc/router";

  export function createTestCallerForUser(userId: string) {
    return appRouter.createCaller({
      userId,
      requestId: "test",
      userEmail: `${userId}@test.local`,
    } as any);
  }

  export function createTestCallerUnauthenticated() {
    return appRouter.createCaller({
      userId: undefined as any,
      requestId: "test",
      userEmail: undefined,
    } as any);
  }
  ```

  Adjust the cast shape to match whatever `protectedProcedure`'s context type expects in `src/server/trpc/init.ts`. If the auth gate keys off `userId === undefined`, the unauthenticated helper above is sufficient.

- [ ] **Step 9: Format every touched file**

```bash
npx prettier --write \
  src/server/trpc/routers/tag.ts \
  src/server/tag/router.test.ts \
  src/server/trpc/router.ts \
  src/server/trpc/routers/card.ts \
  src/server/card/repo.ts \
  src/server/card/repo.test.ts \
  src/server/board/repo.ts \
  src/server/board/repo.test.ts
```

- [ ] **Step 10: Typecheck and run all tests**

```bash
npm run typecheck && npm run test
```

Expected: clean + green.

- [ ] **Step 11: Commit test coverage**

```bash
git add -A
git commit -m "$(cat <<'EOF'
test(server): cover tag hydration, listByBoard filter, and cascades

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Type and model layer (`types.ts`, `model.ts`, `model.test.ts`)

**Files:**

- Modify: `src/features/boards/types.ts`, `src/features/boards/model.ts`, `src/features/boards/model.test.ts`

- [ ] **Step 1: Extend `BoardDetailSearch` in `src/features/boards/types.ts`**

```ts
export type BoardDetailSearch = {
  card?: string;
  view: BoardViewMode;
  groupBy: BoardGroupBy;
  priority: CardPriority[];
  tags: string[];
  drawer?: string;
};
```

(`SubtaskSummary` was already deleted in Task 1.) The card-derived types (`CardSummary`, `CardDetail`, `CardListItem`) automatically pick up the new server-side `tags` field via `inferRouterOutputs`.

- [ ] **Step 2: Add tag helpers to `src/features/boards/model.ts`**

Inside the file, after the existing priority parser (`parsePriorityFilter` etc.):

```ts
function parseTagFilter(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  const out = new Set<string>();
  for (const entry of value.split(",")) {
    const norm = entry.trim().toLowerCase();
    if (norm.length > 0) {
      out.add(norm);
    }
  }
  return [...out];
}

export function serializeTagFilter(tagFilter: string[]) {
  return tagFilter.length > 0 ? tagFilter.join(",") : undefined;
}

export function toggleTagSelection(selected: string[], tag: string): string[] {
  const set = new Set(selected);
  if (set.has(tag)) {
    set.delete(tag);
  } else {
    set.add(tag);
  }
  return [...set];
}
```

- [ ] **Step 3: Extend `parseBoardDetailSearch` in `src/features/boards/model.ts`**

```ts
export function parseBoardDetailSearch(search: RawSearch): BoardDetailSearch {
  const card = normalizeSearchString(search.card);
  const view = normalizeSearchString(search.view);
  const groupBy = normalizeSearchString(search.groupBy);
  const priority = normalizeSearchString(search.priority);
  const tagsParam = normalizeSearchString(search.tags);
  const drawer = normalizeSearchString(search.drawer);

  return {
    card,
    view: isBoardViewMode(view) ? view : "board",
    groupBy: isBoardGroupBy(groupBy) ? groupBy : "column",
    priority: parsePriorityFilter(priority),
    tags: parseTagFilter(tagsParam),
    drawer,
  };
}
```

- [ ] **Step 4: Extend `buildBoardLanes` in `src/features/boards/model.ts`**

```ts
export function buildBoardLanes(
  board: LoadedBoard,
  input: {
    groupBy: BoardGroupBy;
    priority: CardPriority[];
    tags: string[];
  },
): BoardLane[] {
  const activePriorityFilters = new Set(input.priority);
  const activeTagFilters = new Set(input.tags);

  return board.columns.map((column) => ({
    id: column.id,
    title: column.title,
    laneKind: "column" as const,
    originalColumnId: column.id,
    columnVersion: column.version,
    cards: column.cards
      .filter((card) => {
        if (activePriorityFilters.size > 0 && !activePriorityFilters.has(card.priority)) {
          return false;
        }
        if (activeTagFilters.size > 0) {
          const cardTagSet = new Set(card.tags.map((t) => t.normalizedName));
          const hasMatch = [...activeTagFilters].some((t) => cardTagSet.has(t));
          if (!hasMatch) {
            return false;
          }
        }
        return true;
      })
      .map((card) => ({
        ...card,
        originalColumnId: column.id,
        originalColumnTitle: column.title,
      })),
  }));
}
```

- [ ] **Step 5: Extend `canReorderBoard` in `src/features/boards/model.ts`**

```ts
export function canReorderBoard(input: {
  view: BoardViewMode;
  groupBy: BoardGroupBy;
  priority: CardPriority[];
  tags: string[];
}) {
  return (
    input.view === "board" &&
    input.groupBy === "column" &&
    input.priority.length === 0 &&
    input.tags.length === 0
  );
}
```

- [ ] **Step 6: Update every call site of `canReorderBoard` and `buildBoardLanes` to pass `tags`**

```bash
rg -n "canReorderBoard\(|buildBoardLanes\(" src/
```

For each match, ensure the input object now includes a `tags` field sourced from the parsed `BoardDetailSearch`. Most call sites are likely in `BoardDetailScreen.tsx`, `BoardWorkspaceScreen.tsx`, and a handful of test files. If a test currently passes the literal object `{ view, groupBy, priority }`, add `tags: []`.

- [ ] **Step 6a: Format the type/model code touched so far**

```bash
npx prettier --write \
  src/features/boards/types.ts \
  src/features/boards/model.ts
```

- [ ] **Step 6b: Typecheck**

```bash
npm run typecheck
```

Expected: clean. Existing tests still see the old call signatures momentarily — the test additions in Step 7 follow.

- [ ] **Step 6c: Commit type/model code (save-point)**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(boards): add tags to BoardDetailSearch, lane filter, reorder gate

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 7: Add tag-related tests to `src/features/boards/model.test.ts`**

Append:

```ts
import { describe, it } from "vitest";
import { strict as assert } from "node:assert";

// import statements per existing file...
import {
  buildBoardLanes,
  canReorderBoard,
  parseBoardDetailSearch,
  serializeTagFilter,
  toggleTagSelection,
} from "./model";

describe("parseTagFilter (via parseBoardDetailSearch)", () => {
  it("lowercases, trims, dedupes, preserves inner spaces", () => {
    const parsed = parseBoardDetailSearch({ tags: "Bug, NEEDS REVIEW, bug" });
    assert.deepEqual(parsed.tags, ["bug", "needs review"]);
  });

  it("returns [] for missing or empty input", () => {
    const a = parseBoardDetailSearch({});
    const b = parseBoardDetailSearch({ tags: "" });
    assert.deepEqual(a.tags, []);
    assert.deepEqual(b.tags, []);
  });
});

describe("serializeTagFilter", () => {
  it("joins with commas, returns undefined for empty arrays", () => {
    assert.equal(serializeTagFilter([]), undefined);
    assert.equal(serializeTagFilter(["bug", "x"]), "bug,x");
  });
});

describe("toggleTagSelection", () => {
  it("adds when missing, removes when present", () => {
    assert.deepEqual(toggleTagSelection([], "bug"), ["bug"]);
    assert.deepEqual(toggleTagSelection(["bug"], "bug"), []);
    assert.deepEqual(toggleTagSelection(["a"], "b").sort(), ["a", "b"].sort());
  });
});

describe("buildBoardLanes with tag filter", () => {
  const card = (id: string, priority: "low" | "medium" | "high" | "none", tagNames: string[]) => ({
    id,
    columnId: "col",
    title: id,
    description: "",
    priority,
    position: id,
    version: 0,
    updatedAt: new Date(),
    tags: tagNames.map((n) => ({ id: n, name: n, normalizedName: n.toLowerCase() })),
  });

  const board = {
    id: "b",
    name: "B",
    version: 0,
    updatedAt: new Date(),
    columns: [
      {
        id: "col",
        boardId: "b",
        title: "Todo",
        position: "0",
        version: 0,
        updatedAt: new Date(),
        cardCount: 3,
        cards: [
          card("c1", "high", ["bug"]),
          card("c2", "medium", ["frontend"]),
          card("c3", "low", []),
        ],
      },
    ],
  } as any;

  it("filters by tags (OR within array)", () => {
    const lanes = buildBoardLanes(board, { groupBy: "column", priority: [], tags: ["bug"] });
    assert.deepEqual(
      lanes[0].cards.map((c) => c.id),
      ["c1"],
    );
  });

  it("multiple tags use OR", () => {
    const lanes = buildBoardLanes(board, {
      groupBy: "column",
      priority: [],
      tags: ["bug", "frontend"],
    });
    assert.deepEqual(lanes[0].cards.map((c) => c.id).sort(), ["c1", "c2"].sort());
  });

  it("AND across priority and tag dimensions", () => {
    const lanes = buildBoardLanes(board, {
      groupBy: "column",
      priority: ["high"],
      tags: ["bug"],
    });
    assert.deepEqual(
      lanes[0].cards.map((c) => c.id),
      ["c1"],
    );
  });
});

describe("canReorderBoard with tags", () => {
  it("returns false when tags filter is non-empty", () => {
    assert.equal(
      canReorderBoard({ view: "board", groupBy: "column", priority: [], tags: ["x"] }),
      false,
    );
  });

  it("returns true when all filters empty and grouping is column", () => {
    assert.equal(
      canReorderBoard({ view: "board", groupBy: "column", priority: [], tags: [] }),
      true,
    );
  });
});
```

If the existing `model.test.ts` already has helpers for fixture cards/boards, replace the inlined `card(...)` / `board` fixture above with those helpers.

- [ ] **Step 8: Format**

```bash
npx prettier --write \
  src/features/boards/types.ts \
  src/features/boards/model.ts \
  src/features/boards/model.test.ts
```

- [ ] **Step 9: Typecheck + tests**

```bash
npm run typecheck && npm run test
```

Expected: clean + green. The TS errors will likely include callers of `buildBoardLanes`/`canReorderBoard` in board screens that haven't been updated yet — this is expected for now if Step 6 missed any, but they should be caught at typecheck. If so, fix them before commit.

- [ ] **Step 10: Commit test coverage**

```bash
git add -A
git commit -m "$(cat <<'EOF'
test(boards): cover tag filter parsers, lane filter, reorder gate

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Add Tamagui tag swatch tokens

**Files:**

- Modify: the Tamagui config file housing `$boardPriorityHighBg` etc.

- [ ] **Step 1: Locate the priority token definitions**

```bash
rg -l "boardPriorityHighBg" src/
```

Open the matching file (likely `src/tamagui.config.ts` or `src/tamagui/tokens.ts` — exact path depends on the project layout). Note its structure: usually a `light` and `dark` map, each containing keyed CSS color values.

- [ ] **Step 2: Add 8 paired swatches**

In the existing tokens file, in both light and dark token maps, add:

```ts
boardTagSwatch1Bg: "#fde6e2",
boardTagSwatch1Text: "#7a2615",
boardTagSwatch2Bg: "#fdedc7",
boardTagSwatch2Text: "#754a02",
boardTagSwatch3Bg: "#e6f4d3",
boardTagSwatch3Text: "#3d5b13",
boardTagSwatch4Bg: "#d6efe4",
boardTagSwatch4Text: "#0f5236",
boardTagSwatch5Bg: "#d4edf7",
boardTagSwatch5Text: "#0d4f6e",
boardTagSwatch6Bg: "#dde1f5",
boardTagSwatch6Text: "#28367a",
boardTagSwatch7Bg: "#ecdcf5",
boardTagSwatch7Text: "#5a1f7a",
boardTagSwatch8Bg: "#f4d5e7",
boardTagSwatch8Text: "#7a1c4f",
```

For the dark token map, swap each `Bg` to a darker version (~#2x2x2x scale) and each `Text` to a lighter version (~#dxdxdx scale). Concrete values:

```ts
// dark variants
boardTagSwatch1Bg: "#3d1410",
boardTagSwatch1Text: "#ffd2c8",
boardTagSwatch2Bg: "#3a2702",
boardTagSwatch2Text: "#ffe49b",
boardTagSwatch3Bg: "#1f300b",
boardTagSwatch3Text: "#d8eebd",
boardTagSwatch4Bg: "#0a2918",
boardTagSwatch4Text: "#bce5d2",
boardTagSwatch5Bg: "#082b3b",
boardTagSwatch5Text: "#bce0f0",
boardTagSwatch6Bg: "#161e3f",
boardTagSwatch6Text: "#c8d0f5",
boardTagSwatch7Bg: "#2c0f3b",
boardTagSwatch7Text: "#dcc1ee",
boardTagSwatch8Bg: "#3b1129",
boardTagSwatch8Text: "#f1c2dc",
```

(All eight pairs target ≥4.5:1 contrast for AA. If the project has a contrast-checking utility, run it on the new pairs and adjust any that fall short.)

- [ ] **Step 3: Format**

```bash
npx prettier --write <path-from-step-1>
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: clean. (The new tokens are not yet referenced by any code, so this just confirms the file still parses.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(tamagui): add 8 tag swatch token pairs (light + dark)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `tagPalette.ts` — deterministic FNV-1a swatch lookup

**Files:**

- Create: `src/features/boards/tagPalette.ts`
- Create: `src/features/boards/tagPalette.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/boards/tagPalette.test.ts`:

```ts
import { describe, it } from "vitest";
import { strict as assert } from "node:assert";

import { TAG_PALETTE, getTagSwatch } from "./tagPalette";

describe("getTagSwatch", () => {
  it("returns one of the palette entries", () => {
    const swatch = getTagSwatch("bug");
    assert.ok(TAG_PALETTE.includes(swatch));
  });

  it("is deterministic — same input maps to same swatch", () => {
    assert.equal(getTagSwatch("bug"), getTagSwatch("bug"));
    assert.equal(getTagSwatch("frontend"), getTagSwatch("frontend"));
  });

  it("distributes — different inputs do not all collide on one entry", () => {
    const inputs = ["a", "b", "c", "d", "e", "f", "g", "h", "alpha", "beta", "gamma"];
    const seen = new Set(inputs.map(getTagSwatch));
    assert.ok(seen.size > 1, "expected multiple distinct swatches");
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

```bash
npm run test -- src/features/boards/tagPalette.test.ts
```

Expected: fails with module-not-found for `./tagPalette`.

- [ ] **Step 3: Implement `src/features/boards/tagPalette.ts`**

```ts
export type TagSwatch = {
  backgroundColor: string;
  textColor: string;
};

export const TAG_PALETTE: ReadonlyArray<TagSwatch> = [
  { backgroundColor: "$boardTagSwatch1Bg", textColor: "$boardTagSwatch1Text" },
  { backgroundColor: "$boardTagSwatch2Bg", textColor: "$boardTagSwatch2Text" },
  { backgroundColor: "$boardTagSwatch3Bg", textColor: "$boardTagSwatch3Text" },
  { backgroundColor: "$boardTagSwatch4Bg", textColor: "$boardTagSwatch4Text" },
  { backgroundColor: "$boardTagSwatch5Bg", textColor: "$boardTagSwatch5Text" },
  { backgroundColor: "$boardTagSwatch6Bg", textColor: "$boardTagSwatch6Text" },
  { backgroundColor: "$boardTagSwatch7Bg", textColor: "$boardTagSwatch7Text" },
  { backgroundColor: "$boardTagSwatch8Bg", textColor: "$boardTagSwatch8Text" },
];

const FNV1A_OFFSET = 0x811c9dc5;
const FNV1A_PRIME = 0x01000193;

function fnv1a(input: string): number {
  let hash = FNV1A_OFFSET;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // Force 32-bit unsigned multiplication
    hash = Math.imul(hash, FNV1A_PRIME) >>> 0;
  }
  return hash;
}

export function getTagSwatch(normalizedName: string): TagSwatch {
  const index = fnv1a(normalizedName) % TAG_PALETTE.length;
  return TAG_PALETTE[index];
}
```

- [ ] **Step 4: Run the test — expect pass**

```bash
npm run test -- src/features/boards/tagPalette.test.ts
```

Expected: pass.

- [ ] **Step 5: Format**

```bash
npx prettier --write src/features/boards/tagPalette.ts src/features/boards/tagPalette.test.ts
```

- [ ] **Step 6: Run full suite + typecheck**

```bash
npm run typecheck && npm run test
```

Expected: clean + green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(boards): add tagPalette helper with FNV-1a swatch lookup

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Extract `useDragSafePress` hook from the priority popover gesture

The priority popover button in `src/features/boards/BoardCanvas/CardInterior.tsx` (lines 134–166) uses a 5-px drag-threshold `onMouseDown` to discriminate "open popover" from "start dragging the card." The same gesture is needed by the new tag `+` trigger (Task 11). Extract it into a hook so both buttons share one implementation.

**Files:**

- Create: `src/features/boards/BoardCanvas/useDragSafePress.ts`
- Modify: `src/features/boards/BoardCanvas/CardInterior.tsx`

- [ ] **Step 1: Create `src/features/boards/BoardCanvas/useDragSafePress.ts`**

```ts
import { useCallback, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

const DEFAULT_THRESHOLD_PX = 5;

type UseDragSafePressInput = {
  onActivate: () => void;
  thresholdPx?: number;
};

type UseDragSafePressReturn = {
  onMouseDown: (event: ReactMouseEvent) => void;
};

/**
 * Returns an `onMouseDown` handler that calls `onActivate()` only if the
 * pointer was released without moving more than `thresholdPx`. If the user
 * drags beyond the threshold before releasing, `onActivate` is suppressed —
 * letting an outer drag handle (e.g. hello-pangea/dnd) take over.
 */
export function useDragSafePress({
  onActivate,
  thresholdPx = DEFAULT_THRESHOLD_PX,
}: UseDragSafePressInput): UseDragSafePressReturn {
  const stateRef = useRef<{ moved: boolean } | null>(null);

  const onMouseDown = useCallback(
    (event: ReactMouseEvent) => {
      if (typeof window === "undefined") {
        onActivate();
        return;
      }

      const startX = event.clientX;
      const startY = event.clientY;
      const state = { moved: false };
      stateRef.current = state;

      const onMove = (windowEvent: MouseEvent) => {
        if (state.moved) return;
        const dx = windowEvent.clientX - startX;
        const dy = windowEvent.clientY - startY;
        if (Math.hypot(dx, dy) >= thresholdPx) {
          state.moved = true;
        }
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        if (!state.moved) {
          onActivate();
        }
        stateRef.current = null;
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onActivate, thresholdPx],
  );

  return { onMouseDown };
}
```

- [ ] **Step 2: Refactor the priority button in `src/features/boards/BoardCanvas/CardInterior.tsx` to use the hook**

At the top of the file:

```ts
import { useDragSafePress } from "./useDragSafePress";
```

Inside `CardInterior`, replace the old `priorityGestureRef` ref + the inline `onMouseDown` block (currently lines 56, 134–166) with:

```ts
const priorityPress = useDragSafePress({
  onActivate: () => setPriorityPickerOpen(true),
});
```

In the `BoardActionButton` markup for the priority pill, replace the entire `onMouseDown={(event) => { ... }}` prop with `onMouseDown={priorityPress.onMouseDown}`. Delete the now-unused constants `PRIORITY_POPOVER_DRAG_THRESHOLD_PX` and the `priorityGestureRef` declaration.

Also remove the `useRef` import if it's no longer used in the file.

- [ ] **Step 3: Format**

```bash
npx prettier --write \
  src/features/boards/BoardCanvas/useDragSafePress.ts \
  src/features/boards/BoardCanvas/CardInterior.tsx
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 5: Run existing priority popover tests — expect still green**

```bash
npm run test -- src/features/boards/BoardCanvas
```

The existing inline-rename / priority-grouping / drag-from-buttons tests should all still pass — the gesture behavior is preserved, only the location of the code moved.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(boards): extract priority popover gesture into useDragSafePress

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: `CardTagsRow` component (TDD)

The component renders the wrapping pill row, the `+` add button anchored to a Tamagui `Popover`, and per-pill `×` for detach. This task writes the canvas test first, runs it red, then builds the component.

**Files:**

- Create: `src/features/boards/BoardCanvas.tag-row.test.tsx`
- Create: `src/features/boards/BoardCanvas/CardTagsRow.tsx`

- [ ] **Step 1: Look at sibling tests for harness conventions**

```bash
ls src/features/boards/BoardCanvas.*.test.tsx
sed -n '1,60p' src/features/boards/BoardCanvas.inline-edit-card-title.test.tsx
```

This reveals the import conventions, render harness, and any factory functions used (e.g. `renderBoardCanvas(...)`).

- [ ] **Step 2: Create `src/features/boards/BoardCanvas.tag-row.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CardTagsRow } from "./BoardCanvas/CardTagsRow";

const tagsFixture = [
  { id: "id-bug", name: "Bug", normalizedName: "bug" },
  { id: "id-fe", name: "Frontend", normalizedName: "frontend" },
  { id: "id-be", name: "Backend", normalizedName: "backend" },
];

function renderRow(overrides: Partial<React.ComponentProps<typeof CardTagsRow>> = {}) {
  const onAddTag = overrides.onAddTag ?? vi.fn().mockResolvedValue(undefined);
  const onDetachTag = overrides.onDetachTag ?? vi.fn().mockResolvedValue(undefined);

  const utils = render(
    <CardTagsRow
      attachedTags={[tagsFixture[0]]}
      availableTags={tagsFixture}
      onAddTag={onAddTag}
      onDetachTag={onDetachTag}
      {...overrides}
    />,
  );

  return { ...utils, onAddTag, onDetachTag };
}

describe("CardTagsRow", () => {
  it("renders attached tags as pills with × buttons", () => {
    renderRow();
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove tag Bug")).toBeInTheDocument();
  });

  it("opens popover when + is pressed and lists existing tags", async () => {
    const user = userEvent.setup();
    renderRow();
    const addButton = screen.getByLabelText("Add tag");
    await user.click(addButton);

    const popover = await screen.findByRole("dialog");
    expect(within(popover).getByText("Frontend")).toBeInTheDocument();
    expect(within(popover).getByText("Backend")).toBeInTheDocument();
  });

  it("disables already-attached tags in the popover list", async () => {
    const user = userEvent.setup();
    renderRow();
    await user.click(screen.getByLabelText("Add tag"));

    const popover = await screen.findByRole("dialog");
    const existingBug = within(popover).getByRole("button", { name: /Bug$/ });
    expect(existingBug).toBeDisabled();
  });

  it("filters list as user types", async () => {
    const user = userEvent.setup();
    renderRow();
    await user.click(screen.getByLabelText("Add tag"));
    const popover = await screen.findByRole("dialog");

    const input = within(popover).getByPlaceholderText("Find or create…");
    await user.type(input, "front");

    expect(within(popover).getByText("Frontend")).toBeInTheDocument();
    expect(within(popover).queryByText("Backend")).not.toBeInTheDocument();
  });

  it("shows the no-match hint and Add still works to create", async () => {
    const user = userEvent.setup();
    const { onAddTag } = renderRow();
    await user.click(screen.getByLabelText("Add tag"));
    const popover = await screen.findByRole("dialog");

    const input = within(popover).getByPlaceholderText("Find or create…");
    await user.type(input, "xyzzy");

    expect(within(popover).getByText(/Press Add to create "xyzzy"/)).toBeInTheDocument();

    await user.click(within(popover).getByRole("button", { name: "Add" }));

    expect(onAddTag).toHaveBeenCalledWith("xyzzy");
  });

  it("Enter in input submits the trimmed name and clears", async () => {
    const user = userEvent.setup();
    const { onAddTag } = renderRow();
    await user.click(screen.getByLabelText("Add tag"));
    const popover = await screen.findByRole("dialog");

    const input = within(popover).getByPlaceholderText("Find or create…");
    await user.type(input, "  newtag  {enter}");

    expect(onAddTag).toHaveBeenCalledWith("newtag");
  });

  it("clicking an existing (unattached) tag passes its current name to onAddTag", async () => {
    const user = userEvent.setup();
    const { onAddTag } = renderRow();
    await user.click(screen.getByLabelText("Add tag"));
    const popover = await screen.findByRole("dialog");

    await user.click(within(popover).getByRole("button", { name: "Frontend" }));

    expect(onAddTag).toHaveBeenCalledWith("Frontend");
  });

  it("× detaches the right tag", async () => {
    const user = userEvent.setup();
    const { onDetachTag } = renderRow();
    await user.click(screen.getByLabelText("Remove tag Bug"));

    expect(onDetachTag).toHaveBeenCalledWith("id-bug");
  });

  it("× mousedown does not bubble to ancestor handlers (drag-handle protection)", async () => {
    const ancestorMouseDown = vi.fn();
    render(
      <div onMouseDown={ancestorMouseDown}>
        <CardTagsRow
          attachedTags={[tagsFixture[0]]}
          availableTags={tagsFixture}
          onAddTag={vi.fn()}
          onDetachTag={vi.fn()}
        />
      </div>,
    );

    const removeBtn = screen.getByLabelText("Remove tag Bug");
    const user = userEvent.setup();
    await user.pointer({ keys: "[MouseLeft>]", target: removeBtn });

    expect(ancestorMouseDown).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the new test — expect failure**

```bash
npm run test -- src/features/boards/BoardCanvas.tag-row.test.tsx
```

Expected: fails with module-not-found for `./BoardCanvas/CardTagsRow`.

- [ ] **Step 4: Implement `src/features/boards/BoardCanvas/CardTagsRow.tsx`**

```tsx
import { useState, useMemo } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Popover } from "@tamagui/popover";
import { Input } from "@tamagui/input";
import { Text, Theme } from "@tamagui/core";
import { Button } from "@tamagui/button";
import { XStack, YStack } from "@tamagui/stacks";

import { tamaguiInputValueOnChange } from "../../tamaguiRhfWebField";
import { BoardActionButton } from "./ui";
import { getTagSwatch } from "../tagPalette";
import { useDragSafePress } from "./useDragSafePress";

export type CardTagsRowTag = {
  id: string;
  name: string;
  normalizedName: string;
};

type Props = Readonly<{
  attachedTags: ReadonlyArray<CardTagsRowTag>;
  availableTags: ReadonlyArray<CardTagsRowTag>;
  onAddTag: (name: string) => Promise<void> | void;
  onDetachTag: (tagId: string) => Promise<void> | void;
}>;

export function CardTagsRow({ attachedTags, availableTags, onAddTag, onDetachTag }: Props) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const press = useDragSafePress({
    onActivate: () => setPopoverOpen(true),
  });

  const attachedIds = useMemo(() => new Set(attachedTags.map((tag) => tag.id)), [attachedTags]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return availableTags;
    return availableTags.filter((tag) => tag.normalizedName.includes(q));
  }, [availableTags, query]);

  const submitAdd = async () => {
    const name = query.trim();
    if (name.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await onAddTag(name);
      setQuery("");
      setPopoverOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClickExisting = async (tag: CardTagsRowTag) => {
    if (attachedIds.has(tag.id)) return;
    setSubmitting(true);
    try {
      await onAddTag(tag.name);
      setPopoverOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <XStack gap="$2" flexWrap="wrap" alignItems="center">
      <Theme name="light">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen} placement="bottom-start">
          <Popover.Anchor asChild>
            <BoardActionButton
              aria-label="Add tag"
              tone="ghost"
              paddingHorizontal="$3"
              paddingVertical="$2"
              minHeight={0}
              height="auto"
              onMouseDown={press.onMouseDown}
              onPress={() => setPopoverOpen(true)}
            >
              +
            </BoardActionButton>
          </Popover.Anchor>

          <Popover.Content
            elevate
            padding="$3"
            borderRadius="$6"
            borderWidth={1}
            borderColor="$boardShellBorder"
            backgroundColor="$boardShellSurface"
            gap="$2"
            width={280}
            zIndex={1000}
            role="dialog"
          >
            <Popover.Arrow borderWidth={1} borderColor="$boardShellBorder" />
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="700" color="$boardHeading">
                Tags
              </Text>
              <XStack gap="$2">
                <Input
                  value={query}
                  onChange={tamaguiInputValueOnChange(setQuery)}
                  placeholder="Find or create…"
                  flex={1}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submitAdd();
                    }
                  }}
                  backgroundColor="$boardPanelSurfaceStrong"
                  borderColor="$boardShellBorder"
                />
                <BoardActionButton
                  tone="accent"
                  disabled={query.trim().length === 0 || submitting}
                  onPress={() => void submitAdd()}
                >
                  Add
                </BoardActionButton>
              </XStack>
              <YStack gap="$1" maxHeight={240}>
                {filtered.map((tag) => {
                  const isAttached = attachedIds.has(tag.id);
                  const swatch = getTagSwatch(tag.normalizedName);
                  return (
                    <BoardActionButton
                      key={tag.id}
                      tone={isAttached ? "accent" : "ghost"}
                      disabled={isAttached || submitting}
                      onPress={() => void handleClickExisting(tag)}
                      justifyContent="flex-start"
                    >
                      <XStack alignItems="center" gap="$2">
                        <YStack
                          width={10}
                          height={10}
                          borderRadius="$1"
                          backgroundColor={swatch.backgroundColor as any}
                        />
                        <Text>{tag.name}</Text>
                      </XStack>
                    </BoardActionButton>
                  );
                })}
                {filtered.length === 0 && query.length > 0 ? (
                  <Text color="$boardTextMuted" fontSize="$2">
                    No matches. Press Add to create "{query.trim()}".
                  </Text>
                ) : null}
              </YStack>
            </YStack>
          </Popover.Content>
        </Popover>
      </Theme>

      {attachedTags.map((tag) => {
        const swatch = getTagSwatch(tag.normalizedName);
        return (
          <XStack
            key={tag.id}
            alignItems="center"
            gap="$2"
            backgroundColor={swatch.backgroundColor as any}
            paddingLeft="$2"
            paddingRight="$1"
            paddingVertical="$1"
            borderRadius="$3"
          >
            <Text color={swatch.textColor as any} fontSize="$2" fontWeight="600">
              {tag.name}
            </Text>
            <Button
              size="$1"
              circular
              chromeless
              aria-label={`Remove tag ${tag.name}`}
              onMouseDown={(event: ReactMouseEvent) => event.stopPropagation()}
              onPress={() => void onDetachTag(tag.id)}
            >
              ×
            </Button>
          </XStack>
        );
      })}
    </XStack>
  );
}
```

- [ ] **Step 5: Run the new test — expect pass**

```bash
npm run test -- src/features/boards/BoardCanvas.tag-row.test.tsx
```

Expected: pass. If individual cases fail because `Popover.Content` doesn't render with `role="dialog"` in jsdom (Tamagui's portal behavior may not render it directly into the DOM tree), adjust the test to use `screen.findByText("Tags")` instead of `findByRole("dialog")`. The behavioral assertions remain the same.

- [ ] **Step 6: Format**

```bash
npx prettier --write \
  src/features/boards/BoardCanvas/CardTagsRow.tsx \
  src/features/boards/BoardCanvas.tag-row.test.tsx
```

- [ ] **Step 7: Run the full suite + typecheck**

```bash
npm run typecheck && npm run test
```

Expected: clean + green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(boards): add CardTagsRow component with popover-based add and pill detach

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Wire `CardTagsRow` into `CardInterior` and thread props through the lane fan-out

**Files:**

- Modify: `src/features/boards/BoardCanvas/CardInterior.tsx`, `src/features/boards/BoardCanvas/index.tsx`, `src/features/boards/BoardCanvas/BoardLaneView.tsx`, `src/features/boards/BoardCanvas/StaticLaneCards.tsx`, `src/features/boards/BoardCanvas/BoardColumnsLayout.tsx`, plus any other file in the fan-out.

- [ ] **Step 1: Map every prop-drilling layer between `BoardWorkspaceScreen` / `BoardDetailScreen` and `CardInterior`**

```bash
rg -n "CardInterior|CardPreview" src/features/boards
```

Identify the chain. Likely: `BoardWorkspaceScreen` → `BoardCanvas/index.tsx` → `BoardColumnsLayout` → `BoardLaneView` → `StaticLaneCards` → `CardInterior` / `CardPreview`. Adjust the chain to the actual file structure.

- [ ] **Step 2: Add tag props to `CardInterior` and `CardPreview` in `src/features/boards/BoardCanvas/CardInterior.tsx`**

Update the `CardInteriorProps` type:

```ts
import type { CardTagsRowTag } from "./CardTagsRow";
import { CardTagsRow } from "./CardTagsRow";

type CardInteriorProps = {
  card: BoardLane["cards"][number];
  showColumnContext: boolean;
  canMove: boolean;
  moveDirections?: Array<Direction>;
  dragHandleProps?: DraggableProvided["dragHandleProps"];
  availableTags: ReadonlyArray<CardTagsRowTag>;
  onOpen: () => void;
  onMove: (cardId: string, direction: Direction) => void;
  onAddTag: (input: { cardId: string; name: string }) => Promise<void>;
  onDetachTag: (input: { cardId: string; tagId: string }) => Promise<void>;
  onRenameTitle: (input: {
    cardId: string;
    title: string;
    description: string;
    priority: BoardLane["cards"][number]["priority"];
    expectedVersion: number;
  }) => Promise<void>;
};
```

Inside `CardInterior`, render the row between the description field and the bottom row. Place this after the `</FormInlineSubmitField>` block and before the existing bottom `<XStack gap="$2" flexWrap="wrap" alignItems="center">`:

```tsx
<CardTagsRow
  attachedTags={card.tags}
  availableTags={availableTags}
  onAddTag={(name) => onAddTag({ cardId: card.id, name })}
  onDetachTag={(tagId) => onDetachTag({ cardId: card.id, tagId })}
/>
```

`card.tags` already exists on the typed shape because `CardSummary = LoadedColumn["cards"][number]` and the server now hydrates `tags` (Task 5).

Update `CardPreview` similarly — accept the same new props and forward them:

```tsx
export function CardPreview({
  card,
  showColumnContext,
  canMove,
  availableTags,
  onOpen,
  onMove,
  onAddTag,
  onDetachTag,
  onRenameTitle,
}: Readonly<{
  card: BoardLane["cards"][number];
  showColumnContext: boolean;
  canMove: boolean;
  availableTags: ReadonlyArray<CardTagsRowTag>;
  onOpen: () => void;
  onMove: (cardId: string, direction: Direction) => void;
  onAddTag: CardInteriorProps["onAddTag"];
  onDetachTag: CardInteriorProps["onDetachTag"];
  onRenameTitle: CardInteriorProps["onRenameTitle"];
}>) {
  return (
    <BoardSurface padding="$4">
      <CardInterior
        card={card}
        showColumnContext={showColumnContext}
        canMove={canMove}
        availableTags={availableTags}
        onOpen={onOpen}
        onMove={onMove}
        onAddTag={onAddTag}
        onDetachTag={onDetachTag}
        onRenameTitle={onRenameTitle}
      />
    </BoardSurface>
  );
}
```

- [ ] **Step 3: Thread the new props through every fan-out file**

For each file in the fan-out chain identified in Step 1, add `availableTags`, `onAddTag`, `onDetachTag` to the component's prop type and forward them to children. Example for `BoardLaneView.tsx`:

```ts
type BoardLaneViewProps = {
  // ...existing props...
  availableTags: ReadonlyArray<CardTagsRowTag>;
  onAddTag: (input: { cardId: string; name: string }) => Promise<void>;
  onDetachTag: (input: { cardId: string; tagId: string }) => Promise<void>;
};
```

Pass them down identically through each layer. **Do not** transform or memoize the callbacks at intermediate layers — the originals from the screen come in already memoized.

- [ ] **Step 3a: Format the canvas folder**

```bash
npx prettier --write src/features/boards/BoardCanvas
```

- [ ] **Step 3b: Typecheck**

```bash
npm run typecheck
```

Expected: errors will surface on board-screen consumers (`BoardWorkspaceScreen.tsx` / `BoardDetailScreen.tsx`) for the new required props on the top-level fan-out component. Those parents are wired in Task 12. To keep this commit's build green, temporarily pass empty/no-op stubs from the parents — find each `<BoardCanvas ... />` (or whichever component the screen renders) and add:

```tsx
availableTags={[]}
onAddTag={async () => undefined}
onDetachTag={async () => undefined}
```

Task 12 replaces these stubs with the real `useTagMutations` wiring. Re-run `npm run typecheck`.

Expected after stubs: clean.

- [ ] **Step 3c: Run tests**

```bash
npm run test
```

Expected: existing canvas tests may fail because their `<CardInterior />` render harnesses don't pass the new props yet — Step 4 fixes those. If only the harness-related tests fail, defer to Step 4. If anything else fails, stop and investigate before committing.

If only harness-related tests fail, proceed to Step 3d.

- [ ] **Step 3d: Commit fan-out plumbing (save-point)**

Even though `npm run test` may have lingering failures from the harnesses (Step 4), `npm run typecheck` is clean. Commit anyway? **No** — the convention says no broken tree commits. Instead, fold Steps 3 → 4 into a single commit by skipping this 3d save-point and going straight to Step 4. If the harnesses already pass (no failures introduced), commit here:

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(boards): thread tag props through CardInterior and lane fan-out

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

If you skipped the commit because tests are red, mark this step done anyway — the harness updates in Step 4 will land everything in the Step 8 commit.

- [ ] **Step 4: Update existing canvas tests to pass default empty arrays for the new props**

Tests that render `<CardInterior />` directly (e.g. `BoardCanvas.inline-edit-card-title.test.tsx`, `BoardCanvas.inline-rename.test.tsx`, `BoardCanvas.priority-grouping.test.tsx`, `BoardCanvas.inline-edit-card-description.test.tsx`) need stubs:

```tsx
availableTags={[]}
onAddTag={async () => undefined}
onDetachTag={async () => undefined}
```

Mock card fixtures that currently set `card = {...}` need a `tags: []` field. Find `cards: []` literals in those test fixtures and append `tags: []` to each card.

```bash
rg -n "tags:" src/features/boards/BoardCanvas
```

Use that to ensure all canvas-related card fixtures now include `tags: []`.

- [ ] **Step 5: Format**

```bash
npx prettier --write src/features/boards/BoardCanvas
```

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```

Expected: clean. Any TS error here means a fan-out layer was missed; fix it before tests.

- [ ] **Step 7: Run all tests**

```bash
npm run test
```

Expected: green. Existing inline-edit / drag / priority tests should still pass with the harness-stubbed props.

- [ ] **Step 8: Commit (test harness updates, plus fan-out if Step 3d was skipped)**

```bash
git add -A
git commit -m "$(cat <<'EOF'
test(boards): update CardInterior harnesses for new tag props

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

If Step 3d's save-point commit was skipped (tests were red after Step 3), this commit absorbs both the fan-out plumbing AND the harness updates. In that case, change the commit subject to:

```
feat(boards): wire CardTagsRow into CardInterior and propagate tag props
```

---

## Task 12: `useTagMutations` + board screens load and plumb the tag list

**Files:**

- Create: `src/features/boards/useTagMutations.ts`
- Modify: `src/features/boards/BoardDetailScreen.tsx`, `src/features/boards/BoardWorkspaceScreen.tsx`

- [ ] **Step 1: Create `src/features/boards/useTagMutations.ts`**

```ts
import { useCallback } from "react";

import { trpc } from "../../trpc/client";

type UseTagMutationsInput = {
  boardId: string;
  onAnnounce: (message: string) => void;
};

export function useTagMutations({ boardId, onAnnounce }: UseTagMutationsInput) {
  const utils = trpc.useUtils();

  const invalidate = useCallback(async () => {
    await Promise.all([
      utils.tag.list.invalidate(),
      utils.card.listByBoard.invalidate({ boardId }),
      utils.board.getWithColumnsAndCards.invalidate({ boardId }),
      // card.get is per-cardId; invalidate broadly
      utils.card.get.invalidate(),
    ]);
  }, [boardId, utils]);

  const addTagMutation = trpc.tag.addToCard.useMutation({
    onSuccess: async (_data, variables) => {
      await invalidate();
      onAnnounce(`Tag ${variables.name} added.`);
    },
  });

  const detachTagMutation = trpc.tag.detachFromCard.useMutation({
    onSuccess: async () => {
      await invalidate();
      onAnnounce("Tag removed.");
    },
  });

  const addTag = useCallback(
    async (input: { cardId: string; name: string }) => {
      await addTagMutation.mutateAsync(input);
    },
    [addTagMutation],
  );

  const detachTag = useCallback(
    async (input: { cardId: string; tagId: string }) => {
      await detachTagMutation.mutateAsync(input);
    },
    [detachTagMutation],
  );

  return { addTag, detachTag };
}
```

- [ ] **Step 2: Plumb into `src/features/boards/BoardWorkspaceScreen.tsx`**

Inside the screen component, add:

```tsx
const tagListQuery = trpc.tag.list.useQuery({});
const availableTags = useMemo(() => tagListQuery.data ?? [], [tagListQuery.data]);

const { addTag, detachTag } = useTagMutations({
  boardId,
  onAnnounce,
});
```

Find every spot where the screen renders `<BoardCanvas ... />` (or whichever top-level fan-out component receives the card data) and pass:

```tsx
availableTags = { availableTags };
onAddTag = { addTag };
onDetachTag = { detachTag };
```

If the screen also calls `buildBoardLanes` and `canReorderBoard` directly, ensure those calls now pass `tags: search.tags` (which is parsed in Task 6).

- [ ] **Step 3: Plumb into `src/features/boards/BoardDetailScreen.tsx`**

Apply the same three-block change (tag list query, mutations hook, prop pass-through) to `BoardDetailScreen.tsx`.

- [ ] **Step 4: Format**

```bash
npx prettier --write \
  src/features/boards/useTagMutations.ts \
  src/features/boards/BoardWorkspaceScreen.tsx \
  src/features/boards/BoardDetailScreen.tsx
```

- [ ] **Step 5: Typecheck and test**

```bash
npm run typecheck && npm run test
```

Expected: clean + green.

- [ ] **Step 6: Manual verification in browser**

```bash
npm run dev
```

Navigate to a board with at least one card. Verify:

- The card body shows a `+` button below the description.
- Clicking `+` opens a popover.
- Typing "MyTag" + Add adds the tag; the pill appears on the card.
- The `×` on the pill removes it.
- Adding a tag on Card A makes it appear in the popover list when adding to Card B.
- Typing "mytag" (different casing) when "MyTag" exists rewrites the master to "mytag" — Card A's pill now shows "mytag".

If anything is visually wrong (token contrast, pill spacing), capture observations but defer fixes to Task 15 sweep unless blocking.

Stop the dev server (Ctrl-C).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(boards): load tag.list and wire useTagMutations into board screens

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Add tags panel to `CardDetailSurface`

**Files:**

- Modify: `src/features/boards/CardDetailSurface.tsx`

- [ ] **Step 1: Add the imports**

At the top of `CardDetailSurface.tsx`:

```ts
import { CardTagsRow } from "./BoardCanvas/CardTagsRow";
import { useTagMutations } from "./useTagMutations";
```

- [ ] **Step 2: Add the local `tag.list` query and the mutation hook**

Inside the component body, after the existing `cardQuery = trpc.card.get.useQuery(...)`:

```tsx
const tagListQuery = trpc.tag.list.useQuery({});
const availableTags = tagListQuery.data ?? [];

const { addTag, detachTag } = useTagMutations({
  boardId: resolvedBoardId,
  onAnnounce,
});
```

- [ ] **Step 3: Add a `BoardSurface` panel with the row**

After the form `<BoardSurface>` (the one currently containing `FormRoot`), insert a new sibling `BoardSurface`:

```tsx
<BoardSurface padding="$4">
  <YStack gap="$3">
    <Text fontWeight="700" color="$boardHeading">
      Tags
    </Text>
    <CardTagsRow
      attachedTags={card.tags}
      availableTags={availableTags}
      onAddTag={(name) => addTag({ cardId: card.id, name })}
      onDetachTag={(tagId) => detachTag({ cardId: card.id, tagId })}
    />
  </YStack>
</BoardSurface>
```

- [ ] **Step 4: Format**

```bash
npx prettier --write src/features/boards/CardDetailSurface.tsx
```

- [ ] **Step 5: Typecheck and test**

```bash
npm run typecheck && npm run test
```

Expected: clean + green.

- [ ] **Step 6: Manual verification**

Start dev server, click a card to open the detail modal, confirm:

- The bottom of the modal shows a "Tags" panel with a `+` button.
- The pills already on the canvas card also appear in the modal.
- Adding/removing tags in the modal reflects on the canvas card behind it.
- The modal subtitle reads "Edit title, description, priority, and tags from this surface." (no "subtasks").

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(boards): mirror CardTagsRow inside the card detail modal

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Drawer-based Tags filter section

**Files:**

- Modify: `src/features/boards/BoardDrawer.tsx`

- [ ] **Step 1: Inspect the existing Priority section as the template**

```bash
rg -n "Priority|priority" src/features/boards/BoardDrawer.tsx
```

Note its structure: a heading, a chip group, click handlers calling something like `togglePrioritySelection` and updating the URL search params.

- [ ] **Step 2: Add a Tags section to `BoardDrawer.tsx`**

Inside the drawer, below the priority section, add (importing as needed):

```tsx
import { trpc } from "../../trpc/client";
import { serializeTagFilter, toggleTagSelection } from "./model";
import { getTagSwatch } from "./tagPalette";

// inside the component:
const tagListQuery = trpc.tag.list.useQuery({});
const availableTags = tagListQuery.data ?? [];
const selectedTags = search.tags;

// inside the JSX, after the Priority section:
<YStack gap="$2">
  <Text fontWeight="700" color="$boardHeading">
    Tags
  </Text>
  {availableTags.length === 0 ? (
    <Text color="$boardTextMuted">No tags yet. Add one to a card to get started.</Text>
  ) : (
    <XStack gap="$2" flexWrap="wrap">
      {availableTags.map((tag) => {
        const isActive = selectedTags.includes(tag.normalizedName);
        const swatch = getTagSwatch(tag.normalizedName);
        return (
          <BoardActionButton
            key={tag.id}
            tone={isActive ? "accent" : "ghost"}
            backgroundColor={isActive ? (swatch.backgroundColor as any) : undefined}
            onPress={() => {
              const next = toggleTagSelection(selectedTags, tag.normalizedName);
              navigate({
                search: (prev) => ({ ...prev, tags: serializeTagFilter(next) }),
                replace: true,
              });
            }}
          >
            {tag.name}
          </BoardActionButton>
        );
      })}
      {selectedTags.length > 0 ? (
        <BoardActionButton
          tone="ghost"
          onPress={() =>
            navigate({
              search: (prev) => ({ ...prev, tags: undefined }),
              replace: true,
            })
          }
        >
          Clear
        </BoardActionButton>
      ) : null}
    </XStack>
  )}
</YStack>;
```

The exact `navigate` API call (`router.navigate`, `useNavigate`, `setSearch`, etc.) depends on what the existing priority section uses — copy that pattern verbatim.

- [ ] **Step 3: Update the toolbar "Filtered" indicator (if any) to fold in tags**

```bash
rg -n "priority\.length" src/features/boards | rg -v test
```

For each match in non-test code that drives the "Filtered" badge condition, change `priority.length > 0` to `priority.length > 0 || tags.length > 0`.

- [ ] **Step 4: Format**

```bash
npx prettier --write src/features/boards/BoardDrawer.tsx
```

- [ ] **Step 5: Typecheck and test**

```bash
npm run typecheck && npm run test
```

Expected: clean + green.

- [ ] **Step 6: Manual verification in browser**

Open the drawer, confirm:

- A "Tags" section appears under "Priority".
- Existing tags listed with their swatches.
- Clicking a tag chip flips its `tone` to `accent` and updates the URL (`?tags=bug`). Reload preserves the filter.
- Cards lacking the selected tag disappear from the canvas.
- Clear removes the filter.
- With the filter active, drag-to-reorder is disabled (the existing priority-filter behavior gates this; verify by trying to drag a card and confirming it doesn't move).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(boards): add Tags filter section to BoardDrawer

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Touch-up sweep + final verification

**Files:**

- Various — wherever a sweep finds prose still mentioning subtasks, plus any prettier-stale files.

- [ ] **Step 1: Find every doc that still mentions subtasks**

```bash
rg -n "subtask" docs/ -i
```

For each match, decide: is it factually about the now-removed subtasks feature? If so, edit the prose. If it's a historical PR description or an unrelated doc, leave it alone.

Likely files to update:

- `docs/kanban-app-requirements.md`
- `docs/kanban-frontend-implementation-checklist.md`
- `docs/kanban-backend-implementation-checklist.md`
- `docs/ux-specs/*.md` (if any)

If a doc is essentially a checklist that included "implement subtasks" as a checked item, append a brief note: `(removed in 2026-04-26 tags rewrite — see docs/superpowers/specs/2026-04-26-replace-card-subtasks-with-tags-design.md)`.

- [ ] **Step 2: Final prettier sweep**

```bash
npm run format
```

- [ ] **Step 3: Final typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Final test**

```bash
npm run test
```

Expected: all green.

- [ ] **Step 5: Final lint**

```bash
npm run lint
```

Expected: clean. Fix any newly-introduced lint complaints (unused imports, missing dep arrays in `useCallback`/`useMemo`, etc.).

- [ ] **Step 6: Final manual smoke in browser**

Run the app one more time and exercise: add a tag, attach to multiple cards, type-rewrite casing, detach via `×`, filter via drawer, clear filter, open card detail modal, verify modal mirror, soft-delete a card and confirm the tag remains in the master list.

- [ ] **Step 7: Commit any sweep changes**

```bash
git add -A
git commit -m "$(cat <<'EOF'
docs: align prose with subtasks → tags rewrite

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)" || echo "nothing to commit"
```

---

## Verification at end

The feature is complete when:

- `npm run typecheck` clean.
- `npm run test` green (every test file passing).
- `npm run lint` clean.
- `npm run format:check` clean.
- A manual run-through in the browser exercises every behavior listed in the spec's Goals section (Sections 1–7 of the Design).
- A `rg "subtask" src/` (case-insensitive) returns zero hits.
- A `rg "subtask" docs/` (case-insensitive) only matches historical / unrelated content (verified by hand).

If any of those fails, the plan is not done. Fix and recheck.
