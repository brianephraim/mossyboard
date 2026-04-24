# Canonical UX Spec: Move and Reorder Behavior

## 1. Overview

This document defines the Kanban UX slice for reordering cards within a column, moving cards between columns, and reordering columns within a board.

This spec is the parent artifact for later wireframe, frontend, and backend briefs. Those derived briefs must not change the behavior defined here.

### Constraint summary

- Authentication, session-expiry handling, and verification enforcement remain defined by [`docs/ux-specs/auth-session-boundaries.md`](./auth-session-boundaries.md).
- The protected board shell and loaded board foundation remain defined by [`docs/ux-specs/board-shell-and-board-loading-states.md`](./board-shell-and-board-loading-states.md).
- Column creation and rename semantics remain defined by [`docs/ux-specs/column-structure-management.md`](./column-structure-management.md).
- Card create/edit behavior remains defined by [`docs/ux-specs/card-create-and-edit-flows.md`](./card-create-and-edit-flows.md).
- Card detail behavior remains defined by [`docs/ux-specs/card-detail-panel-or-modal.md`](./card-detail-panel-or-modal.md).
- The approved interaction libraries for this slice are:
  - `@hello-pangea/dnd` for drag and drop
  - `react-window` only if board scale later requires virtualization
- Every drag interaction must have a non-drag keyboard or explicit-action alternative.
- This slice defines ordering and movement semantics. Filters and grouping are defined separately.

### Explicit non-goals for this slice

- Column create, rename, or delete
- Card create, edit, delete, or subtask behavior
- Filter or group controls
- Multi-select or bulk move
- Undo history

## 2. Slice Goal

Enable a user to change the order of work on the board and move work between columns with clear success, failure, and conflict recovery behavior.

## 3. Users and Jobs to Be Done

### Primary actors

1. User reprioritizing work within one column
2. User advancing or returning work between columns
3. User reshaping the board's workflow by changing column order

### Jobs to be done

- "Let me move a card where it belongs."
- "Let me reorder cards quickly without breaking the board."
- "Let me reorder columns without guessing whether the change stuck."
- "If the board changed elsewhere, tell me clearly and let me recover."

## 4. In-Scope Tasks

- Reorder a card within its current column
- Move a card to a different column
- Reorder columns within the same board
- Use pointer drag-and-drop on pointer-capable layouts
- Use explicit non-drag controls for card and column movement
- Recover from reorder or move conflicts
- Keep the selected card detail surface coherent if the selected card is moved within the same board

## 5. Out-of-Scope Tasks

- Moving cards between boards
- Bulk move or bulk reorder
- Reordering subtasks
- Column delete or card restore
- Cross-board archive flows

## 6. Assumptions and Dependencies

- This slice applies only to a loaded `/boards/$boardId` route.
- Cards and columns already expose stored `position` and `version` fields through the backend.
- Pointer drag-and-drop is available on desktop and other pointer-friendly contexts.
- Explicit move actions are available for all users and are the guaranteed fallback on touch-first and keyboard-only flows.
- Card explicit move actions are:
  - `Move up`
  - `Move down`
  - `Move to column...`
- Column explicit move actions are:
  - `Move left`
  - `Move right`
- A move or reorder action updates only one card or one column at a time.
- While one move or reorder mutation is pending for a given item, repeated movement actions for that same item are disabled.
- Movement is optimistic in the UI, but conflicts or failures roll back to the last confirmed order.
- If the currently open card detail surface belongs to the moved card, the detail surface stays open and updates its column context after a successful same-board move.
- If a move or reorder conflicts with fresher board state, the board shows an inline reload-latest recovery prompt and the optimistic placement is rolled back.

## 7. Data-Scale Assumptions and Limits

- A board supports up to 500 visible cards in current loaded board data before virtualization becomes a separate implementation concern
- A move or reorder mutation may be in flight for multiple distinct items, but only one pending move per item is allowed
- Card and column conflict recovery is item-specific, but a shared board-level reload message may summarize the problem

## 8. Workflow Definitions

### Flow 1: Reorder a card within its current column using drag and drop

- Trigger: User drags a card and drops it between two cards in the same column.
- User intent: Change the card's position without changing its column.
- Preconditions: Board is loaded, drag is available in the current layout, and the target column is visible.
- Steps:
  1. The user begins dragging the card.
  2. The board shows valid drop targets in the current column.
  3. The user drops the card at the new position.
  4. The UI applies an optimistic reorder.
  5. The reorder mutation is sent.
  6. On success, the optimistic order becomes confirmed.
- System responses:
  - The live region announces the new position after success.
  - The moved card retains focus after drop completion.
- Failure cases:
  - Network or server failure
  - Version conflict
- Postconditions:
  - Success: card remains in the same column at the new position
  - Failure: card returns to its prior confirmed position and recovery UI appears

### Flow 2: Move a card to another column using drag and drop

- Trigger: User drags a card from one column and drops it into another.
- User intent: Advance or return work between workflow stages.
- Preconditions: Board is loaded and both source and target columns are visible.
- Steps:
  1. The user begins dragging the card.
  2. The board shows valid drop targets across visible columns.
  3. The user drops the card into the target column at a specific slot.
  4. The UI applies an optimistic move.
  5. The move mutation is sent.
  6. On success, the optimistic placement becomes confirmed.
- System responses:
  - The live region announces the destination column after success.
  - If the moved card is open in the detail surface, the detail surface stays open and updates its `Column` context row.
- Failure cases:
  - Network or server failure
  - Version conflict
- Postconditions:
  - Success: card is visible in the target column in the new position
  - Failure: card returns to its prior confirmed column and position

### Flow 3: Reorder a card using explicit non-drag controls

- Trigger: User activates `Move up`, `Move down`, or `Move to column...` from a card action menu or equivalent explicit control.
- User intent: Reorder or move a card without dragging.
- Preconditions: Board is loaded and the card is visible.
- Steps:
  1. The user chooses one of the explicit move actions.
  2. For `Move up` or `Move down`, the board computes the adjacent target slot in the current column.
  3. For `Move to column...`, the user chooses a destination column and, if needed, a target placement rule.
  4. The UI applies an optimistic move or reorder.
  5. The matching mutation is sent.
- System responses:
  - Explicit-action labels update or disable appropriately at boundaries:
    - `Move up` is disabled for the first card in a column
    - `Move down` is disabled for the last card in a column
- Failure cases:
  - Same as drag flows
- Postconditions:
  - Success: card is confirmed in the new position
  - Failure: optimistic placement rolls back and recovery UI appears

### Flow 4: Reorder columns using drag and drop

- Trigger: User drags a column header or column drag handle and drops it at a new board position.
- User intent: Change the workflow order of columns.
- Preconditions: Board is loaded and drag is available in the current layout.
- Steps:
  1. The user begins dragging the column.
  2. The board shows valid drop targets between columns.
  3. The user drops the column at the new position.
  4. The UI applies an optimistic reorder.
  5. The column reorder mutation is sent.
  6. On success, the new order is confirmed.
- System responses:
  - The board preserves horizontal scroll as much as possible.
  - The live region announces the new column position after success.
- Failure cases:
  - Network or server failure
  - Version conflict
- Postconditions:
  - Success: column is confirmed in its new position
  - Failure: column returns to its prior confirmed order

### Flow 5: Reorder columns using explicit non-drag controls

- Trigger: User activates `Move left` or `Move right` from a column header action menu.
- User intent: Reorder columns without dragging.
- Preconditions: Board is loaded and the target column is visible.
- Steps:
  1. The user activates `Move left` or `Move right`.
  2. The UI applies an optimistic reorder.
  3. The column reorder mutation is sent.
  4. On success, the order becomes confirmed.
- System responses:
  - `Move left` is disabled for the first column.
  - `Move right` is disabled for the last column.
- Failure cases:
  - Same as Flow 4
- Postconditions:
  - Success: column is confirmed in the new position
  - Failure: optimistic placement rolls back and recovery UI appears

### Flow 6: Recover from a move or reorder conflict

- Trigger: A card or column move/reorder mutation returns a version conflict.
- User intent: Understand that the board changed elsewhere and recover safely.
- Preconditions: The board attempted an optimistic move or reorder.
- Steps:
  1. The optimistic placement rolls back to the last confirmed order.
  2. An inline board-level conflict message appears.
  3. The user activates `Reload latest`.
  4. The board refetches and clears the conflict message after success.
- System responses:
  - The live region announces that board order changed elsewhere.
  - The conflict message identifies that the attempted move did not stick, but does not expose backend internals.
- Failure cases:
  - Reload failure
- Postconditions:
  - Success: board reflects latest confirmed ordering
  - Failure: conflict message remains with retry available

## 9. Screen and State Inventory

| Surface                      | Route / placement       | Required states                                                            |
| ---------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| Card drag interaction        | loaded board card       | idle, dragging, drop target visible, optimistic moved, rollback on failure |
| Card explicit move actions   | card action menu        | idle, boundary-disabled, pending, conflict rollback                        |
| Column drag interaction      | loaded board column     | idle, dragging, drop target visible, optimistic moved, rollback on failure |
| Column explicit move actions | column action menu      | idle, boundary-disabled, pending, conflict rollback                        |
| Board conflict message       | loaded board canvas top | hidden, move conflict, reload pending, reload failure                      |
| Board live region            | protected board shell   | idle, move success, reorder success, conflict, reload success              |

## 10. Detailed Surface Specs

### Surface A: Card movement affordances

#### Purpose

Let the user move or reorder one card without opening a separate editing surface.

#### Exact copy

- Explicit action: `Move up`
- Explicit action: `Move down`
- Explicit action: `Move to column...`

#### Success announcements

- Same-column reorder: `Card moved to a new position.`
- Cross-column move: `Card moved to {{columnTitle}}.`

#### Error copy

- Generic move failure: `We couldn't move the card. Try again.`
- Conflict: `Board order changed elsewhere. Reload the latest board and try again.`
- Conflict recovery action: `Reload latest`

### Surface B: Column movement affordances

#### Purpose

Let the user reorder columns without leaving the current board.

#### Exact copy

- Explicit action: `Move left`
- Explicit action: `Move right`

#### Success announcements

- `Column moved.`

#### Error copy

- Generic reorder failure: `We couldn't move the column. Try again.`
- Conflict: `Board order changed elsewhere. Reload the latest board and try again.`

### Surface C: Board conflict message

#### Purpose

Tell the user that an optimistic move or reorder did not stick because fresher board order won.

#### Exact copy

- Title: `Board order changed`
- Body: `Your last move didn't stick because the board changed elsewhere. Reload the latest board and try again.`
- Primary action: `Reload latest`

## 11. Cross-Screen Interaction Rules

### Optimistic behavior

- Card and column moves use optimistic UI.
- The UI must roll back immediately if the mutation fails or conflicts.
- Optimistic updates should not create duplicate cards or columns.

### Boundary rules

- `Move up` is unavailable for the first card in a column.
- `Move down` is unavailable for the last card in a column.
- `Move left` is unavailable for the first column.
- `Move right` is unavailable for the last column.

### Detail-surface coordination

- If the selected card is moved within the current board, the detail surface stays open.
- The detail surface updates its current column label after successful move confirmation.
- If the attempted move conflicts and rolls back, the detail surface remains on the original confirmed card state.

### Announcement rules

- Card reorder success: `Card moved to a new position.`
- Card cross-column move success: `Card moved to {{columnTitle}}.`
- Column reorder success: `Column moved.`
- Conflict: `Board order changed elsewhere.`

## 12. Undo and Redo Rules

- No action in this slice has a dedicated undo control.
- A user may reverse a successful move or reorder by issuing another move or reorder.

## 13. Microcopy, Tone, and Announcement Strings

| Usage                 | Key-like label                | Exact string                                                                                              |
| --------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| Card move up          | `card.move.up`                | `Move up`                                                                                                 |
| Card move down        | `card.move.down`              | `Move down`                                                                                               |
| Card move to column   | `card.move.toColumn`          | `Move to column...`                                                                                       |
| Card move success     | `card.move.success.same`      | `Card moved to a new position.`                                                                           |
| Column move left      | `column.move.left`            | `Move left`                                                                                               |
| Column move right     | `column.move.right`           | `Move right`                                                                                              |
| Column move success   | `column.move.success`         | `Column moved.`                                                                                           |
| Board conflict title  | `board.order.conflict.title`  | `Board order changed`                                                                                     |
| Board conflict body   | `board.order.conflict.body`   | `Your last move didn't stick because the board changed elsewhere. Reload the latest board and try again.` |
| Board conflict action | `board.order.conflict.reload` | `Reload latest`                                                                                           |

## 14. Data Visible to the User

- Card titles and visible card summaries in their new or previous positions
- Column titles and visible column order
- Whether an item is currently being moved or reordered
- Whether the last move conflicted and was rolled back

## 15. Validation and Error Handling

### Backend-dependent errors that must map cleanly

- card move failure
- card reorder failure
- column reorder failure
- version conflict on any move or reorder
- auth/session failure delegated to the auth/session slice

## 16. Accessibility Requirements

- Every drag interaction has an explicit non-drag alternative.
- Drag handles and explicit movement actions must have accessible names.
- Success and conflict states are announced through the board live region.
- Boundary-disabled actions must communicate disabled state semantically, not only visually.
- Drop-target affordances and dragged state must not rely on color alone.

## 17. Responsive Behavior

- Pointer drag is available where the implementation supports it well.
- Explicit movement actions remain available on all viewports and are the guaranteed fallback on touch-first and keyboard-only flows.
- Board conflict messaging must remain visible without covering the entire board on narrow screens.

## 18. Open Questions

1. Should future touch-first mobile interaction rely more on explicit move actions than drag gestures, even when drag is technically available?
2. Should later versions add a lightweight undo affordance for successful moves once toast infrastructure exists?

## 19. Acceptance Criteria

- A user can reorder a card within its current column.
- A user can move a card to another column.
- A user can reorder columns within the board.
- Every drag interaction has a non-drag fallback.
- Failed or conflicted moves roll back to the last confirmed order.
- Conflict recovery exposes one clear reload-latest path.
- Moving the selected card keeps the detail surface coherent within the same board.
