# Add sample data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an “Add sample data” action in board settings that asks for a card count (1–2000) and creates that many randomized cards across the board’s existing columns via a protected server mutation.

**Architecture:** Add a new protected tRPC mutation `board.addSampleData` with zod validation. Server generates randomized card titles + priorities, assigns cards uniformly at random across active columns, and appends them to each column using fractional ordering (`keyBetween`). Client adds a modal (via `PrettyModalWrap`) adjacent to “Delete board” and calls the mutation, then refreshes board data on success.

**Tech Stack:** React + Tamagui (`@tamagui/*`), react-hook-form, tRPC, zod, Drizzle (Postgres), fractional ordering (`keyBetween`).

---

## File map

**Modify**

- `src/features/boards/BoardDetailScreen.tsx`: add “Add sample data” button + modal + mutation call
- `src/server/trpc/routers/board.ts`: add `addSampleData` mutation
- `src/server/board/service.ts`: add `addSampleDataForUser` service function
- `src/server/card/repo.ts`: add transactional bulk-insert helper to create sample cards

**Optional**

- `src/server/board/router.test.ts` or a new `*.test.ts`: add a basic test for the mutation/service (only if existing test harness makes it cheap)

---

### Task 1: Server mutation + service wiring

**Files:**

- Modify: `src/server/trpc/routers/board.ts`
- Modify: `src/server/board/service.ts`

- [ ] **Step 1: Add router mutation with zod validation**

Add to `boardRouter`:

- input: `{ boardId: uuid, count: int 1..2000 }`
- output: `{ createdCount }`

- [ ] **Step 2: Add service function**

Implement `addSampleDataToBoardForUser(ownerId, { boardId, count })` that calls into the card repo helper.

- [ ] **Step 3: Smoke-check TypeScript build**

Run: `npm run typecheck`
Expected: PASS

---

### Task 2: Transactional bulk insert of sample cards

**Files:**

- Modify: `src/server/card/repo.ts`

- [ ] **Step 1: Implement `addSampleCardsToBoard` helper**

Inside a transaction:

- verify owned board exists and is active (not deleted)
- load active columns; if none, throw `BAD_REQUEST`
- assign `count` to columns uniformly at random
- for each column with \(k > 0\):
  - read last active card position
  - generate \(k\) new fractional positions using `keyBetween(last, null)` chaining
  - generate random titles (5–50 chars, alnum + spaces, non-empty after trim)
  - random priority from `cardPriorityValues`
  - insert batched rows into `cards`
- touch board once at end
- return `{ createdCount: count }`

- [ ] **Step 2: Run unit/integration tests (if present)**

Run: `npm test`
Expected: PASS

---

### Task 3: Client modal + button in board settings

**Files:**

- Modify: `src/features/boards/BoardDetailScreen.tsx`

- [ ] **Step 1: Add “Add sample data” button next to “Delete board”**

Use `XStack` row with both buttons; keep delete behavior unchanged.

- [ ] **Step 2: Add `PrettyModalWrap` modal**

Modal includes:

- label: “How many cards?”
- numeric field (string in RHF) with validation (required, integer, 1..2000)
- submit button calls `trpc.board.addSampleData.mutateAsync({ boardId, count })`
- pending UI (“Adding…”)
- on success: close modal, refresh board, announce “Sample cards added.”

- [ ] **Step 3: Run formatting**

Run: `npx prettier --write src/features/boards/BoardDetailScreen.tsx src/server/trpc/routers/board.ts src/server/board/service.ts src/server/card/repo.ts`
Expected: files formatted

---

### Task 4: Manual verification

- [ ] **Step 1: Run dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify UI flow**

On a board with multiple columns:

- open Board settings → click “Add sample data”
- enter 1, 10, 2000 (should work)
- enter 0 / 2001 / non-number (should show validation error)
- after submit: cards appear in multiple columns; titles random; priorities random; no descriptions/tags
