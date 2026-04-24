# Canonical UX Spec: Card Detail Panel or Modal

## 1. Overview

This document defines the Kanban UX slice for opening a card from a loaded board, viewing its detail surface, recovering from card-detail load failures, and managing the first in-scope detail feature: subtasks.

This spec is the parent artifact for later wireframe, frontend, and backend briefs. Those derived briefs must not change the behavior defined here.

### Constraint summary

- Authentication, session-expiry handling, and verification enforcement remain defined by [`docs/ux-specs/auth-session-boundaries.md`](./auth-session-boundaries.md).
- The protected board shell and board-loading states remain defined by [`docs/ux-specs/board-shell-and-board-loading-states.md`](./board-shell-and-board-loading-states.md).
- Card title, description, priority, delete-confirmation, and dirty-save behavior remain defined by [`docs/ux-specs/card-create-and-edit-flows.md`](./card-create-and-edit-flows.md).
- This slice uses the same approved frontend foundations already chosen for earlier slices:
  - `react-hook-form` for the card field form region
  - `PrettyModalWrap` for blocking dialogs and the mobile full-screen detail presentation
- `subtasks` are the first concrete card-detail feature in scope.
- Drag-and-drop, filters, grouping, comments, tags, attachments, and collaborator features remain out of scope here.

### Explicit non-goals for this slice

- Card move between columns
- Card reorder within a column
- Column creation, rename, reorder, or delete
- Comments, tags, attachments, or activity history
- Subtask reorder
- Due dates, estimates, or assignees
- Multi-card compare or split-view detail UI

## 2. Slice Goal

Enable a user to open a card in context, understand its current details, and manage a lightweight subtask checklist without losing board orientation or inventing panel, modal, routing, or recovery behavior.

## 3. Users and Jobs to Be Done

### Primary actors

1. User opening a card to review or refine work already on the board
2. User checking progress inside a card before deciding what to do next
3. User breaking a card into smaller checklist-style subtasks

### Jobs to be done

- "Let me open a card without losing track of where I am on the board."
- "Let me deep-link back to the same card when I return."
- "Let me manage a simple checklist inside the card details."
- "If the card can't be loaded, tell me clearly and let me recover."

## 4. In-Scope Tasks

- Open card details from a card tile on a loaded board
- Open card details from a board route that already includes a selected card in URL state
- View card-detail loading, loaded, retryable-error, and not-available states
- Close the detail surface and return to the board context
- Switch from one clean card to another on desktop without closing the detail surface first
- View the card field form region inside the detail surface
- View current subtask progress and ordered subtask rows
- Add a subtask
- Rename a subtask
- Toggle a subtask complete or incomplete
- Delete a subtask
- Recover from subtask validation failures, request failures, and version conflicts

## 5. Out-of-Scope Tasks

- Defining the editable card-field rules themselves beyond surface placement and coordination
- Card create, move, reorder, or delete semantics beyond what the sibling slice already defines
- Column-level editing behavior
- Filters and grouping by priority
- Comments, tags, attachments, or activity feed UI
- Subtask reorder
- Bulk-complete or clear-completed subtask actions

## 6. Assumptions and Dependencies

- The card detail surface exists only on the board-detail route pattern `/boards/$boardId`.
- URL state uses a `card` search param to represent the selected card id.
- Activating a card tile updates the `card` search param.
- Clearing the `card` search param closes the detail surface without changing the current `boardId`.
- On viewports `1024 px` and wider, card details render as a right-side panel anchored to the board route.
- On viewports narrower than `1024 px`, card details render as a full-screen modal over the same board route.
- On desktop, the detail panel is non-modal. The board remains visible and can still be the source of another card selection.
- On mobile, the detail surface is modal and the background board is inaccessible until the detail surface closes.
- When the user attempts to close the detail surface or switch to another card while unsaved card-field changes exist, the discard-changes dialog defined in [`docs/ux-specs/card-create-and-edit-flows.md`](./card-create-and-edit-flows.md) is used.
- Subtask composers and subtask title row editors also use that same discard-changes dialog if closing or card-switching would otherwise discard unsaved text.
- The core card field form remains defined by the sibling card-create-and-edit slice. This document defines where that form sits and how the detail surface coordinates around it.
- Subtasks render in stored order and do not auto-sort completed items to the bottom.
- New subtasks insert at the end of the current subtask list.
- There is no subtask reorder control in this slice.
- Board scroll position and horizontal column position are preserved when the detail surface opens and closes.
- Only one detail surface can be open per board route, one subtask create composer can be open per card, and one subtask row can be in title-edit mode per card.

## 7. Data-Scale Assumptions and Limits

- Card detail route state supports one selected `card` id at a time.
- A card detail view supports up to 100 visible subtasks without pagination or virtualization in this slice.
- Subtask title: minimum 1 non-whitespace character after trimming, maximum 200 characters
- One card-detail read request may be in flight per selected card surface.
- One subtask create request may be in flight per card.
- One subtask mutation may be in flight per subtask row.
- The detail loading skeleton renders at most 6 placeholder subtask rows regardless of actual list size.

## 8. Workflow Definitions

### Flow 1: Open card details from a loaded board

- Trigger: User activates a card tile on `/boards/$boardId`.
- User intent: View more detail without leaving the board route.
- Preconditions: Board route is already loaded and the activated card belongs to that board.
- Steps:
  1. The app updates the `card` search param.
  2. The detail surface opens immediately in a loading state.
  3. A card-detail read starts for the selected card id.
  4. If the read succeeds, the loaded detail surface replaces the skeleton.
- System responses:
  - On desktop, the side panel appears at the right edge while the board remains visible.
  - On mobile, a full-screen modal opens over the board route.
  - Initial focus moves to the detail-surface heading when the surface opens.
- Failure cases:
  - Card-detail read fails transiently.
  - Card is no longer available for this board or user.
- Postconditions:
  - Success: loaded card detail surface is visible
  - Failure: retryable error state or neutral not-available state is visible

### Flow 2: Open card details from a direct link or refreshed route

- Trigger: User lands on `/boards/$boardId?card=$cardId` directly, reloads the page, or returns through browser history.
- User intent: Reach the same board and selected card detail state.
- Preconditions: User can access the board route.
- Steps:
  1. The board route loads by the board-shell rules.
  2. Once the board route is active, the detail surface opens for the `card` search param.
  3. The card-detail read begins and renders loading, success, retryable-error, or not-available states as needed.
- System responses:
  - No separate "open card" gesture is required after route restoration.
  - If there is no remembered invoking card tile in the current DOM, focus still lands on the detail heading.
- Failure cases:
  - Invalid or stale card id in URL state
  - Card no longer belongs to the current visible board
- Postconditions:
  - Success: selected card detail is visible
  - Failure: neutral not-available or retryable error state is visible

### Flow 3: Close the detail surface

- Trigger: User activates `Close details`, uses browser back to leave the selected-card state, or presses `Escape` from within the surface when no blocking dialog is open.
- User intent: Return to the board without the detail surface open.
- Preconditions: Card detail surface is currently open.
- Steps:
  1. The app checks whether unsaved card or subtask text changes would be lost.
  2. If no unsaved text changes exist, the `card` search param is cleared and the surface closes.
  3. If unsaved text changes exist, the discard-changes dialog opens and the requested close completes only if the user confirms discard.
- System responses:
  - Closing the surface preserves board scroll context.
  - Focus returns to the invoking card tile when it still exists and is still mounted.
  - If there is no valid invoking tile, focus returns to the board title or first logical board heading.
- Failure cases:
  - none
- Postconditions:
  - Success: board route remains visible with no detail surface open
  - Cancel discard: detail surface remains open

### Flow 4: Switch from one card to another on desktop

- Trigger: User activates a different card tile while the desktop side panel is already open.
- User intent: Inspect another card without losing board context.
- Preconditions: Viewport is `1024 px` or wider and the current board route is still loaded.
- Steps:
  1. The user activates a different card tile.
  2. If the current detail surface has no unsaved text changes, the `card` search param updates immediately and the panel loads the new card.
  3. If unsaved text changes exist, the discard-changes dialog opens before the panel switches cards.
- System responses:
  - The side panel stays open and reuses the same container shell rather than closing and reopening.
  - Focus moves to the new card-detail heading after the switch completes.
- Failure cases:
  - Target card is not available
  - Target card fails to load transiently
- Postconditions:
  - Success: new card detail visible in the same panel shell
  - Failure: retryable error or neutral not-available state visible inside the panel shell

### Flow 5: Recover from card-detail load failure

- Trigger: Card-detail read fails before usable card detail is available.
- User intent: Retry loading the selected card or leave the detail surface.
- Preconditions: Detail surface is open for a selected card id.
- Steps:
  1. The error state renders inside the detail surface.
  2. The user activates `Retry` to attempt the same card again or `Close details` to leave the surface.
  3. On retry, the surface returns to the loading state.
  4. If the retry succeeds, the loaded card detail appears.
- System responses:
  - The surrounding desktop panel or mobile modal shell remains stable during retry.
  - Retry failure keeps the same error state visible.
- Failure cases:
  - Repeat server or network failure
- Postconditions:
  - Success: loaded card detail visible
  - Failure: error state remains visible or detail surface closes

### Flow 6: Recover from card not available

- Trigger: Card-detail read resolves as not found, soft-deleted, not owned by the caller, or outside the current board route.
- User intent: Understand what happened without seeing raw backend detail.
- Preconditions: Detail surface is open for a selected card id.
- Steps:
  1. The neutral not-available state renders inside the detail surface.
  2. The user activates `Close details`.
  3. The `card` search param clears and the user returns to the board.
- System responses:
  - The copy does not reveal whether the card was deleted, inaccessible, or never belonged to the board.
- Failure cases:
  - none
- Postconditions:
  - Success: detail surface closes and board remains visible

### Flow 7: Add a subtask

- Trigger: User activates `Add subtask` from the empty state or subtask section footer.
- User intent: Break the card into a smaller actionable item.
- Preconditions: Loaded card detail is visible.
- Steps:
  1. The subtask composer opens at the end of the current subtask list.
  2. The user enters a subtask title.
  3. The user activates `Add subtask`.
  4. The composer enters a submitting state.
  5. On success, the composer closes and the new subtask row appears at the bottom of the list.
- System responses:
  - If another subtask row is currently in edit mode, it must be resolved before the composer opens.
  - Focus moves to the new subtask row checkbox after success.
- Failure cases:
  - Empty title
  - Overlong title
  - Network or server failure
- Postconditions:
  - Success: new subtask exists at the end of the list
  - Failure: composer remains open with entered title preserved

### Flow 8: Edit a subtask title

- Trigger: User activates `Edit subtask` for an existing subtask row.
- User intent: Rename the subtask without leaving the detail surface.
- Preconditions: Loaded card detail is visible and the target subtask exists.
- Steps:
  1. The target row enters title-edit mode.
  2. The user changes the title.
  3. The user activates `Save subtask`.
  4. The row enters a saving state.
  5. On success, the row returns to read mode with the updated title.
- System responses:
  - `Save subtask` is disabled until the row is dirty and valid.
  - `Cancel` exits title-edit mode and restores the last saved title.
- Failure cases:
  - Empty title after trim
  - Overlong title
  - Network or server failure
  - Version conflict
- Postconditions:
  - Success: saved title visible in the row
  - Failure: edit mode remains visible until the user retries, reloads latest, or cancels

### Flow 9: Toggle a subtask complete or incomplete

- Trigger: User toggles the subtask checkbox.
- User intent: Mark checklist progress quickly.
- Preconditions: Loaded card detail is visible and the target subtask exists.
- Steps:
  1. The user activates the checkbox.
  2. The row enters a pending state.
  3. On success, the checkbox and progress summary update.
- System responses:
  - The row's interactive controls are temporarily disabled while the toggle request is pending.
  - The live region announces either `Subtask completed.` or `Subtask marked incomplete.`
- Failure cases:
  - Network or server failure
  - Version conflict
- Postconditions:
  - Success: new completion state visible
  - Failure: prior checkbox state is restored and row-level error is shown

### Flow 10: Delete a subtask

- Trigger: User activates `Delete subtask` for an existing row.
- User intent: Remove a checklist item that is no longer needed.
- Preconditions: Loaded card detail is visible and the target subtask exists.
- Steps:
  1. The row enters a delete-pending state.
  2. On success, the row disappears from the subtask list.
- System responses:
  - Subtask deletion does not use a confirmation dialog in this slice.
  - Focus moves to the next visible subtask row if one exists, otherwise to the previous row, otherwise to `Add subtask`.
- Failure cases:
  - Network or server failure
  - Version conflict
- Postconditions:
  - Success: subtask is removed from normal detail reads
  - Failure: row remains visible with retry-capable error

## 9. Screen and State Inventory

| Surface                        | Route / placement                        | Required states                                                                    |
| ------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Desktop card detail panel      | `/boards/$boardId?card=$cardId`, desktop | loading, loaded, retryable error, not available, refresh in progress               |
| Mobile card detail modal       | `/boards/$boardId?card=$cardId`, mobile  | loading, loaded, retryable error, not available, refresh in progress               |
| Card field form region         | top of loaded detail surface             | delegated to sibling slice: pristine, dirty, saving, saved, validation, conflict   |
| Subtasks section               | lower region of loaded detail surface    | empty, populated, create open, row edit open, row pending, row error, row conflict |
| Unsaved-changes discard dialog | blocking dialog over detail surface      | delegated to sibling slice                                                         |
| Card detail live region        | inside detail surface while open         | idle, load success, load failure, subtask success, subtask failure                 |

## 10. Detailed Surface Specs

### Surface A: Card detail shell

#### Purpose

Provide a single route-driven place to inspect one card in greater detail without leaving the current board route.

#### Entry conditions

- The current route is `/boards/$boardId`.
- A `card` search param is present.

#### Structure

- Surface heading: `Card details`
- Close action in the top-right or top-leading position depending on responsive layout
- Read-only card context row:
  - label: `Column`
  - value: current column title
- Card field form region from the sibling create-and-edit slice
- Subtasks section below the card field form region

#### Exact copy

- Close action label: `Close details`
- Loading status: `Loading card...`
- Retryable error title: `We couldn't load this card.`
- Retryable error body: `Try again or close details.`
- Not-available title: `This card isn't available anymore.`
- Not-available body: `It may have been removed or you may no longer have access.`
- Retry action: `Retry`

#### Desktop behavior

- The surface appears as a right-side panel that leaves the board visible.
- The board remains usable as the source of another card selection.
- The panel keeps its shell mounted while retrying or switching cards.

#### Mobile behavior

- The surface appears as a full-screen modal over the board route.
- The modal traps focus until it closes.
- The close action remains persistently visible at the top of the modal.

#### Keyboard behavior

- Initial focus lands on the `Card details` heading when the surface opens.
- `Escape` closes the surface when no blocking dialog is open and no unsaved-change interception is required.
- Browser back closes the selected-card state when it corresponds to the active history entry.

### Surface B: Subtasks section

#### Purpose

Let the user manage a lightweight checklist inside the card detail surface.

#### Section structure

- Section heading: `Subtasks`
- Progress summary when one or more subtasks exist:
  - pattern: `{{doneCount}} of {{totalCount}} completed`
- Empty state:
  - body: `No subtasks yet.`
  - action: `Add subtask`
- Composer footer action when rows already exist:
  - `Add subtask`

#### Composer copy

- Field label: `Subtask title`
- Placeholder: `What needs to be done?`
- Primary action: `Add subtask`
- Secondary action: `Cancel`
- Pending label: `Adding...`

#### Row action copy

- Edit action: `Edit subtask`
- Save action: `Save subtask`
- Cancel action: `Cancel`
- Delete action: `Delete subtask`
- Pending save label: `Saving...`
- Pending delete label: `Removing...`

#### Validation copy

- Empty after trim: `Enter a subtask title.`
- Too long: `Subtask title must be 200 characters or fewer.`

#### Error copy

- Generic mutation failure: `We couldn't update the subtask. Try again.`
- Delete failure: `We couldn't delete the subtask. Try again.`
- Conflict: `This subtask changed elsewhere. Reload the latest version and try again.`
- Conflict recovery action: `Reload latest`

#### Presentation rules

- Completed rows remain in their stored order.
- Completed rows use a non-color-only completed treatment, such as checked state plus text decoration.
- Subtask rows do not collapse automatically after completion.

#### Keyboard behavior

- `Enter` submits the create composer or row title editor when valid.
- `Escape` cancels the active subtask composer or row title editor when no request is pending.
- Checkbox, edit, and delete controls remain reachable by keyboard in row order.

## 11. Cross-Screen Interaction Rules

### Routing and history

- The `card` search param is the source of truth for which card detail surface is open.
- Opening a card should create a history state that browser back can close or step through naturally.
- Closing detail clears the `card` search param only; it does not navigate away from the current board.

### Dirty-state coordination

- The card field form region uses the explicit-save and discard rules already defined in the sibling card-create-and-edit slice.
- Unsaved subtask create or title-edit text uses the same discard-changes dialog before close or desktop card-switch.
- Dirty local edits must never be overwritten silently by background refresh.

### Refresh behavior

- Once a card has loaded, background refetch does not replace the detail surface with the full initial skeleton.
- A non-blocking refresh status may appear while stale content remains visible.
- If a background refresh fails, the last successfully loaded card detail remains visible and a retry-capable inline refresh error appears.

### Subtask ordering

- New subtasks append to the end of the current ordered list.
- Completed state does not change row order.
- No row drag handle, move button, or reorder affordance appears in this slice.

### Announcement rules

- Card detail load success: `Card details loaded.`
- Card detail load failure: `Card details failed to load.`
- Subtask create success: `Subtask added.`
- Subtask update success: `Subtask updated.`
- Subtask toggle success, complete: `Subtask completed.`
- Subtask toggle success, incomplete: `Subtask marked incomplete.`
- Subtask delete success: `Subtask deleted.`

## 12. Undo and Redo Rules

- No action in this slice has a dedicated undo control.
- Users may manually reverse a subtask toggle by toggling it again after the first request completes.

## 13. Microcopy, Tone, and Announcement Strings

| Usage                    | Key-like label                           | Exact string                                                               |
| ------------------------ | ---------------------------------------- | -------------------------------------------------------------------------- |
| Surface heading          | `card.detail.heading`                    | `Card details`                                                             |
| Close action             | `card.detail.close`                      | `Close details`                                                            |
| Loading status           | `card.detail.loading`                    | `Loading card...`                                                          |
| Load error title         | `card.detail.error.title`                | `We couldn't load this card.`                                              |
| Load error body          | `card.detail.error.body`                 | `Try again or close details.`                                              |
| Not-available title      | `card.detail.unavailable.title`          | `This card isn't available anymore.`                                       |
| Not-available body       | `card.detail.unavailable.body`           | `It may have been removed or you may no longer have access.`               |
| Column label             | `card.detail.column.label`               | `Column`                                                                   |
| Subtasks heading         | `card.detail.subtasks.heading`           | `Subtasks`                                                                 |
| Subtasks empty           | `card.detail.subtasks.empty`             | `No subtasks yet.`                                                         |
| Subtasks progress        | `card.detail.subtasks.progress`          | `{{doneCount}} of {{totalCount}} completed`                                |
| Add-subtask trigger      | `card.detail.subtasks.add.trigger`       | `Add subtask`                                                              |
| Subtask field label      | `card.detail.subtasks.field.label`       | `Subtask title`                                                            |
| Subtask placeholder      | `card.detail.subtasks.field.placeholder` | `What needs to be done?`                                                   |
| Subtask create pending   | `card.detail.subtasks.create.pending`    | `Adding...`                                                                |
| Subtask create success   | `card.detail.subtasks.create.success`    | `Subtask added.`                                                           |
| Subtask save pending     | `card.detail.subtasks.save.pending`      | `Saving...`                                                                |
| Subtask save success     | `card.detail.subtasks.save.success`      | `Subtask updated.`                                                         |
| Subtask toggle success   | `card.detail.subtasks.toggle.done`       | `Subtask completed.`                                                       |
| Subtask untoggle success | `card.detail.subtasks.toggle.undone`     | `Subtask marked incomplete.`                                               |
| Subtask delete pending   | `card.detail.subtasks.delete.pending`    | `Removing...`                                                              |
| Subtask delete success   | `card.detail.subtasks.delete.success`    | `Subtask deleted.`                                                         |
| Subtask conflict         | `card.detail.subtasks.conflict`          | `This subtask changed elsewhere. Reload the latest version and try again.` |

## 14. Data Visible to the User

- Card title, description, and priority through the sibling field form
- Current column title
- Ordered subtask titles
- Per-subtask completion state
- Subtask progress summary
- Whether the detail surface is loading, unavailable, stale, or has row-level mutation errors

## 15. Validation and Error Handling

### Client-side validation rules

- Subtask title is trimmed before validation and submission.
- Empty after trim is invalid.
- Subtask title over 200 characters is invalid.

### Backend-dependent errors that must map cleanly

- card-detail read failure
- card not found, deleted, inaccessible, or outside the current board
- subtask create failure
- subtask update failure
- subtask toggle failure
- subtask delete failure
- subtask version conflict on update, toggle, or delete
- auth/session failure delegated to the auth/session slice

## 16. Accessibility Requirements

- On desktop, the side panel is announced as a dedicated card-detail region with a visible heading and close control.
- On mobile, the full-screen detail surface is modal, traps focus, closes on `Escape`, and returns focus on close.
- Every card tile that opens details must provide an accessible name that identifies which card will open.
- Every subtask checkbox, edit action, and delete action must have an accessible name.
- The detail surface uses a dedicated polite live region for load and subtask outcomes.
- Completed, dirty, unavailable, and error states must not rely on color alone.
- The discard-changes dialog used from this surface must restore focus correctly after cancel.

## 17. Responsive Behavior

- Desktop renders a right-side detail panel while preserving the visible board canvas.
- Mobile renders a full-screen modal with a sticky top bar containing the close action.
- Subtask row actions may wrap or stack on narrow screens rather than forcing horizontal overflow.
- The card field form region and subtask section remain one vertical flow on mobile.

## 18. Open Questions

1. Should completed subtasks eventually move into a collapsible "Completed" subsection, or stay inline permanently?
2. When later detail features arrive, should comments or attachments appear as additional sections in this same surface, or as tabbed subsections?

## 19. Acceptance Criteria

- A user can open card details from a loaded board without leaving the current board route.
- The open card is represented in URL state so direct-link reload and browser history work predictably.
- Desktop uses a right-side panel and mobile uses a full-screen modal with defined close and focus-return behavior.
- Card-detail loading, retryable error, and not-available states are explicit and non-blank.
- A user can add, rename, toggle, and delete subtasks from the detail surface.
- Unsaved card or subtask text is not lost silently when the user closes the surface or switches cards on desktop.
- Completed subtasks remain visible in order and do not reorder automatically.
- No comments, tags, attachments, or subtask reorder controls are introduced in this slice.
