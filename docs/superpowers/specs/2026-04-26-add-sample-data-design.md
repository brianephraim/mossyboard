# Add sample data (random cards) — design

Date: 2026-04-26

## Goal

Add an **“Add sample data”** action next to the existing **“Delete board”** action in board settings. The action opens a modal asking **“How many cards”** and, on submit, calls a server endpoint that creates that many randomized cards on the current board, **randomly dispersed across the board’s existing columns**.

This is intended for quickly populating a board to test scrolling, pagination, virtualization, and general UI behavior.

## Non-goals

- No tags are created or attached.
- No descriptions are generated.
- No changes to columns or board metadata beyond normal “touch” behavior already used by card creation.
- No attempt to create “realistic” content; random strings are fine.
- No guarantee of stable randomness across runs.

## UX / UI design

### Placement

- Surface: Board settings modal in `src/features/boards/BoardDetailScreen.tsx`.
- Location: inside the destructive “Delete board” section.
- Layout: **“Add sample data”** appears **next to** the existing “Delete board” button (same horizontal row), not as a separate section.

### Trigger copy

- Button label: `Add sample data`

### Modal

Use `src/Modal/PrettyModalWrap.tsx` (focus trap, escape to close, etc.).

- Title: `Add sample data`
- Body prompt: `How many cards?`
- Field: numeric input for an integer count.
- Validation:
  - Required
  - Integer only
  - Min: 1
  - Max: 2000
- Footer actions:
  - Secondary: `Cancel` (closes modal)
  - Primary: `Add cards` (submits)
  - Pending label: `Adding…` (or `Adding...` if consistent with surrounding copy)
- Success behavior:
  - Close modal
  - Refresh board data (same pattern as existing mutations)
  - Announcement: `Sample cards added.`
- Failure behavior:
  - Keep modal open
  - Show a compact inline error message (use existing mutation error display patterns)

### Accessibility

- All actions keyboard reachable.
- Modal closes on Escape and restores focus to the invoking button (delegated to `PrettyModalWrap`).
- Input has a visible label (“How many cards?”) and validation messages are associated with the input.

## API design (server “special endpoint”)

### tRPC procedure

Add a protected mutation on the `board` router:

- Path: `board.addSampleData`
- Auth: `protectedProcedure`

Input (zod):

- `boardId: z.string().uuid()`
- `count: z.number().int().min(1).max(2000)`

Output:

- `{ createdCount: number }`

Error cases:

- Board not found or not owned → `NOT_FOUND` (existing behavior)
- Board has **no active columns** → `BAD_REQUEST` with message like `Board has no columns`

## Data generation rules

For each generated card:

- **Column**: randomly select one of the board’s existing active (non-deleted) columns.
- **Title**:
  - Length: random integer in \[5, 50\]
  - Characters: alphanumeric plus spaces
  - Trimmed before insert
  - Ensure the result is non-empty after trim (regenerate if needed)
- **Description**: empty string
- **Tags**: none
- **Priority**: randomly select from the existing `CardPriority` domain (e.g. `none | low | medium | high`)

### Card ordering / position

New cards should be appended to the end of their target column:

- Use the existing ordered-position helper (`resolveOrderedPosition`) with `defaultPlacement: "end"` where applicable.
- Avoid \(O(N^2)\) position resolution by:
  - Grouping the requested `count` into per-column batches.
  - For each column, compute an insertion chain so each inserted card gets a new position “after” the last known card position in that column.

### Transactionality and consistency

- The server operation runs in a transaction.
- Ownership checks are performed using existing “owned board/column” queries.
- The board is “touched” once per column batch or at the end (implementation may reuse existing `touchBoard` behavior in card creation; exact touch frequency is an implementation detail as long as it remains correct and safe).

## Client integration

### Mutation wiring

Expose the mutation via the existing `trpc` client and, if consistent with patterns, add it to the `useBoardMutations` return object so the settings UI can call it.

### Refresh behavior

On success, follow the same refresh/invalidation pattern used by other board/card mutations:

- Refetch the active board query
- Invalidate any board list queries if needed
- Clear any optimistic state/conflict banners already used by the board pane

## Testing strategy (high level)

- Unit test the service-level function that generates cards:
  - Rejects `count > 2000`
  - Rejects boards with zero active columns
  - Creates exactly `count` cards with expected invariants (empty description, no tags, priority in enum, title length bounds)
- Optional integration test via the router mutation (auth required) if existing test scaffolding makes it cheap.
