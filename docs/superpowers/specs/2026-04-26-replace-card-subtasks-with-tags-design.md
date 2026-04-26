---
title: Replace card subtasks with tags
date: 2026-04-26
status: draft
---

## Summary

Replace the **card subtasks** feature with a new **card tags** feature.

- Subtasks are removed entirely: table dropped, server module deleted, all UI gone.
- Tags are a new account-scoped many-to-many concept attached to cards.
- A tag added to one card becomes available to attach to any other card belonging to the same user, across boards.
- Tags appear on each card as a horizontal, wrapping pill row directly below the description.
- A `+` button at the head of the row opens a Tamagui popover (same pattern as the existing priority popover) listing the user's existing tags plus a typed-input "Add" affordance.
- Each pill carries its own `×` button for detaching.
- Tags are filterable from the board drawer (parity with the priority filter, but only inside the drawer — no toolbar chips). Grouping by tag is **not** in scope for this cut.

## Context

Subtasks live in:

- `card_subtasks` table (`drizzle/pg/0005_illegal_ultragirl.sql`).
- `src/server/db/schema.ts` (`cardSubtasks`, `cardSubtasksRelations`, plus a `subtasks: many(cardSubtasks)` line on `cardsRelations`).
- `src/server/subtask/` (repo, service, both their tests).
- `src/server/trpc/routers/subtask.ts`, wired into `appRouter` in `src/server/trpc/router.ts`.
- `src/server/board/repo-shared.ts` (`getOwnedSubtask`, `lockOwnedSubtask`, `listActiveSubtasksForCard`).
- `src/server/card/repo.ts` (`CardDetailRow.subtasks`, the join in `getCard`, the cascade in `softDeleteCard`).
- `src/server/board/repo.ts` (cascade on board soft-delete).
- `src/features/boards/types.ts` (`SubtaskSummary`).
- `src/features/boards/CardDetailSurface.tsx` (full subtasks panel: header, input row, per-row checkbox/edit/delete, "X complete subtasks" pill, modal description copy).
- `src/features/boards/BoardDetailScreen.tsx` (the "subtasks" word in the delete-board confirmation copy).
- `src/server/board/repo.test.ts`, `src/server/card/repo.test.ts` (assertions / cascade tests).

The priority popover at [src/features/boards/BoardCanvas/CardInterior.tsx:115-217](../../../src/features/boards/BoardCanvas/CardInterior.tsx) is the reference for the popover pattern — Tamagui `Popover` wrapped in `<Theme name="light">`, with a custom `onMouseDown` handler that uses a 5px drag threshold to discriminate "open popover" from "start dragging the card."

Existing data persistence conventions (per `AGENTS.md`):

- `version` column for optimistic concurrency.
- `deleted_at` for soft-delete.
- `owner_id`-scoped queries via service-layer helpers in `repo-shared.ts`.
- RLS enabled with explicit deny-all policies; ownership enforced in the service layer.
- Migrations include `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` blocks in the same file.

## Goals

- Drop subtasks entirely: schema, server module, UI, tests, copy strings.
- Add a new account-scoped tag system with these semantics:
  - **Identity:** case-insensitive match on `trim(name).toLowerCase()`. Inner whitespace preserved (`"BlackCat"` ≠ `"Black Cat"`).
  - **Casing rewrite is global:** typing `"bug"` when `"Bug"` already exists rewrites the master tag's display name to `"bug"`, and every card that displays it now renders `"bug"`.
  - **Color is auto-derived** from a deterministic hash of the tag's normalized name into a fixed 8-swatch palette. No user color picker.
  - **Master list is grow-only.** No global delete or rename UI in this cut. Detaching the last card from a tag leaves it in the master list for future use.
- Render tags on each card as a wrapping pill row, with a `+` trigger and per-pill `×` detach.
- Mirror the same row inside [src/features/boards/CardDetailSurface.tsx](../../../src/features/boards/CardDetailSurface.tsx).
- Add a board drawer "Tags" filter section with parity to the priority section.
- Reuse the priority popover's drag-threshold gesture pattern via a single shared hook.
- All work follows project rules (Tamagui-only, RLS migration, prettier, owner-scoped queries, version-bumped writes where applicable).

## Non-goals

- Global tag management (rename, delete from all cards) — explicitly deferred.
- Group-by-tag in the board's lane builder — deferred.
- Toolbar tag chips — drawer only.
- Migrating subtask titles into tag values — subtask data is dropped outright.
- Per-card tag reordering — insertion order is the only sort.
- E2E (Playwright) coverage of the new feature — out of scope unless an existing E2E covers the priority filter and we want exact parity.

## Design

### 1. Data model

Single migration `drizzle/pg/0006_<drizzle-generated-slug>.sql`, two phases:

**Phase A — drop subtasks**

```sql
DROP TABLE card_subtasks;
```

(All RLS policies on the table drop with it.)

**Phase B — create tags + card_tags**

```sql
CREATE TABLE tags (
  id              uuid PRIMARY KEY,
  owner_id        text NOT NULL,
  name            text NOT NULL,
  normalized_name text NOT NULL,
  version         integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE UNIQUE INDEX tags_owner_normalized_unique
  ON tags (owner_id, normalized_name)
  WHERE deleted_at IS NULL;

CREATE TABLE card_tags (
  card_id    uuid NOT NULL REFERENCES cards(id),
  tag_id     uuid NOT NULL REFERENCES tags(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, tag_id)
);
CREATE INDEX card_tags_tag_idx  ON card_tags (tag_id);
CREATE INDEX card_tags_card_idx ON card_tags (card_id);

ALTER TABLE tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_select_none      ON tags      FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY tags_insert_none      ON tags      FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY tags_update_none      ON tags      FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY tags_delete_none      ON tags      FOR DELETE TO anon, authenticated USING (false);
CREATE POLICY card_tags_select_none ON card_tags FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY card_tags_insert_none ON card_tags FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY card_tags_update_none ON card_tags FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY card_tags_delete_none ON card_tags FOR DELETE TO anon, authenticated USING (false);
```

**Drizzle schema** in `src/server/db/schema.ts`:

- Remove `cardSubtasks`, `cardSubtasksRelations`, and the `subtasks: many(cardSubtasks)` line on `cardsRelations`.
- Add `tags`, `cardTags`, `tagsRelations`, `cardTagsRelations`, plus `tags: many(cardTags)` on `cardsRelations`.

**Constraints / caps:**

- `name` length: enforced server-side via zod (`1..40`), no DB CHECK constraint.
- `name` cannot contain a literal comma (`,`). The drawer filter URL param uses `,` as the value separator (Section 5), so allowing commas in names would break round-trip parsing. Enforced via `z.string().refine((v) => !v.includes(","), "Tag name cannot contain a comma")`.
- Per-card cap: 20 tags, enforced inside the `addTagToCard` transaction (count after insert; throw to roll back if exceeded).
- `normalized_name` is `trim(rawName).toLowerCase()`. Inner whitespace preserved verbatim.
- `tags.deleted_at` is kept for parity even though no UI deletes a tag in this cut.

**Card-tag attachment is binary membership.** No `version` on `card_tags`. Idempotent inserts use `ON CONFLICT DO NOTHING`.

### 2. Server: repo, service, router

**New module `src/server/tag/`:** `repo.ts`, `service.ts`, `repo.test.ts`, `router.test.ts`.

**`src/server/board/repo-shared.ts`:** remove the three subtask helpers; add `getOwnedTag`, `lockOwnedTag`, `listTagsForCards`.

**`repo.ts` exports:**

| Function                                        | Purpose                                                                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `listTagsForOwner({ ownerId })`                 | Returns all non-deleted tags for the owner, ordered by `name ASC`. Shape: `{ id, name, normalizedName, version }[]`. |
| `addTagToCard({ ownerId, cardId, rawName })`    | Atomic find-or-create + casing-update + attach. Validates length, caps, ownership.                                   |
| `detachTagFromCard({ ownerId, cardId, tagId })` | Verifies card ownership; deletes the join row. Idempotent.                                                           |
| `listTagsForCards({ ownerId, cardIds })`        | Bulk hydration helper for board / list queries. Returns `Map<cardId, Tag[]>`.                                        |

**`addTagToCard` algorithm (single transaction):**

```
1.  rawTrimmed = rawName.trim()
2.  normalized = rawTrimmed.toLowerCase()
3.  validate: rawTrimmed.length in 1..40, normalized non-empty
4.  lockOwnedCard(tx, { ownerId, cardId })       -- aborts if not owned
5.  SELECT id, name, version FROM tags
    WHERE owner_id = ? AND normalized_name = ? AND deleted_at IS NULL
    FOR UPDATE
6.  if found:
      if found.name !== rawTrimmed:
        UPDATE tags SET name = rawTrimmed, version = version + 1, updated_at = now()
        WHERE id = found.id
      tagId = found.id
    else:
      INSERT INTO tags (id, owner_id, name, normalized_name, version, …) VALUES (…)
      tagId = newId
7.  INSERT INTO card_tags (card_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING
8.  SELECT count(*) FROM card_tags WHERE card_id = ?
    if count > 20: throw TRPCError BAD_REQUEST (transaction rolls back)
9.  touchCard(tx, { cardId, now })
    touchBoard(tx, { boardId, now })
```

**Card.version is not bumped on attach/detach.** Membership is binary; bumping `cards.version` would invalidate every other tab's `expectedVersion` for unrelated edits (title/description/priority) and produce spurious 409s. `touchCard` + `touchBoard` keep `updated_at` ticking for query invalidation.

**`service.ts`** is a thin owner-scoping wrapper, identical pattern to `cardService`:

```ts
export const listTagsForUser = (ownerId: string) => listTagsForOwner({ ownerId });
export const addTagToCardForUser = (ownerId: string, input) => addTagToCard({ ownerId, ...input });
export const detachTagFromCardForUser = (ownerId: string, input) =>
  detachTagFromCard({ ownerId, ...input });
```

**`src/server/trpc/routers/tag.ts`:**

```ts
export const tagRouter = t.router({
  list: protectedProcedure.input(z.object({})).query(({ ctx }) => listTagsForUser(ctx.userId)),
  addToCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string().uuid(),
        name: z.string().trim().min(1).max(40),
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

`src/server/trpc/router.ts` drops the `subtask: subtaskRouter` line and adds `tag: tagRouter`.

**Card hydration changes** in `src/server/card/repo.ts`:

- `CardDetailRow.subtasks` → `CardDetailRow.tags: { id: string; name: string; normalizedName: string }[]`.
- `getCard` swaps the subtask join for a `card_tags ⨝ tags` join, ordered `ASC (card_tags.created_at, tags.id)`.
- `CardListItemRow` is unchanged in shape; `listCardsByBoard` adds an `tags?: string[]` filter (see Section 5) and, for hydration, calls `listTagsForCards({ cardIds })` after the main paginated query and attaches the tag arrays in memory.
- `getBoardWithColumnsAndCards` (board canvas hydration) issues one `listTagsForCards` keyed by all card ids on the board and attaches in memory. No N+1.

**Cascades:**

- Card soft-delete (`softDeleteCard`): hard-delete the card's `card_tags` rows in the same transaction.
- Board soft-delete: same — hard-delete `card_tags` rows for all descendant cards.
- Tag rows are not touched on card or board soft-delete (tags are account-scoped, not card- or board-scoped).

### 3. Canvas card UI

**New row in [CardInterior.tsx](../../../src/features/boards/BoardCanvas/CardInterior.tsx)** between the description and the bottom row.

**New component `src/features/boards/BoardCanvas/CardTagsRow.tsx`:**

```tsx
<XStack gap="$2" flexWrap="wrap" alignItems="center">
  <TagAddButton ... popover anchor ... />
  {attachedTags.map((tag) => (
    <TagPill key={tag.id} tag={tag} onDetach={() => onDetachTag(tag.id)} />
  ))}
</XStack>
```

**`CardInterior` / `CardPreview` prop additions** (cardId is already available from the existing `card.id`, so callbacks take only the new value):

- `availableTags: Tag[]` — full master list.
- `attachedTags: Tag[]` — this card's tags, in `card_tags.created_at ASC` order.
- `onAddTag(name: string): Promise<void>`.
- `onDetachTag(tagId: string): Promise<void>`.

`CardTagsRow` accepts the same `availableTags` / `attachedTags` and forwards `onAddTag` / `onDetachTag` unchanged. The parent (`BoardWorkspaceScreen` / `BoardDetailScreen`) curries `cardId` when wiring up the mutations, e.g. `(name) => addTag.mutateAsync({ cardId: card.id, name })`.

**`TagAddButton` (the `+` trigger + popover):**

- Tamagui `Popover` wrapped in `<Theme name="light">`, identical structure to the priority popover.
- Drag-threshold gesture extracted into `src/features/boards/BoardCanvas/useDragSafePress.ts` (5 px threshold, mirrors the existing priority button's `onMouseDown` logic). The priority button is migrated to use the same hook in this change.
- `aria-label="Add tag"`, glyph `+`.

**Popover content:**

```tsx
<YStack gap="$2" width={260}>
  <Text fontWeight="700">Tags</Text>
  <XStack gap="$2">
    <Input
      value={query}
      onChange={tamaguiInputValueOnChange(setQuery)}
      placeholder="Find or create…"
      onKeyDown={(e) => e.key === "Enter" && submitAdd()}
      flex={1}
    />
    <BoardActionButton
      tone="accent"
      disabled={query.trim().length === 0 || addTag.isPending}
      onPress={submitAdd}
    >
      Add
    </BoardActionButton>
  </XStack>
  <YStack gap="$1" maxHeight={240} overflow="auto">
    {filtered.map((tag) => (
      <BoardActionButton
        key={tag.id}
        tone={isAttached(tag) ? "accent" : "ghost"}
        disabled={isAttached(tag)}
        onPress={() => onAddTag({ cardId, name: tag.name })}
      >
        <TagSwatch normalizedName={tag.normalizedName} /> {tag.name}
      </BoardActionButton>
    ))}
    {filtered.length === 0 && query.length > 0 ? (
      <Text color="$boardTextMuted">No matches. Press Add to create "{query.trim()}".</Text>
    ) : null}
  </YStack>
</YStack>
```

- `filtered = availableTags` filtered by `tag.normalizedName.includes(query.trim().toLowerCase())`.
- Already-attached tags appear in the list but are disabled with `accent` tone, so the user sees what's already on the card.
- `submitAdd()` calls `onAddTag(query.trim())`, then clears `query` and closes the popover on success.

**Casing-rewrite asymmetry — explicit:**

- Clicking an existing (unattached) tag's row in the popover passes `tag.name` (the master's current display form) to `onAddTag`. Server's `addTagToCard` sees `rawTrimmed === found.name` in step 6 and skips the `UPDATE`. **No global rename occurs from a list click.**
- Typing `"bug"` and pressing Add (or Enter) when the master has `"Bug"` passes `"bug"`. Server sees `rawTrimmed !== found.name`, runs the `UPDATE`. **Global rename occurs.**

This matches user intent: clicking "I want this tag" preserves the existing label; typing "I want a tag named X" asserts the new casing as canonical.

**`TagPill`:**

- Display name + always-visible `×`.
- Background and text colors come from `getTagSwatch(tag.normalizedName)`.
- `borderRadius="$3"`, small padding.
- The `×` is a Tamagui `Button` with `aria-label={`Remove tag ${tag.name}`}`. Its `onMouseDown` calls `event.stopPropagation()` so a press on `×` does not bubble up to the card's hello-pangea drag-handle and start a drag. The pill itself (the area outside the `×`) is non-interactive — a press on the pill body falls through to the drag handle as expected.

**`src/features/boards/tagPalette.ts`:**

```ts
const TAG_PALETTE = [
  { backgroundColor: "$boardTagSwatch1Bg", textColor: "$boardTagSwatch1Text" },
  // 7 more entries
];

export function getTagSwatch(normalizedName: string) {
  // FNV-1a hash of normalizedName, mod TAG_PALETTE.length.
  return TAG_PALETTE[fnv1a(normalizedName) % TAG_PALETTE.length];
}
```

Adds 8 token pairs (`$boardTagSwatch1Bg/Text` … `$boardTagSwatch8Bg/Text`, light + dark variants) in the existing Tamagui config (the file housing `$boardPriorityHighBg` etc.). Each pair must meet WCAG AA contrast (text-on-background).

**Wiring at the board level:**

- `src/features/boards/useTagMutations.ts` exposes `addTag`, `detachTag` via `trpc.tag.addToCard.useMutation` / `trpc.tag.detachFromCard.useMutation`. Both invalidate `tag.list`, `card.get`, `card.listByBoard`, and `board.getWithColumnsAndCards`.
- `BoardWorkspaceScreen.tsx` and `BoardDetailScreen.tsx` issue `trpc.tag.list.useQuery({})` once each and thread `availableTags` + the tag callbacks through the existing column/lane prop drill. Memoize `availableTags` so unrelated tag mutations don't re-render unaffected cards.

**Accessibility:**

- `+` button reachable via Tab, opens popover on Enter/Space.
- Popover traps focus while open; Esc closes; focus returns to `+`.
- `×` on each pill is reachable via Tab.
- Live-region announcements: `"Tag {name} added."` / `"Tag {name} removed."` dispatched from `useTagMutations`.

### 4. Card detail modal

[CardDetailSurface.tsx](../../../src/features/boards/CardDetailSurface.tsx) becomes shorter.

**Removals:**

- All four subtask mutations (`createSubtask`, `updateSubtask`, `toggleSubtask`, `deleteSubtask`).
- All three subtask state vars (`newSubtaskTitle`, `editingSubtaskId`, `editingSubtaskTitle`).
- The entire second `BoardSurface` panel (lines 351–496).
- The `<BoardPill>{completedCount} complete subtasks</BoardPill>` chip and the `completedCount` derived value.
- `description="Edit title, description, priority, and subtasks from this surface."` on `PrettyModalWrap` (three call sites) → `"Edit title, description, priority, and tags from this surface."`.
- The `Checkbox` and `Input` imports if no longer used after the swap.
- `SubtaskSummary` from `src/features/boards/types.ts`.

**Additions:** a new `BoardSurface` after the form panel, containing a shared `CardTagsRow`:

```tsx
<BoardSurface padding="$4">
  <YStack gap="$3">
    <Text fontWeight="700" color="$boardHeading">
      Tags
    </Text>
    <CardTagsRow
      cardId={card.id}
      attachedTags={card.tags}
      availableTags={tagListQuery.data ?? []}
      onAddTag={(name) => addTag.mutateAsync({ cardId: card.id, name })}
      onDetachTag={(tagId) => detachTag.mutateAsync({ cardId: card.id, tagId })}
    />
  </YStack>
</BoardSurface>
```

`tagListQuery` is a local `trpc.tag.list.useQuery({})` inside the modal; react-query dedupes against the board-level call, so no extra network. `card.tags` is supplied by the updated `CardDetailRow` shape.

Tags live **outside** `FormRoot` (mutations are independent of the title/description/priority form submit).

### 5. Drawer-based filter

**URL search params** in `src/features/boards/types.ts`:

```ts
export type BoardDetailSearch = {
  card?: string;
  view: BoardViewMode;
  groupBy: BoardGroupBy;
  priority: CardPriority[];
  tags: string[]; // NEW — normalized names ("bug", "needs review")
  drawer?: string;
};
```

The `tags=` URL value carries `normalized_name`s, not ids. Stable across the global casing rewrite, readable, and inner spaces survive as `%20`.

**Helpers in `src/features/boards/model.ts`** (parallel to the priority helpers):

```ts
function parseTagFilter(value: string | undefined): string[] {
  if (!value) return [];
  const out = new Set<string>();
  for (const entry of value.split(",")) {
    const norm = entry.trim().toLowerCase();
    if (norm.length > 0) out.add(norm);
  }
  return [...out];
}
export function serializeTagFilter(tags: string[]) {
  return tags.length > 0 ? tags.join(",") : undefined;
}
export function toggleTagSelection(selected: string[], tag: string): string[] {
  const set = new Set(selected);
  if (set.has(tag)) set.delete(tag);
  else set.add(tag);
  return [...set];
}
```

`parseBoardDetailSearch` reads `tags` from `search.tags`.

**Canvas filtering — client-side** in `buildBoardLanes`:

```ts
cards: column.cards
  .filter((card) => {
    if (
      activePriorityFilters.size > 0 &&
      !activePriorityFilters.has(card.priority)
    )
      return false;
    if (activeTagFilters.size > 0) {
      const cardTagSet = new Set(card.tags.map((t) => t.normalizedName));
      const hasMatch = [...activeTagFilters].some((t) => cardTagSet.has(t));
      if (!hasMatch) return false;
    }
    return true;
  })
  .map(...);
```

OR semantics within tags. AND across the priority and tag dimensions.

**List view filtering — server-side.** `listCardsByBoard` accepts `tags?: string[]` (normalized names). When non-empty, the SQL gains:

```sql
... AND EXISTS (
  SELECT 1 FROM card_tags ct
  JOIN tags t ON t.id = ct.tag_id
  WHERE ct.card_id = cards.id
    AND t.owner_id = $ownerId
    AND t.deleted_at IS NULL
    AND t.normalized_name = ANY($normalizedNames)
)
```

Zod input adds `tags: z.array(z.string().trim().min(1).max(40)).max(20).optional()`. Server normalizes (lowercases) inputs before query.

**`canReorderBoard`** extends with `&& input.tags.length === 0`. Reordering with a tag filter active is non-deterministic for the same reason priority filtering already disables reordering.

**Drawer UI** in `BoardDrawer.tsx`: a "Tags" section under the existing "Priority" section, mirroring its UX. Each chip uses the `TagSwatch` palette; selected chips get the `accent` tone; clicks call `toggleTagSelection` and update the URL via the existing search-params router. Empty state when the user has zero tags account-wide: `<Text color="$boardTextMuted">No tags yet. Add one to a card to get started.</Text>`.

**Outside-drawer filter indicator:** the existing "Filtered" indicator (toolbar) extends to `priority.length > 0 || tags.length > 0`. No new toolbar chips.

### 6. Testing

**Server tests** (Vitest + `node:assert/strict`, real DB via `migrateTestDb()`):

- **New `src/server/tag/repo.test.ts`:**
  - `addTagToCard` happy path: creates tag + join row.
  - Find-or-create dedupe + casing rewrite: typing `"Bug"` then `"bug"` produces a single tag row, `name` rewritten to `"bug"`, `version` incremented.
  - Inner-space distinction: `"BlackCat"` and `"Black Cat"` are separate rows.
  - Whitespace trim before normalization.
  - Per-card cap: 20 succeed, 21st throws.
  - Length cap: 41 chars throws.
  - Comma in name throws (URL-separator constraint).
  - Idempotent re-attach: no error, no duplicate row.
  - Owner scoping: cross-owner attach rejected.
  - Global casing rewrite from typed input: tag attached to card-1 with `"Bug"`, then `addTagToCard(card-2, "bug")` → both cards now show `"bug"`, `version` incremented.
  - **No** rewrite when the existing display matches: `addTagToCard(card-2, "Bug")` after card-1 already had `"Bug"` → tag's `version` and `updated_at` are unchanged.
  - `detachTagFromCard` idempotent.
  - `listTagsForOwner` only returns own tags, sorted `name ASC`.
  - `listTagsForCards` bulk: 3 cards with overlapping sets, verifies the `Map` and per-card insertion order.
  - Cascade on card soft-delete: `card_tags` rows for that card are gone.
  - Cascade on board soft-delete: `card_tags` rows for descendant cards are gone.

- **New `src/server/tag/router.test.ts`:**
  - `tag.list` returns `[]` for fresh user.
  - Unauthenticated → `UNAUTHORIZED`.
  - Zod validation (empty name, name too long, missing `cardId`).
  - Cross-user `cardId` → `NOT_FOUND`.

- **Updated `src/server/card/repo.test.ts`:** swap `subtasks` assertion → `tags`. Add a `listCardsByBoard` test with the `tags` filter (3 cards, mixed sets, filter to one tag, only matching cards back, cursor pagination still works).

- **Updated `src/server/board/repo.test.ts`:** the subtask cascade test becomes a tag cascade test.

- **Deleted:** `src/server/subtask/repo.test.ts`, `src/server/subtask/router.test.ts`.

**Model unit tests** in `src/features/boards/model.test.ts`:

- `parseTagFilter("Bug, NEEDS REVIEW")` → `["bug", "needs review"]`.
- `parseTagFilter("bug,Bug")` → `["bug"]` (case-insensitive dedupe).
- `serializeTagFilter([])` → `undefined`. `serializeTagFilter(["bug","x"])` → `"bug,x"`.
- `toggleTagSelection` add and remove.
- `buildBoardLanes` with `tags: ["bug"]`: cards without `"bug"` filtered out, OR semantics for multi-tag filter.
- `buildBoardLanes` with both `priority: ["high"]` and `tags: ["bug"]`: AND across dimensions.
- `canReorderBoard` returns `false` when `tags.length > 0`.

**Component tests** (RTL + jsdom):

- **New `src/features/boards/BoardCanvas.tag-row.test.tsx`:**
  - Pill row renders attached tags in insertion order.
  - `+` button has `aria-label="Add tag"`, opens popover on Enter.
  - Typing in the popover input filters the visible existing-tags list (case-insensitive substring on `normalizedName`).
  - Already-attached tags appear disabled in the popover list.
  - Empty-result hint shows `No matches. Press Add to create "xyzzy".`.
  - Add button submits with `name = query.trim()`; closes popover and clears input on success.
  - Enter in the input has the same effect as Add.
  - `×` on each pill calls `onDetachTag` with the right tag id.
  - `×` `mousedown` does not bubble to the card's drag-handle: simulate `mousedown` on `×`, assert the parent drag-handle's `mousedown` listener is not invoked.
  - Drag threshold on `+`: pressing `+`, mousing 6 px, releasing → popover does **not** open. Pressing in place → popover **does** open.
  - Per `dom-and-focus-tests` skill: focus assertions use `element.focus()` and Vitest's `expect(node).toBe(other)`, never `assert.equal`.

- **Updated existing canvas tests** (priority grouping, inline edit, etc.): verify pass with the new `availableTags`/`attachedTags` props on `CardInterior` defaulted to `[]` in the test harnesses.

- **Updated CardDetailSurface smoke test:** confirm subtasks `BoardSurface` is gone and the tags one mounts.

**Migration sanity:**

- `npm run db:generate` after editing `schema.ts` produces `drizzle/pg/0006_*.sql`.
- `npm run db:migrate` applies it to the dev DB.
- Test DB uses `migrateTestDb()` per the existing convention — no separate test step needed.

### 7. File inventory

**Delete:**

```
src/server/subtask/                                              (entire directory)
src/server/trpc/routers/subtask.ts
```

**Add:**

```
drizzle/pg/0006_<drizzle-generated-slug>.sql

src/server/tag/repo.ts
src/server/tag/repo.test.ts
src/server/tag/service.ts
src/server/tag/router.test.ts
src/server/trpc/routers/tag.ts

src/features/boards/tagPalette.ts
src/features/boards/BoardCanvas/CardTagsRow.tsx
src/features/boards/BoardCanvas/useDragSafePress.ts
src/features/boards/BoardCanvas.tag-row.test.tsx
src/features/boards/useTagMutations.ts
```

Plus 8 token pairs in the Tamagui config.

**Modify:**

- `src/server/db/schema.ts` — drop subtasks, add tags + cardTags + relations.
- `src/server/board/repo-shared.ts` — remove subtask helpers; add `getOwnedTag`, `lockOwnedTag`, `listTagsForCards`.
- `src/server/card/repo.ts` — `CardDetailRow.subtasks` → `tags`; `getCard` join swap; `softDeleteCard` cascade; `listCardsByBoard` tags filter + hydration.
- `src/server/board/repo.ts` — board soft-delete cascades `card_tags` for descendant cards.
- `src/server/trpc/router.ts` — drop `subtask:`, add `tag:`.
- `src/server/trpc/routers/card.ts` — add `tags` to `listByBoard.input`.
- `src/server/card/repo.test.ts`, `src/server/board/repo.test.ts` — assertions / cascade swaps.
- `src/features/boards/types.ts` — `BoardDetailSearch.tags`; remove `SubtaskSummary`.
- `src/features/boards/model.ts` + `model.test.ts` — tag parsers, `buildBoardLanes`, `canReorderBoard`.
- `src/features/boards/BoardCanvas/CardInterior.tsx` — tag row props + render; refactor priority gesture to `useDragSafePress`.
- `src/features/boards/BoardCanvas/index.tsx` (and lane/column files) — thread tag props through.
- `src/features/boards/BoardDetailScreen.tsx` — load `trpc.tag.list`, plumb down; remove "and subtasks" delete-board copy.
- `src/features/boards/BoardWorkspaceScreen.tsx` — same plumbing.
- `src/features/boards/BoardDrawer.tsx` — Tags filter section.
- `src/features/boards/CardDetailSurface.tsx` — full subtasks removal + tags surface.
- `src/features/boards/useBoardMutations.ts` — only if mutation/invalidation is centralized there; otherwise the new hook lives in `useTagMutations.ts`.

**Touch-up sweep:** `rg "subtask" docs/` and update prose in any `docs/ux-specs/*.md` or `docs/kanban-*.md` that mentions subtasks.

## Rollout

Seven sequential phases. Each leaves the app green and committable.

1. **Schema migration.** Edit `schema.ts`, run `npm run db:generate` + `npm run db:migrate`.
2. **Server-side subtask removal.** Drop `src/server/subtask/*`, the router wire-up, and shared helpers. Update `card/repo.ts` and `board/repo.ts` cascade calls (replace subtask cascade with no-op for now). Update card detail row to drop the `subtasks` field. Update server tests.
3. **Server-side tag implementation.** Add `src/server/tag/*` and the `tagRouter`. Add shared helpers. Re-add cascades on card + board soft-delete for `card_tags`. Update card repo to hydrate `tags`. Add server tests.
4. **Type + model layer.** Update `types.ts`, `model.ts`, `model.test.ts`, search-param parsing.
5. **Canvas card UI.** Add `tagPalette.ts`, Tamagui tokens, `CardTagsRow.tsx`, `useDragSafePress.ts`, refactor `CardInterior.tsx`, fan-out plumbing, `useTagMutations.ts`, the canvas test. Manual browser verification on a dev board.
6. **Card detail modal.** Swap subtasks panel for tags panel. Update its smoke test.
7. **Drawer filter.** Add Tags section to `BoardDrawer.tsx`. Manual click-through: add tag, reload, see filter persisted in URL.

Each phase ends with `npx prettier --write` on touched files and a passing `npm run test`.

## Risks / open items

- **Tamagui token addition.** Need to locate the existing `$boardPriority*Bg` definitions and add 8 swatches with light/dark + AA contrast verified. Likely 30–60 min of work; not architecturally risky.
- **Drag-threshold hook extraction.** Refactoring the priority gesture into `useDragSafePress` is a behavior-preserving change; assert the existing priority-popover tests still pass after the swap before adding the tag trigger.
- **Insertion-order ambiguity.** `card_tags.created_at` has millisecond precision; if two attaches land in the same millisecond they're tie-broken by `tag_id` for stability. Order is `ASC (created_at, tag_id)`.
