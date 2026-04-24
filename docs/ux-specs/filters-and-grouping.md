# Canonical UX Spec: Filters and Grouping

## 1. Overview

This document defines the Kanban UX slice for filtering cards by priority, regrouping the board by priority, and viewing matching cards in a paginated list mode.

This spec is the parent artifact for later wireframe, frontend, and backend briefs. Those derived briefs must not change the behavior defined here.

### Constraint summary

- Authentication, session-expiry handling, and verification enforcement remain defined by [`docs/ux-specs/auth-session-boundaries.md`](./auth-session-boundaries.md).
- The protected board shell and loaded board foundation remain defined by [`docs/ux-specs/board-shell-and-board-loading-states.md`](./board-shell-and-board-loading-states.md).
- Card create/edit behavior defines `priority` as the first concrete card attribute beyond title and description.
- Move and reorder behavior is defined separately and must not be changed by this slice.
- This slice uses the repo-approved frontend decisions:
  - prefer official Tamagui packages or primitives for filter and menu controls
  - do not add a non-Tamagui filter library
- Grouping should not require a separate server-shaped grouped-board procedure in this slice.

### Explicit non-goals for this slice

- Text search
- Saved views
- Multi-attribute filtering
- Server-shaped grouped board responses
- Column creation or board settings

## 2. Slice Goal

Enable a user to narrow visible work by priority, reorganize the board by priority when desired, and inspect matching cards in a paginated list view without inventing filter state, grouping semantics, or pagination behavior.

## 3. Users and Jobs to Be Done

### Primary actors

1. User focusing on high-priority work
2. User scanning the board by priority rather than by workflow column
3. User browsing a paginated list of matching cards

### Jobs to be done

- "Let me narrow the board to the priorities I care about."
- "Let me regroup the board by priority when that's more useful than workflow columns."
- "Let me switch to a list of matching cards when I want to browse results linearly."

## 4. In-Scope Tasks

- Open board filter controls
- Filter by one or more priority values
- Clear all active filters
- Group the board by `Column` or `Priority`
- Switch between board view and matching-cards list view
- Paginate through matching cards in list view
- Recover from filtered-list read failures

## 5. Out-of-Scope Tasks

- Text search
- Saved filter presets
- Grouping by any attribute other than `priority`
- Server-driven grouped board responses
- Cross-board filtering

## 6. Assumptions and Dependencies

- This slice applies only to `/boards/$boardId`.
- `priority` is the first and only filterable and groupable attribute in this slice.
- Allowed priority values are:
  - `none`
  - `low`
  - `medium`
  - `high`
- Route state includes:
  - `view=board | list`
  - `groupBy=column | priority`
  - zero or more selected priority filters
- Default state is:
  - `view=board`
  - `groupBy=column`
  - no priority filters applied
- In board view, grouping by `column` uses the existing board structure from `board.getWithColumnsAndCards`.
- In board view, grouping by `priority` reorganizes the visible board into four priority groups:
  - `No priority`
  - `Low`
  - `Medium`
  - `High`
- In priority-grouped board view, each group preserves card order by original board column order first, then card position within that column.
- In list view, grouping controls are hidden because list mode is a flat results list.
- Filters persist when switching between board and list views.
- Grouping choice persists when switching away from and back to board view.
- Paginated list view uses cursor-based pagination and appends additional pages with `Load more`.

## 7. Data-Scale Assumptions and Limits

- Board view may use currently loaded board data for client-side filter and group transformations in this slice
- List view loads matching cards 50 at a time by default
- List view maximum page size in this slice is 100 cards
- Filter state supports selecting any subset of the four priority values

## 8. Workflow Definitions

### Flow 1: Filter the board by priority

- Trigger: User opens filter controls and selects one or more priority values.
- User intent: Narrow the visible board to cards matching chosen priorities.
- Preconditions: Board is loaded.
- Steps:
  1. The user opens filter controls.
  2. The user selects one or more priority values.
  3. The board updates to show only matching cards in the current view mode.
  4. Active filter indicators appear.
- System responses:
  - No board route reload is required.
  - Empty columns or empty priority groups remain visible if they are part of the current grouped structure but contain no matching cards.
- Failure cases:
  - none for local filter-state changes
- Postconditions:
  - Success: visible board or list reflects the selected priorities

### Flow 2: Clear filters

- Trigger: User activates `Clear filters`.
- User intent: Return to the unfiltered board or list.
- Preconditions: At least one priority filter is active.
- Steps:
  1. The user activates `Clear filters`.
  2. All selected priorities are cleared.
  3. The current view mode refreshes to the unfiltered state.
- System responses:
  - Grouping choice remains unchanged if the user stays in board view.
- Failure cases:
  - none
- Postconditions:
  - Success: no priority filters remain active

### Flow 3: Group the board by priority

- Trigger: User changes `Group by` from `Column` to `Priority` while in board view.
- User intent: Reorganize the board around priority categories.
- Preconditions: Board is loaded and current `view=board`.
- Steps:
  1. The user chooses `Priority` in the grouping control.
  2. The board reorganizes into the four priority groups.
  3. Matching cards appear in their priority groups, preserving stable intra-group order.
- System responses:
  - Each visible card still shows its original column context as supporting metadata because the board is no longer grouped by workflow stage.
  - Empty priority groups remain visible when no filters hide them.
- Failure cases:
  - none for client-side regrouping
- Postconditions:
  - Success: grouped board view reflects `priority` grouping

### Flow 4: Return to board-by-column grouping

- Trigger: User changes `Group by` from `Priority` to `Column`.
- User intent: Return to the normal workflow layout.
- Preconditions: Board is loaded and current `view=board`.
- Steps:
  1. The user chooses `Column`.
  2. The board returns to the normal column-based layout.
  3. Active filters, if any, remain applied.
- System responses:
  - Board scroll context may reset because the board structure changed.
- Failure cases:
  - none
- Postconditions:
  - Success: board is grouped by workflow columns again

### Flow 5: Switch to matching-cards list view

- Trigger: User activates `List view`.
- User intent: Browse matching cards linearly instead of in grouped board columns.
- Preconditions: Board route is loaded.
- Steps:
  1. The user activates `List view`.
  2. The route updates to `view=list`.
  3. A matching-cards query starts with the current board id and active filters.
  4. The list view shows loading, loaded, empty, or error states as needed.
- System responses:
  - Active filters remain applied.
  - Grouping controls are hidden while in list view.
- Failure cases:
  - Matching-cards read fails transiently.
- Postconditions:
  - Success: matching cards list is visible
  - Failure: retryable list error is visible

### Flow 6: Paginate matching cards list

- Trigger: User activates `Load more` in list view.
- User intent: Continue browsing matching cards.
- Preconditions: List view has loaded one page and `nextCursor` exists.
- Steps:
  1. The user activates `Load more`.
  2. The next page request begins.
  3. On success, the next page appends to the end of the existing list.
- System responses:
  - Existing loaded rows remain visible while the next page is loading.
  - `Load more` is disabled while the next page is pending.
- Failure cases:
  - Next-page read fails
- Postconditions:
  - Success: additional matching cards are appended
  - Failure: already loaded rows remain visible with retry for the next page

### Flow 7: Recover from filtered-list read failure

- Trigger: Initial list read or next-page read fails.
- User intent: Retry loading matching cards without losing already loaded results when possible.
- Preconditions: Current `view=list`.
- Steps:
  1. The list error state or inline next-page error appears.
  2. The user activates `Retry`.
  3. The matching-cards request reruns.
- System responses:
  - Initial-load failure shows a full list-surface error state.
  - Next-page failure preserves existing rows and shows an inline retry state near the list footer.
- Failure cases:
  - Repeated server or network failure
- Postconditions:
  - Success: list data is visible
  - Failure: retryable error remains visible

## 9. Screen and State Inventory

| Surface                  | Route / placement             | Required states                                                           |
| ------------------------ | ----------------------------- | ------------------------------------------------------------------------- |
| Filter controls          | board toolbar                 | closed, open, selections applied                                          |
| Grouping control         | board toolbar, board view     | `Column`, `Priority`                                                      |
| Board view               | `/boards/$boardId?view=board` | grouped by column, grouped by priority, filtered empty groups, no matches |
| Matching cards list view | `/boards/$boardId?view=list`  | loading, loaded, empty, initial error, next-page loading, next-page error |
| Active-filter summary    | board toolbar                 | none, one or more filters active                                          |

## 10. Detailed Surface Specs

### Surface A: Filter controls

#### Purpose

Let the user narrow cards by priority without leaving the board route.

#### Exact copy

- Filter trigger: `Filters`
- Section label: `Priority`
- Option label: `No priority`
- Option label: `Low`
- Option label: `Medium`
- Option label: `High`
- Clear action: `Clear filters`

#### Interaction rules

- Multiple priorities may be selected at once.
- If all priorities are deselected manually, the result is equivalent to no filters.

### Surface B: Grouping and view controls

#### Purpose

Let the user choose whether the route shows a board canvas or a linear results list, and how the board canvas is grouped.

#### Exact copy

- View control option: `Board view`
- View control option: `List view`
- Grouping label: `Group by`
- Grouping option: `Column`
- Grouping option: `Priority`

### Surface C: Matching cards list

#### Purpose

Provide a linear, paginated view of cards matching the current board and filters.

#### Exact copy

- Loading state: `Loading matching cards...`
- Empty title: `No cards match these filters.`
- Empty body: `Try changing or clearing your filters.`
- Error title: `We couldn't load matching cards.`
- Error body: `Try again.`
- Retry action: `Retry`
- Pagination action: `Load more`
- Next-page error: `We couldn't load more cards. Try again.`

#### Row data shown

- Card title
- Card description preview
- Current column title
- Current priority label

## 11. Cross-Screen Interaction Rules

### Filter persistence

- Active priority filters persist across view switches.
- Active priority filters persist across grouping changes.

### Grouping rules

- Grouping affects board view only.
- List view is always flat and sorted by `updatedAt` descending, then `cardId` descending for cursor stability.
- In priority-grouped board view, cards keep visible original column context because workflow grouping is no longer the primary structure.

### Pagination rules

- `Load more` appends, never replaces, already loaded list rows.
- Changing filters or leaving list view resets the current list pagination state.

### Announcement rules

- Filters applied: `Filters updated.`
- Grouping changed: `Board grouping updated.`
- List page loaded: `More cards loaded.`

## 12. Undo and Redo Rules

- No action in this slice has a dedicated undo control.

## 13. Microcopy, Tone, and Announcement Strings

| Usage             | Key-like label           | Exact string                             |
| ----------------- | ------------------------ | ---------------------------------------- |
| Filter trigger    | `board.filters.trigger`  | `Filters`                                |
| Clear filters     | `board.filters.clear`    | `Clear filters`                          |
| View board        | `board.view.board`       | `Board view`                             |
| View list         | `board.view.list`        | `List view`                              |
| Grouping label    | `board.groupBy.label`    | `Group by`                               |
| Group by column   | `board.groupBy.column`   | `Column`                                 |
| Group by priority | `board.groupBy.priority` | `Priority`                               |
| List loading      | `board.list.loading`     | `Loading matching cards...`              |
| List empty title  | `board.list.empty.title` | `No cards match these filters.`          |
| List empty body   | `board.list.empty.body`  | `Try changing or clearing your filters.` |
| List error title  | `board.list.error.title` | `We couldn't load matching cards.`       |
| List error body   | `board.list.error.body`  | `Try again.`                             |
| List load more    | `board.list.loadMore`    | `Load more`                              |

## 14. Data Visible to the User

- Active priority filters
- Current grouping choice
- Current view choice
- Matching cards in board or list form
- Current column title and priority for each list row

## 15. Validation and Error Handling

### Backend-dependent errors that must map cleanly

- matching-cards list read failure
- next-page read failure
- auth/session failure delegated to the auth/session slice

## 16. Accessibility Requirements

- Filter controls are keyboard-operable and expose selected state semantically.
- Grouping and view controls are keyboard-operable and expose current selection semantically.
- Empty, error, and loading states do not rely on color alone.
- List pagination and filter changes announce meaningful updates through a polite live region.

## 17. Responsive Behavior

- Filter controls may collapse into a compact menu or sheet on narrow screens.
- Board view and list view remain separate route states on every viewport.
- List rows stack metadata vertically on narrow screens rather than truncating all context into one line.

## 18. Open Questions

1. Should future board filtering add text search, or remain attribute-only for a long time?
2. Should future grouped board views support collapsing empty priority groups?

## 19. Acceptance Criteria

- A user can filter the board by one or more priority values.
- A user can group the board by `Column` or `Priority`.
- A user can switch to a matching-cards list view that respects the current filters.
- Matching-cards list view paginates with `Load more`.
- Filter changes, grouping changes, and list pagination have explicit loading, empty, and error behavior.
- No server-shaped grouped-board response is required in this slice.
